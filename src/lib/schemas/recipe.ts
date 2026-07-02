import { z } from "zod";
import { messages } from "@/messages/pt-br";

export const recipeIngredientInput = z
  .object({
    foodId: z.uuid(),
    quantity: z.number().positive().max(10_000),
    measurementUnitId: z.uuid().nullable(),
    foodMeasureId: z.uuid().nullable(),
  })
  .refine(
    (value) => value.measurementUnitId !== null || value.foodMeasureId !== null,
    {
      message: messages.validation.required,
      path: ["measurementUnitId"],
    },
  );

export const recipeInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(80, messages.validation.nameMax80),
  servings: z.number().positive().max(500),
  yieldGrams: z.number().positive().max(100_000).nullable(),
  instructions: z.string().trim().max(4000).nullable(),
  ingredients: z.array(recipeIngredientInput).min(1).max(100),
});

export const recipeUpdateInput = recipeInput.extend({ id: z.uuid() });

export type RecipeInput = z.infer<typeof recipeInput>;
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInput>;
