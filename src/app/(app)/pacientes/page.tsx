import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { PatientsPage } from "./patients-page";

export const metadata: Metadata = { title: messages.patients.title };

export default function PacientesPage() {
  return <PatientsPage />;
}
