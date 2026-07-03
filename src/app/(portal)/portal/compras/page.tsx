import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { PortalShopping } from "./portal-shopping";

export const metadata: Metadata = { title: messages.portal.shopping.title };

export default function PortalComprasPage() {
  return <PortalShopping />;
}
