import { z } from "zod";
import { messages } from "@/messages/pt-br";

export const paymentInput = z.object({
  patientId: z.uuid(),
  appointmentId: z.uuid().nullable(),
  description: z.string().trim().min(2, messages.validation.nameMin2).max(120),
  amountReais: z.number().min(0).max(1_000_000),
  method: z.string().trim().max(40).nullable(),
  status: z.enum(["pending", "paid", "cancelled"]),
  dueAt: z.iso.date().nullable(),
  paidAt: z.iso.date().nullable(),
});

export const paymentUpdateInput = paymentInput.extend({ id: z.uuid() });

export const paymentListInput = z.object({
  patientId: z.uuid().optional(),
  status: z.enum(["pending", "paid", "cancelled"]).optional(),
});

export type PaymentInput = z.infer<typeof paymentInput>;
