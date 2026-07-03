import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/server/auth/tenant-context";
import { messages } from "@/messages/pt-br";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: messages.dashboard.title };

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  if (!ctx?.membership) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.dashboard.title}
        </h1>
        <p className="text-muted-foreground">
          {messages.dashboard.welcome(ctx.user.name)}
        </p>
      </div>
      <DashboardView />
    </div>
  );
}
