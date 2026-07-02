import "dotenv/config";
import { defineConfig } from "prisma/config";

// Migrations e introspecção usam o pooler do Supabase em modo session (IPv4).
// Condicional para que `prisma generate` funcione em ambientes sem banco (CI de build).
const directUrl = process.env.DIRECT_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(directUrl ? { datasource: { url: directUrl } } : {}),
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
