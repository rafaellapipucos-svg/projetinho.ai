import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/server/db";
import type { PaymentStatus } from "@/generated/prisma/enums";

export const financeRepo = {
  list(
    db: Db,
    organizationId: string,
    filters: { patientId?: string; status?: PaymentStatus },
  ) {
    return db.payment.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { name: true } } },
    });
  },

  findForOrg(db: Db, organizationId: string, id: string) {
    return db.payment.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { patient: { select: { name: true } } },
    });
  },

  create(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      appointmentId: string | null;
      description: string;
      amountCents: number;
      method: string | null;
      status: PaymentStatus;
      dueAt: Date | null;
      paidAt: Date | null;
      createdBy: string;
    },
  ) {
    return db.payment.create({ data });
  },

  update(
    db: Db,
    organizationId: string,
    id: string,
    data: {
      description: string;
      amountCents: number;
      method: string | null;
      status: PaymentStatus;
      dueAt: Date | null;
      paidAt: Date | null;
    },
  ) {
    return db.payment.updateMany({ where: { id, organizationId }, data });
  },

  softDelete(db: Db, organizationId: string, id: string) {
    return db.payment.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  /** Soma de valores pagos por mês (últimos N meses) para o dashboard. */
  revenueByMonth(db: Db, organizationId: string, since: Date) {
    return db.$queryRaw<Array<{ month: Date; total: bigint }>>(Prisma.sql`
      SELECT date_trunc('month', paid_at) AS month, SUM(amount_cents) AS total
      FROM payments
      WHERE organization_id = ${organizationId}::uuid
        AND status = 'paid'
        AND deleted_at IS NULL
        AND paid_at >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
  },

  async totals(db: Db, organizationId: string) {
    const [paid, pending] = await Promise.all([
      db.payment.aggregate({
        where: { organizationId, status: "paid", deletedAt: null },
        _sum: { amountCents: true },
      }),
      db.payment.aggregate({
        where: { organizationId, status: "pending", deletedAt: null },
        _sum: { amountCents: true },
      }),
    ]);
    return {
      paidCents: paid._sum.amountCents ?? 0,
      pendingCents: pending._sum.amountCents ?? 0,
    };
  },
};
