import "server-only";
import { prisma } from "@/server/db";
import {
  patientRepo,
  type PatientData,
} from "@/server/repositories/patient-repo";
import { NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import { normalizeSearchText } from "@/lib/search";
import { messages } from "@/messages/pt-br";
import type { PatientInput } from "@/lib/schemas/patient";

function toPatientData(
  input: PatientInput,
  existingConsentAt: Date | null,
): PatientData {
  return {
    name: input.name,
    nameNormalized: normalizeSearchText(input.name),
    birthDate: input.birthDate
      ? new Date(`${input.birthDate}T00:00:00Z`)
      : null,
    sex: input.sex,
    genderIdentity: input.genderIdentity,
    cpf: input.cpf,
    email: input.email,
    phone: input.phone,
    occupation: input.occupation,
    notes: input.notes,
    // Consentimento: marca a primeira vez; desmarcar revoga (LGPD).
    consentAt: input.consent ? (existingConsentAt ?? new Date()) : null,
  };
}

export const patientService = {
  async list(organizationId: string, term?: string) {
    const normalized = term ? normalizeSearchText(term) : undefined;
    const patients = await patientRepo.list(prisma, organizationId, normalized);
    return patients;
  },

  async byId(organizationId: string, id: string) {
    const patient = await patientRepo.findByIdForOrg(
      prisma,
      organizationId,
      id,
    );
    if (!patient) throw new NotFoundError(messages.errors.notFound);
    return patient;
  },

  create(organizationId: string, userId: string, input: PatientInput) {
    return patientRepo.create(prisma, {
      ...toPatientData(input, null),
      organizationId,
      assignedToId: userId,
      createdBy: userId,
    });
  },

  async update(organizationId: string, id: string, input: PatientInput) {
    const existing = await patientRepo.findByIdForOrg(
      prisma,
      organizationId,
      id,
    );
    if (!existing) throw new NotFoundError(messages.errors.notFound);
    await patientRepo.update(
      prisma,
      organizationId,
      id,
      toPatientData(input, existing.consentAt),
    );
  },

  async archive(organizationId: string, id: string) {
    const result = await patientRepo.archive(prisma, organizationId, id);
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },

  attachments: {
    async list(organizationId: string, patientId: string) {
      const patient = await patientRepo.findByIdForOrg(
        prisma,
        organizationId,
        patientId,
      );
      if (!patient) throw new NotFoundError(messages.errors.notFound);
      return patientRepo.listAttachments(prisma, organizationId, patientId);
    },

    async register(
      organizationId: string,
      userId: string,
      input: {
        patientId: string;
        fileName: string;
        storagePath: string;
        mimeType: string;
        sizeBytes: number;
      },
    ) {
      const patient = await patientRepo.findByIdForOrg(
        prisma,
        organizationId,
        input.patientId,
      );
      if (!patient) throw new NotFoundError(messages.errors.notFound);

      const expectedPrefix = `org/${organizationId}/patients/${input.patientId}/`;
      if (!input.storagePath.startsWith(expectedPrefix)) {
        throw new DomainError(messages.patients.attachments.invalidPath);
      }

      return patientRepo.createAttachment(prisma, {
        organizationId,
        ownerId: input.patientId,
        fileName: input.fileName,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        createdBy: userId,
      });
    },

    async remove(organizationId: string, id: string) {
      const attachment = await patientRepo.findAttachmentForOrg(
        prisma,
        organizationId,
        id,
      );
      if (!attachment) throw new NotFoundError(messages.errors.notFound);
      await patientRepo.deleteAttachment(prisma, organizationId, id);
      return { storagePath: attachment.storagePath };
    },
  },
};
