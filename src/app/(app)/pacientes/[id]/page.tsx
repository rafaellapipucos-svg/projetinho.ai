import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { PatientDetail } from "./patient-detail";

export const metadata: Metadata = { title: messages.patients.title };

export default async function PacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PatientDetail patientId={id} />;
}
