import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/server/db";

export interface EnsureUserMirrorInput {
  authId: string;
  email: string;
  name: string;
}

export const userRepo = {
  findByAuthId(db: Db, authId: string) {
    return db.user.findUnique({ where: { authId } });
  },

  /**
   * Garante a existência do espelho em public.users para um usuário do
   * Supabase Auth. O caminho normal é o trigger `on_auth_user_created`;
   * este fallback cobre corrida com o trigger e contas criadas antes dele.
   */
  async ensureMirror(db: Db, input: EnsureUserMirrorInput) {
    const existing = await db.user.findUnique({
      where: { authId: input.authId },
    });
    if (existing) return existing;

    try {
      return await db.user.create({ data: input });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await db.user.findUnique({
          where: { authId: input.authId },
        });
        if (raced) return raced;
      }
      throw error;
    }
  },
};
