import "server-only";
import { prisma } from "@/server/db";
import { clinicalRepo } from "@/server/repositories/clinical-repo";
import { patientRepo } from "@/server/repositories/patient-repo";
import { catalogRepo } from "@/server/repositories/catalog-repo";
import { NotFoundError } from "@/server/errors";
import { DomainError } from "@/domain/shared/errors";
import {
  computeBodyFat,
  fatMassKg,
  leanMassKg,
} from "@/domain/anthropometry/methods";
import {
  bmi,
  bmiClassification,
  idealWeightRange,
  waistHipRatio,
} from "@/domain/anthropometry/indices";
import { computeGet, computeTmb } from "@/domain/energy/methods";
import { round } from "@/domain/shared/round";
import { ageFrom } from "@/lib/date";
import { messages } from "@/messages/pt-br";
import type {
  AnamnesisRespondInput,
  AnamnesisTemplateSaveInput,
  AssessmentCreateInput,
  EnergyCreateInput,
  ExamCreateInput,
} from "@/lib/schemas/clinical";

async function requirePatient(organizationId: string, patientId: string) {
  const patient = await patientRepo.findByIdForOrg(
    prisma,
    organizationId,
    patientId,
  );
  if (!patient) throw new NotFoundError(messages.errors.notFound);
  return patient;
}

/** Resultados calculados a partir dos valores medidos (snapshot §3.3). */
interface AssessmentResults {
  bmi?: number;
  bmiClassification?: string;
  waistHipRatio?: number;
  density?: number;
  bodyFatPct?: number;
  fatMassKg?: number;
  leanMassKg?: number;
  idealWeightMinKg?: number;
  idealWeightMaxKg?: number;
  conversion?: string;
}

export const clinicalService = {
  assessments: {
    async list(organizationId: string, patientId: string) {
      await requirePatient(organizationId, patientId);
      const assessments = await clinicalRepo.listAssessments(
        prisma,
        organizationId,
        patientId,
      );
      return assessments.map((assessment) => ({
        id: assessment.id,
        assessedAt: assessment.assessedAt,
        methodName: assessment.calculationMethod?.name ?? null,
        results: assessment.results as AssessmentResults,
        notes: assessment.notes,
        values: assessment.values.map((value) => ({
          key: value.measurementType.key,
          name: value.measurementType.name,
          unit: value.measurementType.unit,
          group: value.measurementType.group,
          value: Number(value.value),
        })),
      }));
    },

    async create(
      organizationId: string,
      userId: string,
      input: AssessmentCreateInput,
    ) {
      const patient = await requirePatient(organizationId, input.patientId);

      const types = await catalogRepo.listMeasurementTypes(prisma);
      const typeById = new Map(types.map((type) => [type.id, type]));
      const valueByKey = new Map<string, number>();
      for (const entry of input.values) {
        const type = typeById.get(entry.measurementTypeId);
        if (!type) throw new NotFoundError(messages.errors.notFound);
        valueByKey.set(type.key, entry.value);
      }

      const results: AssessmentResults = {};
      const weight = valueByKey.get("weight");
      const height = valueByKey.get("height");
      if (weight !== undefined && height !== undefined) {
        const bmiValue = bmi(weight, height);
        results.bmi = round(bmiValue, 2);
        results.bmiClassification = bmiClassification(bmiValue);
        const ideal = idealWeightRange(height);
        results.idealWeightMinKg = round(ideal.minKg, 1);
        results.idealWeightMaxKg = round(ideal.maxKg, 1);
      }
      const waist = valueByKey.get("c_waist");
      const hip = valueByKey.get("c_hip");
      if (waist !== undefined && hip !== undefined) {
        results.waistHipRatio = round(waistHipRatio(waist, hip), 2);
      }

      let calculationMethodId: string | null = null;
      if (input.methodKey) {
        const method = await clinicalRepo.findCalculationMethodByKey(
          prisma,
          input.methodKey,
        );
        if (!method || method.kind !== "body_composition") {
          throw new NotFoundError(messages.errors.notFound);
        }
        if (!patient.sex || !patient.birthDate) {
          throw new DomainError(messages.clinical.assessments.needsSexAndBirth);
        }
        calculationMethodId = method.id;
        const skinfoldsMm: Record<string, number> = {};
        for (const [key, value] of valueByKey.entries()) {
          if (key.startsWith("sf_")) skinfoldsMm[key] = value;
        }
        // Coeficientes vêm do CATÁLOGO (params) — o código só sabe calcular
        const bodyFat = computeBodyFat(
          input.methodKey,
          {
            sex: patient.sex,
            ageYears: ageFrom(patient.birthDate),
            skinfoldsMm,
          },
          input.conversion,
          method.params,
        );
        results.density = round(bodyFat.density, 4);
        results.bodyFatPct = round(bodyFat.bodyFatPct, 2);
        results.conversion = input.conversion;
        if (weight !== undefined) {
          results.fatMassKg = round(fatMassKg(weight, bodyFat.bodyFatPct), 2);
          results.leanMassKg = round(leanMassKg(weight, bodyFat.bodyFatPct), 2);
        }
      }

      const assessment = await clinicalRepo.createAssessment(
        prisma,
        {
          organizationId,
          patientId: input.patientId,
          assessedAt: new Date(`${input.assessedAt}T00:00:00Z`),
          calculationMethodId,
          results,
          notes: input.notes,
          createdBy: userId,
        },
        input.values,
      );
      return { id: assessment.id, results };
    },

    async remove(organizationId: string, id: string) {
      const result = await clinicalRepo.softDeleteAssessment(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  energy: {
    async list(organizationId: string, patientId: string) {
      await requirePatient(organizationId, patientId);
      const calculations = await clinicalRepo.listEnergy(
        prisma,
        organizationId,
        patientId,
      );
      return calculations.map((calculation) => ({
        id: calculation.id,
        calculatedAt: calculation.calculatedAt,
        methodName: calculation.calculationMethod.name,
        activityFactor: Number(calculation.activityFactor),
        tmbKcal: Number(calculation.tmbKcal),
        getKcal: Number(calculation.getKcal),
        adjustmentKcal: Number(calculation.adjustmentKcal),
        finalKcal: Number(calculation.finalKcal),
        notes: calculation.notes,
      }));
    },

    async create(
      organizationId: string,
      userId: string,
      input: EnergyCreateInput,
    ) {
      const patient = await requirePatient(organizationId, input.patientId);
      if (!patient.sex || !patient.birthDate) {
        throw new DomainError(messages.clinical.energy.needsSexAndBirth);
      }

      const method = await clinicalRepo.findCalculationMethodByKey(
        prisma,
        input.methodKey,
      );
      if (!method || method.kind !== "energy_expenditure") {
        throw new NotFoundError(messages.errors.notFound);
      }
      const factorMethod = await clinicalRepo.findCalculationMethodByKey(
        prisma,
        input.activityFactorKey,
      );
      if (!factorMethod || factorMethod.kind !== "activity_factor") {
        throw new NotFoundError(messages.errors.notFound);
      }
      const factor = (factorMethod.params as { factor?: number }).factor;
      if (typeof factor !== "number") {
        throw new DomainError(messages.errors.internal);
      }

      const inputs = {
        sex: patient.sex,
        ageYears: ageFrom(patient.birthDate),
        ...(input.weightKg !== null ? { weightKg: input.weightKg } : {}),
        ...(input.heightCm !== null ? { heightCm: input.heightCm } : {}),
        ...(input.leanMassKg !== null ? { leanMassKg: input.leanMassKg } : {}),
      };

      const tmb = computeTmb(input.methodKey, inputs, method.params);
      const get = computeGet(tmb, factor);
      const final = get + input.adjustmentKcal;

      const calculation = await clinicalRepo.createEnergy(prisma, {
        organizationId,
        patientId: input.patientId,
        calculatedAt: new Date(`${input.calculatedAt}T00:00:00Z`),
        calculationMethodId: method.id,
        inputs: { ...inputs, activityFactorKey: input.activityFactorKey },
        activityFactor: factor,
        tmbKcal: round(tmb, 2),
        getKcal: round(get, 2),
        adjustmentKcal: input.adjustmentKcal,
        finalKcal: round(final, 2),
        notes: input.notes,
        createdBy: userId,
      });
      return { id: calculation.id, finalKcal: round(final, 2) };
    },

    async remove(organizationId: string, id: string) {
      const result = await clinicalRepo.softDeleteEnergy(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  anamnesis: {
    listTemplates(organizationId: string) {
      return clinicalRepo.listAnamnesisTemplates(prisma, organizationId);
    },

    async saveTemplate(
      organizationId: string,
      input: AnamnesisTemplateSaveInput,
    ) {
      return prisma.$transaction(async (tx) => {
        let templateId = input.id;
        if (templateId) {
          const updated = await clinicalRepo.updateTemplateName(
            tx,
            organizationId,
            templateId,
            input.name,
          );
          if (updated.count === 0)
            throw new NotFoundError(messages.errors.notFound);
        } else {
          const template = await clinicalRepo.createTemplate(
            tx,
            organizationId,
            input.name,
          );
          templateId = template.id;
        }
        await clinicalRepo.replaceTemplateQuestions(
          tx,
          templateId,
          input.questions.map((question, index) => ({
            ...question,
            sortOrder: index,
          })),
        );
        return { id: templateId };
      });
    },

    async deactivateTemplate(organizationId: string, id: string) {
      const result = await clinicalRepo.deactivateTemplate(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },

    async listResponses(organizationId: string, patientId: string) {
      await requirePatient(organizationId, patientId);
      const responses = await clinicalRepo.listResponses(
        prisma,
        organizationId,
        patientId,
      );
      return responses.map((response) => ({
        id: response.id,
        answeredAt: response.answeredAt,
        templateName: response.template.name,
        answers: response.answers as Array<{
          questionId: string;
          prompt: string;
          type: string;
          answer: unknown;
        }>,
      }));
    },

    async respond(
      organizationId: string,
      userId: string,
      input: AnamnesisRespondInput,
    ) {
      await requirePatient(organizationId, input.patientId);
      const template = await clinicalRepo.findTemplateVisible(
        prisma,
        organizationId,
        input.templateId,
      );
      if (!template) throw new NotFoundError(messages.errors.notFound);

      const questionById = new Map(
        template.questions.map((question) => [question.id, question]),
      );
      const answerByQuestion = new Map(
        input.answers.map((answer) => [answer.questionId, answer.answer]),
      );
      for (const question of template.questions) {
        if (question.required && !answerByQuestion.has(question.id)) {
          throw new DomainError(
            `${messages.clinical.anamnesis.requiredMissing}: ${question.prompt}`,
          );
        }
      }

      // Snapshot §3.3: as respostas carregam CÓPIA do texto das perguntas
      const answers = input.answers
        .filter((answer) => questionById.has(answer.questionId))
        .map((answer) => {
          const question = questionById.get(answer.questionId);
          return {
            questionId: answer.questionId,
            prompt: question?.prompt ?? "",
            type: question?.type ?? "text",
            answer: answer.answer,
          };
        });

      const response = await clinicalRepo.createResponse(prisma, {
        organizationId,
        patientId: input.patientId,
        templateId: input.templateId,
        answeredAt: new Date(`${input.answeredAt}T00:00:00Z`),
        answers,
        createdBy: userId,
      });
      return { id: response.id };
    },

    async removeResponse(organizationId: string, id: string) {
      const result = await clinicalRepo.softDeleteResponse(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },

  exams: {
    async list(organizationId: string, patientId: string) {
      await requirePatient(organizationId, patientId);
      const exams = await clinicalRepo.listExams(
        prisma,
        organizationId,
        patientId,
      );
      return exams.map((exam) => ({
        id: exam.id,
        collectedAt: exam.collectedAt,
        labName: exam.labName,
        notes: exam.notes,
        results: exam.results.map((result) => ({
          examTypeId: result.examTypeId,
          name: result.examType.name,
          unit: result.examType.unit,
          referenceRange: result.examType.referenceRange as {
            min?: number;
            max?: number;
          },
          value: Number(result.value),
        })),
      }));
    },

    async create(
      organizationId: string,
      userId: string,
      input: ExamCreateInput,
    ) {
      await requirePatient(organizationId, input.patientId);
      const types = await clinicalRepo.findExamTypesVisibleByIds(
        prisma,
        organizationId,
        input.results.map((result) => result.examTypeId),
      );
      if (
        types.length !== new Set(input.results.map((r) => r.examTypeId)).size
      ) {
        throw new NotFoundError(messages.errors.notFound);
      }
      const exam = await clinicalRepo.createExam(
        prisma,
        {
          organizationId,
          patientId: input.patientId,
          collectedAt: new Date(`${input.collectedAt}T00:00:00Z`),
          labName: input.labName,
          notes: input.notes,
          createdBy: userId,
        },
        input.results,
      );
      return { id: exam.id };
    },

    async remove(organizationId: string, id: string) {
      const result = await clinicalRepo.softDeleteExam(
        prisma,
        organizationId,
        id,
      );
      if (result.count === 0) throw new NotFoundError(messages.errors.notFound);
    },
  },
};
