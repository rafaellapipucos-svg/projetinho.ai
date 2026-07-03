"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { PatientPicker } from "@/app/_components/patient-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { messages } from "@/messages/pt-br";

const NO_SERVICE = "none";

type Appointment = RouterOutputs["operations"]["appointments"]["range"][number];

function nowForInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function toInputValue(value: Date | string): string {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

/**
 * Diálogo de consulta. A agenda passa o objeto completo (do range) para
 * edição, então semeamos o formulário sem refazer o fetch.
 */
export function AppointmentDialog({
  open,
  appointment,
  onClose,
}: {
  open: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const services = api.operations.services.list.useQuery(undefined, {
    enabled: open,
  });

  const [patient, setPatient] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [serviceId, setServiceId] = useState(NO_SERVICE);
  const [startsAt, setStartsAt] = useState(nowForInput);
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Semeia na abertura (derivação durante o render — sem effect).
  const formKey = open ? (appointment?.id ?? "new") : null;
  if (formKey !== loadedId) {
    if (formKey === null || formKey === "new") {
      setPatient(null);
      setServiceId(NO_SERVICE);
      setStartsAt(nowForInput());
      setDuration("60");
      setNotes("");
    } else if (appointment) {
      setPatient({ id: appointment.patientId, name: appointment.patientName });
      setServiceId(appointment.serviceId ?? NO_SERVICE);
      setStartsAt(toInputValue(appointment.startsAt));
      setDuration(
        String(
          Math.round(
            (new Date(appointment.endsAt).getTime() -
              new Date(appointment.startsAt).getTime()) /
              60_000,
          ),
        ),
      );
      setNotes(appointment.notes ?? "");
    }
    setLoadedId(formKey);
  }

  const onDone = (message: string) => {
    void utils.operations.appointments.range.invalidate();
    toast.success(message);
    onClose();
    setPatient(null);
    setServiceId(NO_SERVICE);
    setNotes("");
  };

  const create = api.operations.appointments.create.useMutation({
    onSuccess: () => onDone(messages.agenda.form.created),
    onError: (error) => toast.error(error.message),
  });
  const update = api.operations.appointments.update.useMutation({
    onSuccess: () => onDone(messages.agenda.form.updated),
    onError: (error) => toast.error(error.message),
  });

  function submit() {
    if (!patient) {
      toast.error(messages.validation.required);
      return;
    }
    const payload = {
      patientId: patient.id,
      serviceId: serviceId === NO_SERVICE ? null : serviceId,
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes: Number(duration) || 60,
      notes: notes.trim() || null,
    };
    if (appointment) {
      update.mutate({ id: appointment.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  // Ao escolher um serviço, herda a duração padrão
  function chooseService(value: string) {
    setServiceId(value);
    const service = services.data?.find((item) => item.id === value);
    if (service) setDuration(String(service.durationMinutes));
  }

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {appointment
              ? messages.agenda.form.editTitle
              : messages.agenda.form.newTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{messages.agenda.form.patientLabel}</Label>
            <PatientPicker
              key={formKey ?? "closed"}
              placeholder={messages.agenda.form.patientPlaceholder}
              onSelect={setPatient}
              initialLabel={patient?.name ?? ""}
            />
          </div>

          <div className="space-y-1">
            <Label>{messages.agenda.form.serviceLabel}</Label>
            <Select value={serviceId} onValueChange={chooseService}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SERVICE}>
                  {messages.agenda.form.noService}
                </SelectItem>
                {(services.data ?? []).map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} (
                    {messages.services.minutes(service.durationMinutes)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="appointment-start">
                {messages.agenda.form.dateLabel}
              </Label>
              <Input
                id="appointment-start"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="appointment-duration">
                {messages.agenda.form.durationLabel}
              </Label>
              <Input
                id="appointment-duration"
                inputMode="numeric"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="appointment-notes">
              {messages.agenda.form.notesLabel}
            </Label>
            <Textarea
              id="appointment-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {messages.config.cancel}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {messages.config.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
