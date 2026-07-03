import { z } from "zod";
import { messages } from "@/messages/pt-br";

export const equivalenceItemInput = z
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

export const equivalenceGroupInput = z.object({
  id: z.uuid().nullable(),
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(80, messages.validation.nameMax80),
  items: z.array(equivalenceItemInput).max(50),
});

export type EquivalenceGroupInput = z.infer<typeof equivalenceGroupInput>;
