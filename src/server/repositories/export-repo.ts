import "server-only";
import type { Db } from "@/server/db";

/**
 * Coleta todos os dados de um paciente para exportação LGPD (direito de
 * portabilidade §8). Filtra sempre por organização + paciente.
 */
export const exportRepo = {
  async collect(db: Db, organizationId: string, patientId: string) {
    const patient = await db.patient.findFirst({
      where: { id: patientId, organizationId },
    });
    if (!patient) return null;

    const [
      assessments,
      energy,
      anamnesis,
      exams,
      plans,
      diary,
      documents,
      payments,
    ] = await Promise.all([
      db.assessment.findMany({
        where: { organizationId, patientId },
        include: { values: { include: { measurementType: true } } },
      }),
      db.energyCalculation.findMany({ where: { organizationId, patientId } }),
      db.anamnesisResponse.findMany({ where: { organizationId, patientId } }),
      db.patientExam.findMany({
        where: { organizationId, patientId },
        include: { results: { include: { examType: true } } },
      }),
      db.mealPlan.findMany({
        where: { organizationId, patientId },
        include: {
          days: {
            include: {
              meals: {
                include: {
                  options: { include: { items: true } },
                  mealType: true,
                },
              },
            },
          },
        },
      }),
      db.foodDiaryEntry.findMany({ where: { organizationId, patientId } }),
      db.document.findMany({ where: { organizationId, patientId } }),
      db.payment.findMany({ where: { organizationId, patientId } }),
    ]);

    return {
      patient,
      assessments,
      energyCalculations: energy,
      anamnesisResponses: anamnesis,
      exams,
      mealPlans: plans,
      foodDiary: diary,
      documents,
      payments,
    };
  },
};
