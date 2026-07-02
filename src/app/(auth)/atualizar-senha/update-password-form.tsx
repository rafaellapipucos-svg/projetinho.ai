"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, messages.validation.passwordMin),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: messages.validation.passwordConfirmMismatch,
  });

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

export function UpdatePasswordForm() {
  const router = useRouter();
  const form = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: UpdatePasswordValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) {
      toast.error(authErrorMessage(error));
      return;
    }
    toast.success(messages.auth.passwordUpdated);
    router.push("/dashboard");
    router.refresh();
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
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{messages.auth.passwordConfirmLabel}</FormLabel>
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
          {messages.auth.updatePasswordButton}
        </Button>
      </form>
    </Form>
  );
}
