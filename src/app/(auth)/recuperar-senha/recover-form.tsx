"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { messages } from "@/messages/pt-br";

const recoverSchema = z.object({
  email: z.email(messages.validation.emailInvalid),
});

type RecoverValues = z.infer<typeof recoverSchema>;

export function RecoverForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<RecoverValues>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RecoverValues) {
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/atualizar-senha`,
    });
    // Resposta idêntica com ou sem conta: não revela e-mails cadastrados.
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck className="text-muted-foreground size-10" aria-hidden />
        <p className="font-medium">{messages.auth.recoverSentTitle}</p>
        <p className="text-muted-foreground text-sm">
          {messages.auth.recoverSentBody}
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{messages.auth.emailLabel}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {messages.auth.recoverButton}
        </Button>
      </form>
    </Form>
  );
}
