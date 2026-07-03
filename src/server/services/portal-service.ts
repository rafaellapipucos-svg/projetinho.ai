import "server-only";
import { prisma } from "@/server/db";
import { patientRepo } from "@/server/repositories/patient-repo";
import { planRepo } from "@/server/repositories/plan-repo";
import { catalogRepo } from "@/server/repositories/catalog-repo";
import { planService } from "@/server/services/plan-service";
import { ConflictError, NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import type { PatientProfile } from "@/server/auth/tenant-context";
import { messages } from "@/messages/pt-br";
import type { DiaryAddInput } from "@/lib/schemas/portal";

const DIARY_PAGE_SIZE = 60;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Serviços do portal: TUDO parte do PatientProfile resolvido no servidor
 * (vínculo user→patient) — o cliente nunca escolhe o prontuário.
 */
export const portalService = {
  async me(profile: PatientProfile) {
    const mealTypes = await catalogRepo.listMealTypes(
      prisma,
      profile.organizationId,
    );
    return {
      patientId: profile.patientId,
      patientName: profile.patientName,
      organizationName: profile.organizationName,
      organizationId: profile.organizationId,
      mealTypes: mealTypes.map((mealType) => ({
        id: mealType.id,
        name: mealType.name,
      })),
    };
  },

  async activePlan(profile: PatientProfile) {
    const plan = await planRepo.findActiveByPatient(prisma, profile.patientId);
    if (!plan) return null;
    // A org vem do vínculo do próprio paciente — composição segura
    return planService.get(profile.organizationId, plan.id);
  },

  diary: {
    list(profile: PatientProfile) {
      return patientRepo.listDiary(prisma, profile.patientId, DIARY_PAGE_SIZE);
    },

    async add(profile: PatientProfile, userId: string, input: DiaryAddInput) {
      if (input.mealTypeId) {
        const mealTypes = await catalogRepo.listMealTypes(
          prisma,
          profile.organizationId,
        );
        if (!mealTypes.some((mealType) => mealType.id === input.mealTypeId)) {
          throw new NotFoundError(messages.errors.notFound);
        }
      }
      if (input.photoPath) {
        const prefix = `org/${profile.organizationId}/patients/${profile.patientId}/diary/`;
        if (!input.photoPath.startsWith(prefix)) {
          throw new DomainError(messages.patients.attachments.invalidPath);
        }
      }
      return patientRepo.createDiary(prisma, {
        organizationId: profile.organizationId,
        patientId: profile.patientId,
        entryAt: new Date(input.entryAt),
        mealTypeId: input.mealTypeId,
        description: input.description,
        photoPath: input.photoPath,
        createdBy: userId,
      });
    },

    async remove(profile: PatientProfile, id: string) {
      const result = await patientRepo.deleteDiary(
        prisma,
        profile.patientId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  async claimInvite(userId: string, token: string) {
    const patient = await patientRepo.findByInviteToken(prisma, token);
    if (!patient) throw new NotFoundError(messages.portal.inviteInvalid);
    try {
      await patientRepo.bindUser(prisma, patient.id, userId);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(messages.portal.alreadyLinked);
      }
      throw error;
    }
    return { patientName: patient.name };
  },
};
