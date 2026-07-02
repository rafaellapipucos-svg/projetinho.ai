import "server-only";
import type { Db } from "@/server/db";

export interface CreateOrganizationData {
  name: string;
  slug: string;
  createdBy: string;
}

export interface AddMemberData {
  organizationId: string;
  userId: string;
  roleId: string;
}

export const organizationRepo = {
  create(db: Db, data: CreateOrganizationData) {
    return db.organization.create({ data });
  },

  addMember(db: Db, data: AddMemberData) {
    return db.organizationMember.create({ data });
  },

  /** Primeira participação ativa do usuário (UX de clínica única da Fase 0). */
  findFirstMembershipByUser(db: Db, userId: string) {
    return db.organizationMember.findFirst({
      where: { userId, status: "active" },
      orderBy: { createdAt: "asc" },
      include: { organization: true, role: true },
    });
  },
};
