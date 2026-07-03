import { z } from "zod";
import { messages } from "@/messages/pt-br";

export const diaryAddInput = z.object({
  entryAt: z.iso.datetime({ offset: true }),
  mealTypeId: z.uuid().nullable(),
  description: z.string().trim().min(1, messages.validation.required).max(1000),
  photoPath: z.string().min(1).max(500).nullable(),
});

export const claimInviteInput = z.object({ token: z.uuid() });

export type DiaryAddInput = z.infer<typeof diaryAddInput>;
