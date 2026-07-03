"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ageFrom, formatDate } from "@/lib/date";
import { messages } from "@/messages/pt-br";
import { PatientFormDialog } from "../patient-form-dialog";
import { AttachmentsTab } from "./attachments-tab";
import { PlansTab } from "./plans-tab";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </p>
      <p className="text-sm">
        {value ?? messages.patients.overview.notInformed}
      </p>
    </div>
  );
}

export function PatientDetail({ patientId }: { patientId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const detail = api.patient.byId.useQuery({ id: patientId });
  const [editing, setEditing] = useState(false);

  const archive = api.patient.archive.useMutation({
    onSuccess: () => {
      void utils.patient.invalidate();
      toast.success(messages.patients.archived);
      router.push("/pacientes");
    },
    onError: (error) => toast.error(error.message),
  });

  if (detail.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      </div>
    );
  }

  const patient = detail.data;
  if (!patient) return null;

  const sexLabel =
    patient.sex === "female"
      ? messages.patients.overview.sexFemale
      : patient.sex === "male"
        ? messages.patients.overview.sexMale
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/pacientes" aria-label={messages.patients.title}>
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Button>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
              {patient.name}
              {patient.consentAt === null ? (
                <Badge variant="outline" className="text-destructive">
                  {messages.patients.consentMissingBadge}
                </Badge>
              ) : null}
            </h1>
            <p className="text-muted-foreground text-sm">
              {patient.birthDate
                ? `${messages.patients.yearsOld(ageFrom(patient.birthDate))} · ${formatDate(patient.birthDate)}`
                : messages.patients.overview.notInformed}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={archive.isPending}>
                {messages.patients.archiveButton}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {messages.patients.archiveConfirmTitle}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {messages.patients.archiveConfirmBody}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{messages.config.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => archive.mutate({ id: patient.id })}
                >
                  {messages.patients.archiveButton}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={() => setEditing(true)}>
            {messages.patients.overview.editButton}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            {messages.patients.tabs.overview}
          </TabsTrigger>
          <TabsTrigger value="plans">
            {messages.patients.tabs.plans}
          </TabsTrigger>
          <TabsTrigger value="attachments">
            {messages.patients.tabs.attachments}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                label={messages.patients.overview.assignedTo}
                value={patient.assignedTo?.name ?? null}
              />
              <Field label={messages.patients.overview.sex} value={sexLabel} />
              <Field
                label={messages.patients.overview.cpf}
                value={patient.cpf}
              />
              <Field
                label={messages.patients.overview.email}
                value={patient.email}
              />
              <Field
                label={messages.patients.overview.phone}
                value={patient.phone}
              />
              <Field
                label={messages.patients.overview.occupation}
                value={patient.occupation}
              />
              <Field
                label={messages.patients.overview.consent}
                value={
                  patient.consentAt
                    ? messages.patients.overview.consentAt(
                        formatDate(patient.consentAt),
                      )
                    : messages.patients.overview.consentMissing
                }
              />
              <div className="sm:col-span-2 lg:col-span-3">
                <Field
                  label={messages.patients.overview.notes}
                  value={patient.notes}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <PlansTab patientId={patient.id} />
        </TabsContent>

        <TabsContent value="attachments">
          <AttachmentsTab patientId={patient.id} />
        </TabsContent>
      </Tabs>

      <PatientFormDialog
        open={editing}
        editingPatientId={editing ? patient.id : null}
        onClose={() => setEditing(false)}
      />
    </div>
  );
}
