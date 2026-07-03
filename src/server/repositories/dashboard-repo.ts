import "server-only";
import type { Db } from "@/server/db";

export const dashboardRepo = {
  async counts(db: Db, organizationId: string) {
    const [patients, activePlans] = await Promise.all([
      db.patient.count({ where: { organizationId, deletedAt: null } }),
      db.mealPlan.count({
        where: { organizationId, status: "active", isTemplate: false },
      }),
    ]);
    return { patients, activePlans };
  },

  upcomingAppointments(db: Db, organizationId: string, from: Date, to: Date) {
    return db.appointment.findMany({
      where: {
        organizationId,
        startsAt: { gte: from, lt: to },
        status: { in: ["scheduled", "confirmed"] },
      },
      orderBy: { startsAt: "asc" },
      take: 10,
      include: { patient: { select: { name: true } } },
    });
  },
};
