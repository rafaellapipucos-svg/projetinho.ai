import "server-only";
import { prisma } from "@/server/db";
import { financeRepo } from "@/server/repositories/finance-repo";
import { patientRepo } from "@/server/repositories/patient-repo";
import { NotFoundError } from "@/server/errors";
import { messages } from "@/messages/pt-br";
import type { PaymentInput } from "@/lib/schemas/finance";
import type { PaymentStatus } from "@/generated/prisma/enums";

function reais(cents: number): number {
  return cents / 100;
}

function toDate(value: string | null): Date | null {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

export const financeService = {
  async list(
    organizationId: string,
    filters: { patientId?: string; status?: PaymentStatus },
  ) {
    const payments = await financeRepo.list(prisma, organizationId, filters);
    return payments.map((payment) => ({
      id: payment.id,
      patientId: payment.patientId,
      patientName: payment.patient.name,
      description: payment.description,
      amountReais: reais(payment.amountCents),
      method: payment.method,
      status: payment.status,
      dueAt: payment.dueAt,
      paidAt: payment.paidAt,
    }));
  },

  async totals(organizationId: string) {
    const totals = await financeRepo.totals(prisma, organizationId);
    return {
      paidReais: reais(totals.paidCents),
      pendingReais: reais(totals.pendingCents),
    };
  },

  async create(organizationId: string, userId: string, input: PaymentInput) {
    await patientRepo
      .findByIdForOrg(prisma, organizationId, input.patientId)
      .then((p) => {
        if (!p) throw new NotFoundError(messages.errors.notFound);
      });
    const payment = await financeRepo.create(prisma, {
      organizationId,
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      description: input.description,
      amountCents: Math.round(input.amountReais * 100),
      method: input.method,
      status: input.status,
      dueAt: toDate(input.dueAt),
      paidAt:
        input.status === "paid"
          ? (toDate(input.paidAt) ?? new Date())
          : toDate(input.paidAt),
      createdBy: userId,
    });
    return { id: payment.id };
  },

  async update(organizationId: string, id: string, input: PaymentInput) {
    const result = await financeRepo.update(prisma, organizationId, id, {
      description: input.description,
      amountCents: Math.round(input.amountReais * 100),
      method: input.method,
      status: input.status,
      dueAt: toDate(input.dueAt),
      paidAt:
        input.status === "paid"
          ? (toDate(input.paidAt) ?? new Date())
          : toDate(input.paidAt),
    });
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },

  async remove(organizationId: string, id: string) {
    const result = await financeRepo.softDelete(prisma, organizationId, id);
    if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
  },

  async byId(organizationId: string, id: string) {
    const payment = await financeRepo.findForOrg(prisma, organizationId, id);
    if (!payment) throw new NotFoundError(messages.errors.notFound);
    return payment;
  },
};
