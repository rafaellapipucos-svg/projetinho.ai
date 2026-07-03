import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { PlanPrint } from "./plan-print";

export const metadata: Metadata = { title: messages.planPrint.title };

export default async function ImprimirPlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlanPrint planId={id} />;
}
