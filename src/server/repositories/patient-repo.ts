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
