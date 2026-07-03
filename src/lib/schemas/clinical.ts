import { z } from "zod";
import { messages } from "@/messages/pt-br";

export const patientIdInput = z.object({ patientId: z.uuid() });

export const assessmentCreateInput = z.object({
  patientId: z.uuid(),
  assessedAt: z.iso.date(),
  /** Key do catálogo calculation_methods (kind body_composition) ou null */
  methodKey: z.string().min(1).nullable(),
  conversion: z.enum(["siri", "brozek"]),
  values: z
    .array(
      z.object({
        measurementTypeId: z.uuid(),
        value: z.number().positive().max(500),
      }),
    )
    .min(1)
    .max(40),
  notes: z.string().trim().max(2000).nullable(),
});

export const energyCreateInput = z.object({
  patientId: z.uuid(),
  calculatedAt: z.iso.date(),
  methodKey: z.string().min(1),
  weightKg: z.number().positive().max(400).nullable(),
  heightCm: z.number().positive().max(250).nullable(),
  leanMassKg: z.number().positive().max(200).nullable(),
  activityFactorKey: z.string().min(1),
  adjustmentKcal: z.number().min(-3000).max(3000),
  notes: z.string().trim().max(2000).nullable(),
});

export const anamnesisTemplateSaveInput = z.object({
  id: z.uuid().nullable(),
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(80, messages.validation.nameMax80),
  questions: z
    .array(
      z.object({
        prompt: z.string().trim().min(1, messages.validation.required).max(300),
        type: z.enum(["text", "number", "boolean", "select", "multi", "scale"]),
        options: z.array(z.string().trim().min(1).max(200)).max(20),
        required: z.boolean(),
      }),
    )
    .min(1)
    .max(50),
});

export const anamnesisAnswer = z.union([
  z.string().max(2000),
  z.number(),
  z.boolean(),
  z.array(z.string().max(200)).max(20),
]);

export const anamnesisRespondInput = z.object({
  patientId: z.uuid(),
  templateId: z.uuid(),
  answeredAt: z.iso.date(),
  answers: z
    .array(z.object({ questionId: z.uuid(), answer: anamnesisAnswer }))
    .max(50),
});

export const examCreateInput = z.object({
  patientId: z.uuid(),
  collectedAt: z.iso.date(),
  labName: z.string().trim().max(80).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  results: z
    .array(
      z.object({
        examTypeId: z.uuid(),
        value: z.number().min(0).max(1_000_000),
      }),
    )
    .min(1)
    .max(40),
});

export type AssessmentCreateInput = z.infer<typeof assessmentCreateInput>;
export type EnergyCreateInput = z.infer<typeof energyCreateInput>;
export type AnamnesisTemplateSaveInput = z.infer<
  typeof anamnesisTemplateSaveInput
>;
export type AnamnesisRespondInput = z.infer<typeof anamnesisRespondInput>;
export type ExamCreateInput = z.infer<typeof examCreateInput>;
