import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { PortalDiary } from "./portal-diary";

export const metadata: Metadata = { title: messages.portal.diary.title };

export default function PortalDiarioPage() {
  return <PortalDiary />;
}
