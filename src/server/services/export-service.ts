import "server-only";
import { prisma } from "@/server/db";
import { exportRepo } from "@/server/repositories/export-repo";
import { NotFoundError } from "@/server/errors";
import { messages } from "@/messages/pt-br";

export const exportService = {
  /** Exportação LGPD de todos os dados do paciente (portabilidade §8). */
  async patientData(organizationId: string, patientId: string) {
    const data = await exportRepo.collect(prisma, organizationId, patientId);
    if (!data) throw new NotFoundError(messages.errors.notFound);
    return {
      exportedAt: new Date().toISOString(),
      ...data,
    };
  },
};
