import type { PrismaClient } from "../../src/generated/prisma/client";
import {
  activityFactors,
  energyMethods,
} from "../../src/domain/energy/methods";
import { bodyCompositionMethods } from "../../src/domain/anthropometry/methods";

/**
 * Seeds dos catálogos globais (linhas de sistema). Idempotentes: upsert por
 * chave única ou find-first para catálogos com organization_id nullable.
 * Coeficientes de calculation_methods vêm dos defaultParams do motor
 * (src/domain) — fonte única da verdade.
 */

const nutrientGroups = [
  { name: "Energia", sortOrder: 0 },
  { name: "Macronutrientes", sortOrder: 1 },
  { name: "Lipídios", sortOrder: 2 },
  { name: "Minerais", sortOrder: 3 },
  { name: "Vitaminas", sortOrder: 4 },
  { name: "Outros componentes", sortOrder: 5 },
];

const nutrients: Array<{
  key: string;
  name: string;
  unit: string;
  group: string;
  decimals: number;
  isCore?: boolean;
  sortOrder: number;
}> = [
  {
    key: "energy_kcal",
    name: "Energia",
    unit: "kcal",
    group: "Energia",
    decimals: 0,
    isCore: true,
    sortOrder: 0,
  },
  {
    key: "energy_kj",
    name: "Energia",
    unit: "kJ",
    group: "Energia",
    decimals: 0,
    sortOrder: 1,
  },
  {
    key: "protein_g",
    name: "Proteína",
    unit: "g",
    group: "Macronutrientes",
    decimals: 1,
    isCore: true,
    sortOrder: 0,
  },
  {
    key: "carbohydrate_g",
    name: "Carboidrato",
    unit: "g",
    group: "Macronutrientes",
    decimals: 1,
    isCore: true,
    sortOrder: 1,
  },
  {
    key: "lipid_g",
    name: "Lipídeos",
    unit: "g",
    group: "Macronutrientes",
    decimals: 1,
    isCore: true,
    sortOrder: 2,
  },
  {
    key: "fiber_g",
    name: "Fibra alimentar",
    unit: "g",
    group: "Macronutrientes",
    decimals: 1,
    sortOrder: 3,
  },
  {
    key: "calcium_mg",
    name: "Cálcio",
    unit: "mg",
    group: "Minerais",
    decimals: 1,
    sortOrder: 0,
  },
  {
    key: "magnesium_mg",
    name: "Magnésio",
    unit: "mg",
    group: "Minerais",
    decimals: 1,
    sortOrder: 1,
  },
  {
    key: "manganese_mg",
    name: "Manganês",
    unit: "mg",
    group: "Minerais",
    decimals: 2,
    sortOrder: 2,
  },
  {
    key: "phosphorus_mg",
    name: "Fósforo",
    unit: "mg",
    group: "Minerais",
    decimals: 1,
    sortOrder: 3,
  },
  {
    key: "iron_mg",
    name: "Ferro",
    unit: "mg",
    group: "Minerais",
    decimals: 2,
    sortOrder: 4,
  },
  {
    key: "sodium_mg",
    name: "Sódio",
    unit: "mg",
    group: "Minerais",
    decimals: 1,
    sortOrder: 5,
  },
  {
    key: "potassium_mg",
    name: "Potássio",
    unit: "mg",
    group: "Minerais",
    decimals: 1,
    sortOrder: 6,
  },
  {
    key: "copper_mg",
    name: "Cobre",
    unit: "mg",
    group: "Minerais",
    decimals: 2,
    sortOrder: 7,
  },
  {
    key: "zinc_mg",
    name: "Zinco",
    unit: "mg",
    group: "Minerais",
    decimals: 2,
    sortOrder: 8,
  },
  {
    key: "retinol_mcg",
    name: "Retinol",
    unit: "µg",
    group: "Vitaminas",
    decimals: 1,
    sortOrder: 0,
  },
  {
    key: "re_mcg",
    name: "Vitamina A (RE)",
    unit: "µg",
    group: "Vitaminas",
    decimals: 1,
    sortOrder: 1,
  },
  {
    key: "rae_mcg",
    name: "Vitamina A (RAE)",
    unit: "µg",
    group: "Vitaminas",
    decimals: 1,
    sortOrder: 2,
  },
  {
    key: "thiamine_mg",
    name: "Tiamina (B1)",
    unit: "mg",
    group: "Vitaminas",
    decimals: 2,
    sortOrder: 3,
  },
  {
    key: "riboflavin_mg",
    name: "Riboflavina (B2)",
    unit: "mg",
    group: "Vitaminas",
    decimals: 2,
    sortOrder: 4,
  },
  {
    key: "pyridoxine_mg",
    name: "Piridoxina (B6)",
    unit: "mg",
    group: "Vitaminas",
    decimals: 2,
    sortOrder: 5,
  },
  {
    key: "niacin_mg",
    name: "Niacina",
    unit: "mg",
    group: "Vitaminas",
    decimals: 2,
    sortOrder: 6,
  },
  {
    key: "vitamin_c_mg",
    name: "Vitamina C",
    unit: "mg",
    group: "Vitaminas",
    decimals: 1,
    sortOrder: 7,
  },
  {
    key: "moisture_g",
    name: "Umidade",
    unit: "g",
    group: "Outros componentes",
    decimals: 1,
    sortOrder: 0,
  },
  {
    key: "ash_g",
    name: "Cinzas",
    unit: "g",
    group: "Outros componentes",
    decimals: 1,
    sortOrder: 1,
  },
  {
    key: "cholesterol_mg",
    name: "Colesterol",
    unit: "mg",
    group: "Lipídios",
    decimals: 1,
    sortOrder: 3,
  },
  {
    key: "saturated_g",
    name: "Gorduras saturadas",
    unit: "g",
    group: "Lipídios",
    decimals: 1,
    sortOrder: 0,
  },
  {
    key: "monounsaturated_g",
    name: "Gorduras monoinsaturadas",
    unit: "g",
    group: "Lipídios",
    decimals: 1,
    sortOrder: 1,
  },
  {
    key: "polyunsaturated_g",
    name: "Gorduras poli-insaturadas",
    unit: "g",
    group: "Lipídios",
    decimals: 1,
    sortOrder: 2,
  },
];

const measurementUnits = [
  {
    key: "g",
    name: "Grama",
    abbreviation: "g",
    type: "mass",
    gramsPerUnit: 1,
    sortOrder: 0,
  },
  {
    key: "kg",
    name: "Quilograma",
    abbreviation: "kg",
    type: "mass",
    gramsPerUnit: 1000,
    sortOrder: 1,
  },
  {
    key: "ml",
    name: "Mililitro",
    abbreviation: "ml",
    type: "volume",
    gramsPerUnit: 1,
    sortOrder: 2,
  },
  {
    key: "l",
    name: "Litro",
    abbreviation: "L",
    type: "volume",
    gramsPerUnit: 1000,
    sortOrder: 3,
  },
  {
    key: "portion",
    name: "Porção/unidade",
    abbreviation: "un",
    type: "unit",
    gramsPerUnit: null,
    sortOrder: 4,
  },
] as const;

const foodSources = [
  {
    key: "taco",
    name: "TACO — Tabela Brasileira de Composição de Alimentos (NEPA/Unicamp)",
    version: "4ª edição (2011)",
    licenseNote: "Dados públicos; citar a fonte.",
  },
  {
    key: "tbca",
    name: "TBCA — Tabela Brasileira de Composição de Alimentos (USP/FoRC)",
    version: "7.2",
    licenseNote: "Dados públicos; citar a fonte.",
  },
  {
    key: "ibge",
    name: "IBGE — POF 2008–2009 (medidas referidas)",
    version: "2011",
    licenseNote: "Dados públicos; citar a fonte.",
  },
  { key: "custom", name: "Cadastro próprio", version: null, licenseNote: null },
];

const systemMealTypes = [
  { name: "Café da manhã", defaultTime: "07:00", sortOrder: 0 },
  { name: "Lanche da manhã", defaultTime: "10:00", sortOrder: 1 },
  { name: "Almoço", defaultTime: "12:30", sortOrder: 2 },
  { name: "Lanche da tarde", defaultTime: "15:30", sortOrder: 3 },
  { name: "Jantar", defaultTime: "19:30", sortOrder: 4 },
  { name: "Ceia", defaultTime: "22:00", sortOrder: 5 },
  { name: "Pré-treino", defaultTime: null, sortOrder: 6 },
  { name: "Pós-treino", defaultTime: null, sortOrder: 7 },
];

/** Grupos oficiais da TACO (4ª edição). */
const systemFoodCategories = [
  "Cereais e derivados",
  "Verduras, hortaliças e derivados",
  "Frutas e derivados",
  "Gorduras e óleos",
  "Pescados e frutos do mar",
  "Carnes e derivados",
  "Leite e derivados",
  "Bebidas (alcoólicas e não alcoólicas)",
  "Ovos e derivados",
  "Produtos açucarados",
  "Miscelâneas",
  "Outros alimentos industrializados",
  "Alimentos preparados",
  "Leguminosas e derivados",
  "Nozes e sementes",
].map((name, index) => ({ name, sortOrder: index }));

const measurementTypes = [
  { key: "weight", name: "Peso", unit: "kg", group: "basic", sortOrder: 0 },
  { key: "height", name: "Altura", unit: "cm", group: "basic", sortOrder: 1 },
  {
    key: "sf_triceps",
    name: "Dobra tríceps",
    unit: "mm",
    group: "skinfold",
    sortOrder: 0,
  },
  {
    key: "sf_biceps",
    name: "Dobra bíceps",
    unit: "mm",
    group: "skinfold",
    sortOrder: 1,
  },
  {
    key: "sf_subscapular",
    name: "Dobra subescapular",
    unit: "mm",
    group: "skinfold",
    sortOrder: 2,
  },
  {
    key: "sf_suprailiac",
    name: "Dobra supra-ilíaca",
    unit: "mm",
    group: "skinfold",
    sortOrder: 3,
  },
  {
    key: "sf_chest",
    name: "Dobra peitoral",
    unit: "mm",
    group: "skinfold",
    sortOrder: 4,
  },
  {
    key: "sf_midaxillary",
    name: "Dobra axilar média",
    unit: "mm",
    group: "skinfold",
    sortOrder: 5,
  },
  {
    key: "sf_abdominal",
    name: "Dobra abdominal",
    unit: "mm",
    group: "skinfold",
    sortOrder: 6,
  },
  {
    key: "sf_thigh",
    name: "Dobra coxa",
    unit: "mm",
    group: "skinfold",
    sortOrder: 7,
  },
  {
    key: "sf_calf",
    name: "Dobra panturrilha medial",
    unit: "mm",
    group: "skinfold",
    sortOrder: 8,
  },
  {
    key: "c_neck",
    name: "Circunf. pescoço",
    unit: "cm",
    group: "circumference",
    sortOrder: 0,
  },
  {
    key: "c_chest",
    name: "Circunf. tórax",
    unit: "cm",
    group: "circumference",
    sortOrder: 1,
  },
  {
    key: "c_waist",
    name: "Circunf. cintura",
    unit: "cm",
    group: "circumference",
    sortOrder: 2,
  },
  {
    key: "c_abdomen",
    name: "Circunf. abdômen",
    unit: "cm",
    group: "circumference",
    sortOrder: 3,
  },
  {
    key: "c_hip",
    name: "Circunf. quadril",
    unit: "cm",
    group: "circumference",
    sortOrder: 4,
  },
  {
    key: "c_arm_relaxed",
    name: "Circunf. braço relaxado",
    unit: "cm",
    group: "circumference",
    sortOrder: 5,
  },
  {
    key: "c_arm_flexed",
    name: "Circunf. braço contraído",
    unit: "cm",
    group: "circumference",
    sortOrder: 6,
  },
  {
    key: "c_forearm",
    name: "Circunf. antebraço",
    unit: "cm",
    group: "circumference",
    sortOrder: 7,
  },
  {
    key: "c_thigh",
    name: "Circunf. coxa média",
    unit: "cm",
    group: "circumference",
    sortOrder: 8,
  },
  {
    key: "c_calf",
    name: "Circunf. panturrilha",
    unit: "cm",
    group: "circumference",
    sortOrder: 9,
  },
  {
    key: "bia_fat_pct",
    name: "% Gordura (BIA)",
    unit: "%",
    group: "bioimpedance",
    sortOrder: 0,
  },
  {
    key: "bia_lean_mass",
    name: "Massa magra (BIA)",
    unit: "kg",
    group: "bioimpedance",
    sortOrder: 1,
  },
  {
    key: "bia_water_pct",
    name: "% Água corporal (BIA)",
    unit: "%",
    group: "bioimpedance",
    sortOrder: 2,
  },
] as const;

const systemExamTypes = [
  {
    name: "Glicemia de jejum",
    unit: "mg/dL",
    referenceRange: { min: 70, max: 99 },
  },
  {
    name: "Hemoglobina glicada (HbA1c)",
    unit: "%",
    referenceRange: { max: 5.7 },
  },
  { name: "Colesterol total", unit: "mg/dL", referenceRange: { max: 190 } },
  { name: "HDL", unit: "mg/dL", referenceRange: { min: 40 } },
  { name: "LDL", unit: "mg/dL", referenceRange: { max: 130 } },
  { name: "Triglicerídeos", unit: "mg/dL", referenceRange: { max: 150 } },
  { name: "TSH", unit: "µUI/mL", referenceRange: { min: 0.4, max: 4.0 } },
  { name: "T4 livre", unit: "ng/dL", referenceRange: { min: 0.8, max: 1.8 } },
  {
    name: "Vitamina D (25-OH)",
    unit: "ng/mL",
    referenceRange: { min: 30, max: 100 },
  },
  {
    name: "Vitamina B12",
    unit: "pg/mL",
    referenceRange: { min: 200, max: 900 },
  },
  { name: "Ferritina", unit: "ng/mL", referenceRange: { min: 30, max: 300 } },
  { name: "Hemoglobina", unit: "g/dL", referenceRange: { min: 12, max: 17 } },
  { name: "Creatinina", unit: "mg/dL", referenceRange: { min: 0.6, max: 1.3 } },
  { name: "TGO (AST)", unit: "U/L", referenceRange: { max: 40 } },
  { name: "TGP (ALT)", unit: "U/L", referenceRange: { max: 41 } },
  { name: "Ácido úrico", unit: "mg/dL", referenceRange: { min: 2.5, max: 7 } },
  { name: "Ureia", unit: "mg/dL", referenceRange: { min: 15, max: 45 } },
].map((exam, index) => ({ ...exam, sortOrder: index }));

const methodDescriptions: Record<string, string> = {
  harris_benedict_1984:
    "Clássica revisada (Roza & Shizgal). Usa peso, altura e idade.",
  mifflin_1990:
    "Padrão atual para a população geral. Usa peso, altura e idade.",
  fao_who_1985: "Equações por faixa etária da FAO/OMS. Usa peso e idade.",
  katch_mcardle: "Baseada em massa magra — exige composição corporal.",
  cunningham_1980: "Baseada em massa magra; comum em atletas.",
  tinsley_2019: "Desenvolvida para praticantes de musculação (peso total).",
  jackson_pollock_3:
    "3 dobras (dobras diferentes por sexo). Rápida e validada.",
  jackson_pollock_7: "7 dobras — maior precisão para população geral.",
  durnin_womersley_1974: "4 dobras com faixas etárias amplas (17+).",
};

export async function seedCatalogs(prisma: PrismaClient) {
  // Grupos de nutrientes + nutrientes
  for (const group of nutrientGroups) {
    await prisma.nutrientGroup.upsert({
      where: { name: group.name },
      update: { sortOrder: group.sortOrder },
      create: group,
    });
  }
  const groupsByName = new Map(
    (await prisma.nutrientGroup.findMany()).map((g) => [g.name, g.id]),
  );
  for (const nutrient of nutrients) {
    const nutrientGroupId = groupsByName.get(nutrient.group);
    if (!nutrientGroupId) throw new Error(`Grupo ausente: ${nutrient.group}`);
    const data = {
      name: nutrient.name,
      unit: nutrient.unit,
      nutrientGroupId,
      decimals: nutrient.decimals,
      isCore: nutrient.isCore ?? false,
      sortOrder: nutrient.sortOrder,
    };
    await prisma.nutrient.upsert({
      where: { key: nutrient.key },
      update: data,
      create: { key: nutrient.key, ...data },
    });
  }

  // Unidades de medida
  for (const unit of measurementUnits) {
    const data = {
      name: unit.name,
      abbreviation: unit.abbreviation,
      type: unit.type,
      gramsPerUnit: unit.gramsPerUnit,
      sortOrder: unit.sortOrder,
    };
    await prisma.measurementUnit.upsert({
      where: { key: unit.key },
      update: data,
      create: { key: unit.key, ...data },
    });
  }

  // Fontes de dados de alimentos
  for (const source of foodSources) {
    const data = {
      name: source.name,
      version: source.version,
      licenseNote: source.licenseNote,
    };
    await prisma.foodSource.upsert({
      where: { key: source.key },
      update: data,
      create: { key: source.key, ...data },
    });
  }

  // Tipos de refeição do sistema
  for (const mealType of systemMealTypes) {
    const existing = await prisma.mealType.findFirst({
      where: { organizationId: null, name: mealType.name },
    });
    if (existing) {
      await prisma.mealType.update({
        where: { id: existing.id },
        data: { ...mealType, isSystem: true },
      });
    } else {
      await prisma.mealType.create({ data: { ...mealType, isSystem: true } });
    }
  }

  // Categorias de alimentos do sistema (grupos TACO)
  for (const category of systemFoodCategories) {
    const existing = await prisma.foodCategory.findFirst({
      where: { organizationId: null, name: category.name },
    });
    if (existing) {
      await prisma.foodCategory.update({
        where: { id: existing.id },
        data: { ...category, isSystem: true },
      });
    } else {
      await prisma.foodCategory.create({
        data: { ...category, isSystem: true },
      });
    }
  }

  // Tipos de medida antropométrica
  for (const measurement of measurementTypes) {
    const data = {
      name: measurement.name,
      unit: measurement.unit,
      group: measurement.group,
      sortOrder: measurement.sortOrder,
    };
    await prisma.measurementType.upsert({
      where: { key: measurement.key },
      update: data,
      create: { key: measurement.key, ...data },
    });
  }

  // Tipos de exame do sistema
  for (const exam of systemExamTypes) {
    const existing = await prisma.examType.findFirst({
      where: { organizationId: null, name: exam.name },
    });
    if (existing) {
      await prisma.examType.update({
        where: { id: existing.id },
        data: { ...exam, isSystem: true },
      });
    } else {
      await prisma.examType.create({ data: { ...exam, isSystem: true } });
    }
  }

  // Métodos de cálculo — coeficientes copiados do motor (fonte única)
  let sortOrder = 0;
  for (const [key, method] of Object.entries(energyMethods)) {
    await prisma.calculationMethod.upsert({
      where: { key },
      update: {
        name: method.name,
        description: methodDescriptions[key] ?? null,
        params: method.defaultParams as object,
        sortOrder,
      },
      create: {
        key,
        kind: "energy_expenditure",
        name: method.name,
        description: methodDescriptions[key] ?? null,
        params: method.defaultParams as object,
        sortOrder,
      },
    });
    sortOrder += 1;
  }
  sortOrder = 0;
  for (const [key, method] of Object.entries(bodyCompositionMethods)) {
    await prisma.calculationMethod.upsert({
      where: { key },
      update: {
        name: method.name,
        description: methodDescriptions[key] ?? null,
        params: method.defaultParams as object,
        sortOrder,
      },
      create: {
        key,
        kind: "body_composition",
        name: method.name,
        description: methodDescriptions[key] ?? null,
        params: method.defaultParams as object,
        sortOrder,
      },
    });
    sortOrder += 1;
  }
  sortOrder = 0;
  for (const factor of activityFactors) {
    await prisma.calculationMethod.upsert({
      where: { key: factor.key },
      update: {
        name: factor.name,
        params: { factor: factor.factor },
        sortOrder,
      },
      create: {
        key: factor.key,
        kind: "activity_factor",
        name: factor.name,
        params: { factor: factor.factor },
        sortOrder,
      },
    });
    sortOrder += 1;
  }

  console.info(
    `Seed de catálogos: ${nutrients.length} nutrientes, ${measurementUnits.length} unidades, ` +
      `${foodSources.length} fontes, ${systemMealTypes.length} refeições, ` +
      `${systemFoodCategories.length} categorias, ${measurementTypes.length} medidas, ` +
      `${systemExamTypes.length} exames e métodos de cálculo garantidos.`,
  );
}
