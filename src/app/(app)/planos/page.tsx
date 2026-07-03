import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { TemplatesPage } from "./templates-page";

export const metadata: Metadata = { title: messages.plans.templatesTitle };

export default function PlanosPage() {
  return <TemplatesPage />;
}
