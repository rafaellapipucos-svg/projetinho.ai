import { z } from "zod";
import { messages } from "@/messages/pt-br";

// ── Serviços ──────────────────────────────────────────────────────────────────
export const serviceInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(60, messages.validation.nameMax60),
  durationMinutes: z.number().int().min(5).max(600),
  priceCents: z.number().int().min(0).max(100_000_000),
});
export const serviceUpdateInput = serviceInput.extend({ id: z.uuid() });

// ── Agenda ────────────────────────────────────────────────────────────────────
export const appointmentInput = z.object({
  patientId: z.uuid(),
  serviceId: z.uuid().nullable(),
  startsAt: z.iso.datetime({ offset: true }),
  durationMinutes: z.number().int().min(5).max(600),
  notes: z.string().trim().max(2000).nullable(),
});
export const appointmentUpdateInput = appointmentInput.extend({ id: z.uuid() });

export const appointmentStatusInput = z.object({
  id: z.uuid(),
  status: z.enum([
    "scheduled",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ]),
});

export const appointmentRangeInput = z.object({
  from: z.iso.datetime({ offset: true }),
  to: z.iso.datetime({ offset: true }),
});

// ── Documentos ────────────────────────────────────────────────────────────────
export const documentTemplateInput = z.object({
  id: z.uuid().nullable(),
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(80, messages.validation.nameMax80),
  body: z.string().trim().min(1, messages.validation.required).max(20_000),
});

export const documentIssueInput = z.object({
  patientId: z.uuid(),
  templateId: z.uuid().nullable(),
  title: z.string().trim().min(2, messages.validation.nameMin2).max(120),
  body: z.string().trim().min(1, messages.validation.required).max(20_000),
  issuedAt: z.iso.date(),
});

// ── Mensagens (chat) ──────────────────────────────────────────────────────────
export const messageSendInput = z.object({
  patientId: z.uuid(),
  body: z.string().trim().min(1, messages.validation.required).max(2000),
});

export type ServiceInput = z.infer<typeof serviceInput>;
export type AppointmentInput = z.infer<typeof appointmentInput>;
export type DocumentTemplateInput = z.infer<typeof documentTemplateInput>;
export type DocumentIssueInput = z.infer<typeof documentIssueInput>;
