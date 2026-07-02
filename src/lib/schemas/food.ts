import { z } from "zod";
import { messages } from "@/messages/pt-br";

export const foodSearchInput = z.object({
  term: z.string().trim().min(2).max(60),
});

export const foodNutrientValue = z.object({
  key: z.string().min(1),
  amount: z.number().min(0).max(100_000),
});

export const foodCreateInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(80, messages.validation.nameMax80),
  foodCategoryId: z.uuid().nullable(),
  baseUnit: z.enum(["g", "ml"]),
  nutrients: z.array(foodNutrientValue).max(60),
});

export const foodUpdateInput = foodCreateInput.extend({ id: z.uuid() });

export const foodMeasureCreateInput = z.object({
  foodId: z.uuid(),
  name: z
    .string()
    .trim()
    .min(1, messages.validation.required)
    .max(40, messages.validation.nameMax40),
  gramWeight: z.number().positive().max(5000),
});

export type FoodCreateInput = z.infer<typeof foodCreateInput>;
export type FoodUpdateInput = z.infer<typeof foodUpdateInput>;
