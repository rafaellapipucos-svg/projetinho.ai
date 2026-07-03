"use client";

import { useEffect } from "react";
import { Loader2, Printer } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date";
import { messages } from "@/messages/pt-br";

export function DocumentPrint({ documentId }: { documentId: string }) {
  const document = api.operations.documents.byId.useQuery({ id: documentId });
  const org = api.organization.current.useQuery();

  useEffect(() => {
    if (document.data) window.document.title = document.data.title;
  }, [document.data]);

  if (document.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }
  const data = document.data;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 1.5cm; } }`}</style>

      <div className="no-print flex justify-end">
        <Button onClick={() => window.print()}>
          <Printer className="size-4" aria-hidden />
          {messages.planPrint.printButton}
        </Button>
      </div>

      <header className="border-b pb-4">
        <h1 className="text-2xl font-bold">{org.data?.name ?? ""}</h1>
        <p className="text-lg">{data.title}</p>
        <p className="text-sm text-neutral-600">
          {data.patient.name} · {formatDate(data.issuedAt)}
        </p>
      </header>

      <div className="text-sm leading-relaxed whitespace-pre-wrap">
        {data.body}
      </div>
    </div>
  );
}
