import { redirect } from "next/navigation";
import { getTenantContext } from "@/server/auth/tenant-context";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { UserMenu } from "@/components/app-shell/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership) {
    // Conta de paciente vai para o portal; sem vínculo algum, cria clínica.
    redirect(ctx.patientProfiles.length > 0 ? "/portal" : "/onboarding");
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        organizationName={ctx.membership.organizationName}
        roleName={ctx.membership.roleName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background flex h-14 items-center justify-end border-b px-4">
          <UserMenu name={ctx.user.name} email={ctx.user.email} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
