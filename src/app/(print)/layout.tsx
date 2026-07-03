import { redirect } from "next/navigation";
import { getTenantContext } from "@/server/auth/tenant-context";

/** Layout de impressão: sem chrome (sidebar/header), só o conteúdo. */
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership) redirect("/onboarding");
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-black">{children}</div>
  );
}
