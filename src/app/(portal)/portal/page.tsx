import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { PortalPlan } from "./portal-plan";

export const metadata: Metadata = { title: messages.portal.plan.title };

export default function PortalHomePage() {
  return <PortalPlan />;
}
