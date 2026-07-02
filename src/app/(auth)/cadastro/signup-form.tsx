"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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
import { authErrorMessage } from "@/lib/supabase/auth-errors";
import { messages } from "@/messages/pt-br";

const signupSchema = z.object({
  name: z.string().trim().min(2, messages.validation.nameMin),
  email: z.email(messages.validation.emailInvalid),
  password: z.string().min(8, messages.validation.passwordMin),
});

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [emailSent, setEmailSent] = useState(false);
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignupValues) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: values.name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    // Sem sessão = confirmação de e-mail pendente (ou conta já existente —
    // mesma mensagem nos dois casos, para não revelar e-mails cadastrados).
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <MailCheck className="text-muted-foreground size-10" aria-hidden />
        <p className="font-medium">{messages.auth.checkEmailTitle}</p>
        <p className="text-muted-foreground text-sm">
          {messages.auth.checkEmailBody}
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{messages.auth.nameLabel}</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{messages.auth.passwordLabel}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
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
          {messages.auth.signupButton}
        </Button>
      </form>
    </Form>
  );
}
