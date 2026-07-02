import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { organizationRepo } from "@/server/repositories/organization-repo";
import { roleRepo } from "@/server/repositories/role-repo";
import { slugify, slugCandidate } from "@/lib/slugify";

const OWNER_ROLE_KEY = "owner";
const MAX_SLUG_ATTEMPTS = 3;

export const organizationService = {
  /**
   * Cria a clínica e a participação do criador como owner, em transação.
   * Colisão de slug (P2002) aborta a transação inteira, então cada nova
   * tentativa reabre uma transação nova com outro candidato.
   */
  async createForUser(userId: string, input: { name: string }) {
    const ownerRole = await roleRepo.findByKey(prisma, OWNER_ROLE_KEY);
    if (!ownerRole) {
      throw new Error(
        `Papel de sistema "${OWNER_ROLE_KEY}" não encontrado — execute o seed (npm run db:seed)`,
      );
    }

    const base = slugify(input.name, "clinica");

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const organization = await organizationRepo.create(tx, {
            name: input.name,
            slug: slugCandidate(base, attempt),
            createdBy: userId,
          });
          await organizationRepo.addMember(tx, {
            organizationId: organization.id,
            userId,
            roleId: ownerRole.id,
          });
          return organization;
        });
      } catch (error) {
        const slugTaken =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002";
        if (!slugTaken || attempt === MAX_SLUG_ATTEMPTS - 1) throw error;
      }
    }

    throw new Error("Não foi possível gerar um slug único para a clínica");
  },
};
