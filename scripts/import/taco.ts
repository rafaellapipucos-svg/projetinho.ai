import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { normalizeSearchText } from "../../src/lib/search";

/**
 * Importador da TACO 4ª edição (scripts/import/data/taco.json — ver FONTE.md).
 * Idempotente: upsert por (fonte, código na fonte); os nutrientes de cada
 * alimento são substituídos por completo e o cache de macros é atualizado
 * na MESMA transação (AGENTS.md — Átlas).
 */

/** Campo do JSON → key canônica do catálogo `nutrients`. */
const NUTRIENT_FIELD_MAP: Record<string, string> = {
  energy_kcal: "energy_kcal",
  energy_kj: "energy_kj",
  protein_g: "protein_g",
  lipid_g: "lipid_g",
  carbohydrate_g: "carbohydrate_g",
  fiber_g: "fiber_g",
  cholesterol_mg: "cholesterol_mg",
  saturated_g: "saturated_g",
  monounsaturated_g: "monounsaturated_g",
  polyunsaturated_g: "polyunsaturated_g",
  humidity_percents: "moisture_g",
  ashes_g: "ash_g",
  calcium_mg: "calcium_mg",
  magnesium_mg: "magnesium_mg",
  manganese_mg: "manganese_mg",
  phosphorus_mg: "phosphorus_mg",
  iron_mg: "iron_mg",
  sodium_mg: "sodium_mg",
  potassium_mg: "potassium_mg",
  copper_mg: "copper_mg",
  zinc_mg: "zinc_mg",
  retinol_mcg: "retinol_mcg",
  re_mcg: "re_mcg",
  rae_mcg: "rae_mcg",
  thiamine_mg: "thiamine_mg",
  riboflavin_mg: "riboflavin_mg",
  pyridoxine_mg: "pyridoxine_mg",
  niacin_mg: "niacin_mg",
  vitaminC_mg: "vitamin_c_mg",
};

interface TacoRow {
  id: number;
  description: string;
  category: string;
  [nutrientField: string]: unknown;
}

/** "Tr" (traços) → 0; "NA"/""/"*" → ausente; número → número. */
function parseValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === "Tr") return 0;
  return null;
}

const CHUNK_SIZE = 25;

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Defina DIRECT_URL (ou DATABASE_URL) para rodar o importador",
    );
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const rows = JSON.parse(
    readFileSync(join(here, "data", "taco.json"), "utf8"),
  ) as TacoRow[];

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 4 }),
  });

  try {
    const source = await prisma.foodSource.findUnique({
      where: { key: "taco" },
    });
    if (!source)
      throw new Error("Fonte 'taco' ausente — rode npm run db:seed antes");

    const nutrientIdByKey = new Map(
      (await prisma.nutrient.findMany()).map((n) => [n.key, n.id]),
    );
    for (const key of Object.values(NUTRIENT_FIELD_MAP)) {
      if (!nutrientIdByKey.has(key)) {
        throw new Error(
          `Nutriente '${key}' ausente do catálogo — rode npm run db:seed`,
        );
      }
    }

    const categoryIdByName = new Map(
      (
        await prisma.foodCategory.findMany({ where: { organizationId: null } })
      ).map((c) => [c.name, c.id]),
    );

    const missingCategories = new Set<string>();

    const foodData = (row: TacoRow) => {
      const categoryId = categoryIdByName.get(row.category) ?? null;
      if (!categoryId) missingCategories.add(row.category);
      return {
        name: row.description,
        nameNormalized: normalizeSearchText(row.description),
        foodCategoryId: categoryId,
        baseQty: 100,
        baseUnit: "g" as const,
        energyKcal: parseValue(row.energy_kcal),
        proteinG: parseValue(row.protein_g),
        carbohydrateG: parseValue(row.carbohydrate_g),
        lipidG: parseValue(row.lipid_g),
        isActive: true,
      };
    };

    const nutrientRows = (row: TacoRow, foodId: string) => {
      const result: Array<{
        foodId: string;
        nutrientId: string;
        amount: number;
      }> = [];
      for (const [field, key] of Object.entries(NUTRIENT_FIELD_MAP)) {
        const amount = parseValue(row[field]);
        if (amount === null) continue;
        const nutrientId = nutrientIdByKey.get(key);
        if (nutrientId) result.push({ foodId, nutrientId, amount });
      }
      return result;
    };

    const existing = await prisma.food.findMany({
      where: { foodSourceId: source.id },
      select: { id: true, sourceCode: true },
    });
    const existingByCode = new Map(
      existing.map((f) => [f.sourceCode ?? "", f.id]),
    );

    const toCreate = rows.filter((r) => !existingByCode.has(String(r.id)));
    const toUpdate = rows.filter((r) => existingByCode.has(String(r.id)));

    // Caminho bulk (primeira carga): poucos roundtrips, uma transação.
    if (toCreate.length > 0) {
      await prisma.$transaction(
        async (tx) => {
          await tx.food.createMany({
            data: toCreate.map((row) => ({
              ...foodData(row),
              foodSourceId: source.id,
              sourceCode: String(row.id),
            })),
          });
          const created = await tx.food.findMany({
            where: { foodSourceId: source.id },
            select: { id: true, sourceCode: true },
          });
          const idByCode = new Map(
            created.map((f) => [f.sourceCode ?? "", f.id]),
          );
          const allNutrients = toCreate.flatMap((row) => {
            const foodId = idByCode.get(String(row.id));
            return foodId ? nutrientRows(row, foodId) : [];
          });
          for (let i = 0; i < allNutrients.length; i += 3000) {
            await tx.foodNutrient.createMany({
              data: allNutrients.slice(i, i + 3000),
            });
          }
        },
        { timeout: 300_000, maxWait: 30_000 },
      );
      console.info(`Criados: ${toCreate.length} alimentos.`);
    }

    // Re-execução: atualiza linha a linha (raro; idempotência acima de tudo).
    for (let offset = 0; offset < toUpdate.length; offset += CHUNK_SIZE) {
      const chunk = toUpdate.slice(offset, offset + CHUNK_SIZE);
      await prisma.$transaction(
        async (tx) => {
          for (const row of chunk) {
            const foodId = existingByCode.get(String(row.id));
            if (!foodId) continue;
            await tx.food.update({
              where: { id: foodId },
              data: foodData(row),
            });
            await tx.foodNutrient.deleteMany({ where: { foodId } });
            await tx.foodNutrient.createMany({
              data: nutrientRows(row, foodId),
            });
          }
        },
        { timeout: 120_000, maxWait: 30_000 },
      );
      console.info(
        `… atualizados ${Math.min(offset + CHUNK_SIZE, toUpdate.length)}/${toUpdate.length}`,
      );
    }

    if (missingCategories.size > 0) {
      console.warn("Categorias sem correspondência:", [...missingCategories]);
    }
    console.info(
      `Importação TACO concluída: ${toCreate.length} criados, ${toUpdate.length} atualizados.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
