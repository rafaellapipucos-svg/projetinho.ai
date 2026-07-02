import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Em build de imagem, um DATABASE_URL sintético é passado como build-arg;
    // nenhuma conexão é aberta até a primeira query.
    throw new Error("Variável DATABASE_URL é obrigatória");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 10 }),
    log: ["warn", "error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Cliente Prisma ou transação — todo repository aceita ambos. */
export type Db = PrismaClient | Prisma.TransactionClient;
