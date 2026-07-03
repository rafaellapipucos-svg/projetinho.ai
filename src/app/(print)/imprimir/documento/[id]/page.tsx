import type { Metadata } from "next";
import { DocumentPrint } from "./document-print";

export const metadata: Metadata = { title: "Documento" };

export default async function ImprimirDocumentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentPrint documentId={id} />;
}
