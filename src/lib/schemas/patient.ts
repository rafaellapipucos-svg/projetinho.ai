import { z } from "zod";
import { messages } from "@/messages/pt-br";

export const patientInput = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(80, messages.validation.nameMax80),
  birthDate: z.iso.date().nullable(),
  sex: z.enum(["male", "female"]).nullable(),
  genderIdentity: z.string().trim().max(40).nullable(),
  cpf: z.string().trim().max(14).nullable(),
  email: z.email(messages.validation.emailInvalid).nullable(),
  phone: z.string().trim().max(20).nullable(),
  occupation: z.string().trim().max(60).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  /** LGPD: consentimento de tratamento de dados registrado pelo profissional */
  consent: z.boolean(),
});

export const patientUpdateInput = patientInput.extend({ id: z.uuid() });

export const patientListInput = z.object({
  term: z.string().trim().max(60).optional(),
});

export const attachmentRegisterInput = z.object({
  patientId: z.uuid(),
  fileName: z.string().trim().min(1).max(200),
  storagePath: z.string().min(1).max(500),
  mimeType: z.string().max(100),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
});

export type PatientInput = z.infer<typeof patientInput>;
export type PatientUpdateInput = z.infer<typeof patientUpdateInput>;
