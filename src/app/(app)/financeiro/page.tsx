import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { FinanceView } from "./finance-view";

export const metadata: Metadata = { title: messages.finance.title };

export default function FinanceiroPage() {
  return <FinanceView />;
}
