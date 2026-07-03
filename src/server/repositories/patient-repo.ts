import "server-only";
import type { Db } from "@/server/db";

export interface PatientData {
  name: string;
  nameNormalized: string;
  birthDate: Date | null;
  sex: "male" | "female" | null;
  genderIdentity: string | null;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  notes: string | null;
  consentAt: Date | null;
}

export const patientRepo = {
  list(db: Db, organizationId: string, normalizedTerm?: string) {
    return db.patient.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(normalizedTerm
          ? { nameNormalized: { contains: normalizedTerm } }
          : {}),
      },
      orderBy: { nameNormalized: "asc" },
      select: {
        id: true,
        name: true,
        birthDate: true,
        phone: true,
        consentAt: true,
        updatedAt: true,
      },
    });
  },

  findByIdForOrg(db: Db, organizationId: string, id: string) {
    return db.patient.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
  },

  create(
    db: Db,
    data: PatientData & {
      organizationId: string;
      assignedToId: string | null;
      createdBy: string | null;
    },
  ) {
    return db.patient.create({ data });
  },

  update(db: Db, organizationId: string, id: string, data: PatientData) {
    return db.patient.updateMany({
      where: { id, organizationId, deletedAt: null },
      data,
    });
  },

  archive(db: Db, organizationId: string, id: string) {
    return db.patient.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  // ── Portal (convite e vínculo) ─────────────────────────────────────────────
  findProfilesByUser(db: Db, userId: string) {
    return db.patient.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        organizationId: true,
        organization: { select: { name: true } },
      },
    });
  },

  setInviteToken(db: Db, organizationId: string, id: string, token: string) {
    return db.patient.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { inviteToken: token },
    });
  },

  revokeAccess(db: Db, organizationId: string, id: string) {
    return db.patient.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { userId: null, inviteToken: null },
    });
  },

  findByInviteToken(db: Db, token: string) {
    return db.patient.findFirst({
      where: { inviteToken: token, deletedAt: null },
    });
  },

  bindUser(db: Db, patientId: string, userId: string) {
    return db.patient.update({
      where: { id: patientId },
      data: { userId, inviteToken: null },
    });
  },

  // ── Diário alimentar (portal) ──────────────────────────────────────────────
  listDiary(db: Db, patientId: string, take: number) {
    return db.foodDiaryEntry.findMany({
      where: { patientId },
      orderBy: { entryAt: "desc" },
      take,
      include: { mealType: { select: { name: true } } },
    });
  },

  createDiary(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      entryAt: Date;
      mealTypeId: string | null;
      description: string;
      photoPath: string | null;
      createdBy: string;
    },
  ) {
    return db.foodDiaryEntry.create({ data });
  },

  deleteDiary(db: Db, patientId: string, id: string) {
    return db.foodDiaryEntry.deleteMany({ where: { id, patientId } });
  },

  // ── Anexos ─────────────────────────────────────────────────────────────────
  listAttachments(db: Db, organizationId: string, patientId: string) {
    return db.attachment.findMany({
      where: { organizationId, ownerType: "patient", ownerId: patientId },
      orderBy: { createdAt: "desc" },
    });
  },

  createAttachment(
    db: Db,
    data: {
      organizationId: string;
      ownerId: string;
      fileName: string;
      storagePath: string;
      mimeType: string;
      sizeBytes: number;
      createdBy: string | null;
    },
  ) {
    return db.attachment.create({ data: { ...data, ownerType: "patient" } });
  },

  findAttachmentForOrg(db: Db, organizationId: string, id: string) {
    return db.attachment.findFirst({ where: { id, organizationId } });
  },

  deleteAttachment(db: Db, organizationId: string, id: string) {
    return db.attachment.deleteMany({ where: { id, organizationId } });
  },
};
