import "server-only";
import { prisma } from "@/server/db";
import { dashboardRepo } from "@/server/repositories/dashboard-repo";
import { financeRepo } from "@/server/repositories/finance-repo";

export const dashboardService = {
  async summary(organizationId: string) {
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [counts, upcoming, totals, revenue] = await Promise.all([
      dashboardRepo.counts(prisma, organizationId),
      dashboardRepo.upcomingAppointments(
        prisma,
        organizationId,
        now,
        weekAhead,
      ),
      financeRepo.totals(prisma, organizationId),
      financeRepo.revenueByMonth(prisma, organizationId, sixMonthsAgo),
    ]);

    return {
      patientCount: counts.patients,
      activePlanCount: counts.activePlans,
      paidReais: totals.paidCents / 100,
      pendingReais: totals.pendingCents / 100,
      upcoming: upcoming.map((appointment) => ({
        id: appointment.id,
        patientName: appointment.patient.name,
        startsAt: appointment.startsAt,
      })),
      revenueByMonth: revenue.map((row) => ({
        month: row.month,
        reais: Number(row.total) / 100,
      })),
    };
  },
};
