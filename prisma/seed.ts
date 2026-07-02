import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedCatalogs } from "./seeds/catalogs";

/** Papéis de sistema (catálogo `roles`) — seed idempotente. */
const systemRoles = [
  { key: "owner", name: "Proprietário(a)" },
  { key: "nutritionist", name: "Nutricionista" },
  { key: "secretary", name: "Secretário(a)" },
  { key: "patient", name: "Paciente" },
];

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Defina DIRECT_URL (ou DATABASE_URL) para rodar o seed");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 2 }),
  });

  try {
    for (const role of systemRoles) {
      await prisma.role.upsert({
        where: { key: role.key },
        update: { name: role.name, isSystem: true },
        create: { key: role.key, name: role.name, isSystem: true },
      });
    }
    console.info(
      `Seed de papéis: ${systemRoles.length} papéis de sistema garantidos.`,
    );

    await seedCatalogs(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
