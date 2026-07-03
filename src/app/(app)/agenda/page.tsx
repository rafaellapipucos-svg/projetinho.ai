import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { AgendaView } from "./agenda-view";

export const metadata: Metadata = { title: messages.agenda.title };

export default function AgendaPage() {
  return <AgendaView />;
}
