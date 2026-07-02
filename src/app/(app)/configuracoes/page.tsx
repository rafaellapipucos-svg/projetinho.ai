import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { ConfigTabs } from "./config-tabs";

export const metadata: Metadata = { title: messages.config.title };

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.config.title}
        </h1>
        <p className="text-muted-foreground">{messages.config.subtitle}</p>
      </div>
      <ConfigTabs />
    </div>
  );
}
