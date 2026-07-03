import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Salad } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTenantContext } from "@/server/auth/tenant-context";
import { messages } from "@/messages/pt-br";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: messages.onboarding.title };

export default async function OnboardingPage() {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (ctx.membership) redirect("/dashboard");
  if (ctx.patientProfiles.length > 0) redirect("/portal");

  return (
    <main className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center gap-2">
        <Salad className="size-6" aria-hidden />
        <span className="text-lg font-semibold">{messages.app.name}</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{messages.onboarding.title}</CardTitle>
          <CardDescription>
            {messages.onboarding.greeting(ctx.user.name)}{" "}
            {messages.onboarding.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </main>
  );
}
