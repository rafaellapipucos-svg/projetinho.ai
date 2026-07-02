import { z } from "zod";
import { messages } from "@/messages/pt-br";

/**
 * Schemas compartilhados dos catálogos da clínica — os MESMOS objetos validam
 * o formulário (client) e o input do router (server).
 */

export const idParam = z.object({ id: z.uuid() });

export const mealTypeInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(40, messages.validation.nameMax40),
  defaultTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, messages.validation.timeInvalid)
    .nullable()
    .optional(),
});

export const foodCategoryInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(40, messages.validation.nameMax40),
});

export const examTypeInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(60, messages.validation.nameMax60),
  unit: z.string().trim().max(20).nullable().optional(),
  referenceMin: z.number().nullable().optional(),
  referenceMax: z.number().nullable().optional(),
});

export type MealTypeInput = z.infer<typeof mealTypeInput>;
export type FoodCategoryInput = z.infer<typeof foodCategoryInput>;
export type ExamTypeInput = z.infer<typeof examTypeInput>;
