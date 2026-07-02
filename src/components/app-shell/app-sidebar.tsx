"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Salad } from "lucide-react";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/pt-br";

const navItems = [
  { href: "/dashboard", label: messages.nav.dashboard, icon: LayoutDashboard },
] as const;

export function AppSidebar({
  organizationName,
  roleName,
}: {
  organizationName: string;
  roleName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Salad className="size-5" aria-hidden />
        <span className="font-semibold">{messages.app.name}</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <p className="truncate text-sm font-medium">{organizationName}</p>
        <p className="text-muted-foreground truncate text-xs">{roleName}</p>
      </div>
    </aside>
  );
}
