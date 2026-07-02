import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTenantContext } from "@/server/auth/tenant-context";
import { messages } from "@/messages/pt-br";

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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{messages.dashboard.orgCardTitle}</CardTitle>
            <CardDescription>{ctx.membership.organizationName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">
                {messages.dashboard.orgRoleLabel}:
              </span>{" "}
              {ctx.membership.roleName}
            </p>
            <p>
              <span className="text-muted-foreground">
                {messages.dashboard.orgSlugLabel}:
              </span>{" "}
              {ctx.membership.organizationSlug}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{messages.dashboard.emptyStateTitle}</CardTitle>
            <CardDescription>
              {messages.dashboard.emptyStateBody}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
