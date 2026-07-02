"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Users } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ageFrom } from "@/lib/date";
import { messages } from "@/messages/pt-br";
import { PatientFormDialog } from "./patient-form-dialog";

const DEBOUNCE_MS = 300;

export function PatientsPage() {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const list = api.patient.list.useQuery({
    term: debounced.length > 0 ? debounced : undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.patients.title}
          </h1>
          <p className="text-muted-foreground">{messages.patients.subtitle}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          {messages.patients.newButton}
        </Button>
      </div>

      <div className="relative max-w-xl">
        <Search
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={messages.patients.searchPlaceholder}
          className="pl-9"
        />
      </div>

      {list.isPending ? (
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      ) : list.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Users className="text-muted-foreground size-10" aria-hidden />
            <p className="text-muted-foreground">{messages.patients.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border">
          {(list.data ?? []).map((patient) => (
            <li key={patient.id}>
              <Link
                href={`/pacientes/${patient.id}`}
                className="hover:bg-accent flex items-center justify-between gap-3 px-4 py-3 transition-colors"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{patient.name}</span>
                  {patient.consentAt === null ? (
                    <Badge variant="outline" className="text-destructive">
                      {messages.patients.consentMissingBadge}
                    </Badge>
                  ) : null}
                </span>
                <span className="text-muted-foreground shrink-0 text-sm">
                  {patient.birthDate
                    ? messages.patients.yearsOld(ageFrom(patient.birthDate))
                    : ""}
                  {patient.birthDate && patient.phone ? " · " : ""}
                  {patient.phone ?? ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PatientFormDialog
        open={creating}
        editingPatientId={null}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
