"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
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
import { messages } from "@/messages/pt-br";

const onboardingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.orgNameMin)
    .max(80, messages.validation.orgNameMax),
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export function OnboardingForm() {
  const router = useRouter();
  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { name: "" },
  });

  const createOrganization = api.organization.create.useMutation({
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || messages.errors.internal);
    },
  });

  function onSubmit(values: OnboardingValues) {
    createOrganization.mutate(values);
  }

  const isPending =
    createOrganization.isPending || createOrganization.isSuccess;

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
              <FormLabel>{messages.onboarding.orgNameLabel}</FormLabel>
              <FormControl>
                <Input
                  placeholder={messages.onboarding.orgNamePlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : null}
          {messages.onboarding.submitButton}
        </Button>
      </form>
    </Form>
  );
}
