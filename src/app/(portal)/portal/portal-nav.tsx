"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotebookPen, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/pt-br";

const items = [
  { href: "/portal", label: messages.portal.nav.plan, icon: UtensilsCrossed },
  {
    href: "/portal/diario",
    label: messages.portal.nav.diary,
    icon: NotebookPen,
  },
  {
    href: "/portal/compras",
    label: messages.portal.nav.shopping,
    icon: ShoppingBasket,
  },
] as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background fixed inset-x-0 bottom-0 z-40 border-t">
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {items.map((item) => {
          const active =
            item.href === "/portal"
              ? pathname === "/portal"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
