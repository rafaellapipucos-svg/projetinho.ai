import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { PlanBuilder } from "./plan-builder";

export const metadata: Metadata = { title: messages.plans.title };

export default async function PlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlanBuilder planId={id} />;
}
