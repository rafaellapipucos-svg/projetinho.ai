import "server-only";
import type { Db } from "@/server/db";

/** Ferramentas clínicas — sempre filtradas por organização (tenancy §3.4). */
export const clinicalRepo = {
  // ── Avaliações antropométricas ─────────────────────────────────────────────
  listAssessments(db: Db, organizationId: string, patientId: string) {
    return db.assessment.findMany({
      where: { organizationId, patientId, deletedAt: null },
      orderBy: { assessedAt: "asc" },
      include: {
        calculationMethod: { select: { key: true, name: true } },
        values: { include: { measurementType: true } },
      },
    });
  },

  createAssessment(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      assessedAt: Date;
      calculationMethodId: string | null;
      results: object;
      notes: string | null;
      createdBy: string;
    },
    values: Array<{ measurementTypeId: string; value: number }>,
  ) {
    return db.assessment.create({
      data: { ...data, values: { create: values } },
    });
  },

  softDeleteAssessment(db: Db, organizationId: string, id: string) {
    return db.assessment.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  // ── Gasto energético ───────────────────────────────────────────────────────
  listEnergy(db: Db, organizationId: string, patientId: string) {
    return db.energyCalculation.findMany({
      where: { organizationId, patientId, deletedAt: null },
      orderBy: { calculatedAt: "desc" },
      include: { calculationMethod: { select: { key: true, name: true } } },
    });
  },

  createEnergy(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      calculatedAt: Date;
      calculationMethodId: string;
      inputs: object;
      activityFactor: number;
      tmbKcal: number;
      getKcal: number;
      adjustmentKcal: number;
      finalKcal: number;
      notes: string | null;
      createdBy: string;
    },
  ) {
    return db.energyCalculation.create({ data });
  },

  softDeleteEnergy(db: Db, organizationId: string, id: string) {
    return db.energyCalculation.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  // ── Anamnese ───────────────────────────────────────────────────────────────
  listAnamnesisTemplates(db: Db, organizationId: string) {
    return db.anamnesisTemplate.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
  },

  findTemplateVisible(db: Db, organizationId: string, id: string) {
    return db.anamnesisTemplate.findFirst({
      where: {
        id,
        isActive: true,
        OR: [{ organizationId: null }, { organizationId }],
      },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });
  },

  createTemplate(db: Db, organizationId: string, name: string) {
    return db.anamnesisTemplate.create({ data: { organizationId, name } });
  },

  updateTemplateName(db: Db, organizationId: string, id: string, name: string) {
    return db.anamnesisTemplate.updateMany({
      where: { id, organizationId },
      data: { name },
    });
  },

  async replaceTemplateQuestions(
    db: Db,
    templateId: string,
    questions: Array<{
      prompt: string;
      type: "text" | "number" | "boolean" | "select" | "multi" | "scale";
      options: string[];
      required: boolean;
      sortOrder: number;
    }>,
  ) {
    await db.anamnesisQuestion.deleteMany({ where: { templateId } });
    return db.anamnesisQuestion.createMany({
      data: questions.map((question) => ({ templateId, ...question })),
    });
  },

  deactivateTemplate(db: Db, organizationId: string, id: string) {
    return db.anamnesisTemplate.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    });
  },

  listResponses(db: Db, organizationId: string, patientId: string) {
    return db.anamnesisResponse.findMany({
      where: { organizationId, patientId, deletedAt: null },
      orderBy: { answeredAt: "desc" },
      include: { template: { select: { name: true } } },
    });
  },

  createResponse(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      templateId: string;
      answeredAt: Date;
      answers: object;
      createdBy: string;
    },
  ) {
    return db.anamnesisResponse.create({ data });
  },

  softDeleteResponse(db: Db, organizationId: string, id: string) {
    return db.anamnesisResponse.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  // ── Exames laboratoriais ───────────────────────────────────────────────────
  listExams(db: Db, organizationId: string, patientId: string) {
    return db.patientExam.findMany({
      where: { organizationId, patientId, deletedAt: null },
      orderBy: { collectedAt: "desc" },
      include: { results: { include: { examType: true } } },
    });
  },

  createExam(
    db: Db,
    data: {
      organizationId: string;
      patientId: string;
      collectedAt: Date;
      labName: string | null;
      notes: string | null;
      createdBy: string;
    },
    results: Array<{ examTypeId: string; value: number }>,
  ) {
    return db.patientExam.create({
      data: { ...data, results: { create: results } },
    });
  },

  softDeleteExam(db: Db, organizationId: string, id: string) {
    return db.patientExam.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  },

  findCalculationMethodByKey(db: Db, key: string) {
    return db.calculationMethod.findUnique({ where: { key } });
  },

  findExamTypesVisibleByIds(db: Db, organizationId: string, ids: string[]) {
    return db.examType.findMany({
      where: {
        id: { in: ids },
        OR: [{ organizationId: null }, { organizationId }],
      },
    });
  },
};
