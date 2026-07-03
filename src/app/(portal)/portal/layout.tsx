import { redirect } from "next/navigation";
import { getTenantContext } from "@/server/auth/tenant-context";
import { UserMenu } from "@/components/app-shell/user-menu";
import { messages } from "@/messages/pt-br";
import { PortalNav } from "./portal-nav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  const profile = ctx.patientProfiles[0];
  if (!profile) redirect(ctx.membership ? "/dashboard" : "/onboarding");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
      <header className="bg-background sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{profile.patientName}</p>
          <p className="text-muted-foreground truncate text-xs">
            {messages.portal.clinicPrefix} {profile.organizationName}
          </p>
        </div>
        <UserMenu name={ctx.user.name} email={ctx.user.email} />
      </header>
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>
      <PortalNav />
    </div>
  );
}
