import { z } from "zod";
import { messages } from "@/messages/pt-br";

/**
 * Patches do autosave do builder (§7.2 — outbox). Os ids de entidades novas
 * são gerados no CLIENTE (uuid) e adotados pelo servidor após validar a
 * cadeia de pertencimento até o plano.
 */

const sortOrder = z.number().int().min(0).max(10_000);
const weekdays = z.array(z.number().int().min(0).max(6)).max(7);
const quantity = z.number().positive().max(10_000);

export const planCreateInput = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, messages.validation.nameMin2)
      .max(80, messages.validation.nameMax80),
    patientId: z.uuid().nullable(),
    isTemplate: z.boolean(),
    fromTemplateId: z.uuid().nullable(),
  })
  .refine((value) => value.isTemplate === (value.patientId === null), {
    message: messages.plans.templateXorPatient,
    path: ["patientId"],
  });

export const planChange = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("plan_update"),
    name: z.string().trim().min(2).max(80).optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    startDate: z.iso.date().nullable().optional(),
    endDate: z.iso.date().nullable().optional(),
  }),
  z.object({
    type: z.literal("day_add"),
    id: z.uuid(),
    name: z.string().trim().min(1).max(40),
    weekdays,
    sortOrder,
  }),
  z.object({
    type: z.literal("day_update"),
    id: z.uuid(),
    name: z.string().trim().min(1).max(40).optional(),
    weekdays: weekdays.optional(),
    sortOrder: sortOrder.optional(),
  }),
  z.object({ type: z.literal("day_remove"), id: z.uuid() }),
  z.object({
    type: z.literal("meal_add"),
    id: z.uuid(),
    dayId: z.uuid(),
    mealTypeId: z.uuid(),
    scheduledTime: z.string().nullable(),
    sortOrder,
  }),
  z.object({
    type: z.literal("meal_update"),
    id: z.uuid(),
    mealTypeId: z.uuid().optional(),
    customName: z.string().trim().max(40).nullable().optional(),
    scheduledTime: z.string().nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    sortOrder: sortOrder.optional(),
  }),
  z.object({ type: z.literal("meal_remove"), id: z.uuid() }),
  z.object({
    type: z.literal("meals_reorder"),
    dayId: z.uuid(),
    mealIds: z.array(z.uuid()).max(50),
  }),
  z.object({
    type: z.literal("option_add"),
    id: z.uuid(),
    mealId: z.uuid(),
    name: z.string().trim().min(1).max(40),
    sortOrder,
  }),
  z.object({
    type: z.literal("option_update"),
    id: z.uuid(),
    name: z.string().trim().min(1).max(40).optional(),
    sortOrder: sortOrder.optional(),
  }),
  z.object({ type: z.literal("option_remove"), id: z.uuid() }),
  z
    .object({
      type: z.literal("item_add"),
      id: z.uuid(),
      optionId: z.uuid(),
      foodId: z.uuid().nullable(),
      recipeId: z.uuid().nullable(),
      quantity,
      measurementUnitId: z.uuid().nullable(),
      foodMeasureId: z.uuid().nullable(),
      sortOrder,
      notes: z.string().trim().max(500).nullable(),
    })
    .refine((value) => (value.foodId === null) !== (value.recipeId === null), {
      message: messages.plans.itemFoodXorRecipe,
      path: ["foodId"],
    })
    .refine(
      (value) =>
        value.foodId === null ||
        value.measurementUnitId !== null ||
        value.foodMeasureId !== null,
      { message: messages.validation.required, path: ["measurementUnitId"] },
    ),
  z.object({
    type: z.literal("item_update"),
    id: z.uuid(),
    optionId: z.uuid().optional(),
    quantity: quantity.optional(),
    measurementUnitId: z.uuid().nullable().optional(),
    foodMeasureId: z.uuid().nullable().optional(),
    sortOrder: sortOrder.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  }),
  z.object({ type: z.literal("item_remove"), id: z.uuid() }),
  z.object({
    type: z.literal("items_reorder"),
    optionId: z.uuid(),
    itemIds: z.array(z.uuid()).max(100),
  }),
  z.object({
    type: z.literal("target_set"),
    nutrientId: z.uuid(),
    min: z.number().min(0).max(1_000_000).nullable(),
    max: z.number().min(0).max(1_000_000).nullable(),
  }),
  z.object({ type: z.literal("target_remove"), nutrientId: z.uuid() }),
]);

export const planApplyChangesInput = z.object({
  planId: z.uuid(),
  version: z.number().int().positive(),
  changes: z.array(planChange).min(1).max(200),
});

export const planListByPatientInput = z.object({ patientId: z.uuid() });

export const planSaveAsTemplateInput = z.object({
  planId: z.uuid(),
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(80, messages.validation.nameMax80),
});

export type PlanChange = z.infer<typeof planChange>;
export type PlanCreateInput = z.infer<typeof planCreateInput>;
export type PlanApplyChangesInput = z.infer<typeof planApplyChangesInput>;
