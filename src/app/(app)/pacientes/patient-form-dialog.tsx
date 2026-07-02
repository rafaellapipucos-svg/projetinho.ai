"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { patientInput } from "@/lib/schemas/patient";
import { toDateInputValue } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

const SEX_NONE = "none";

interface FormState {
  name: string;
  birthDate: string;
  sex: string;
  genderIdentity: string;
  cpf: string;
  email: string;
  phone: string;
  occupation: string;
  notes: string;
  consent: boolean;
}

const emptyForm: FormState = {
  name: "",
  birthDate: "",
  sex: SEX_NONE,
  genderIdentity: "",
  cpf: "",
  email: "",
  phone: "",
  occupation: "",
  notes: "",
  consent: false,
};

export function PatientFormDialog({
  open,
  editingPatientId,
  onClose,
}: {
  open: boolean;
  editingPatientId: string | null;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const editing = api.patient.byId.useQuery(
    { id: editingPatientId ?? "" },
    { enabled: open && editingPatientId !== null },
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Semeia o formulário na abertura (derivação durante o render — sem effect).
  const formKey = open ? (editingPatientId ?? "new") : null;
  if (formKey !== loadedKey) {
    if (formKey === null) {
      setLoadedKey(null);
    } else if (formKey === "new") {
      setForm(emptyForm);
      setLoadedKey(formKey);
    } else if (editing.data && editing.data.id === formKey) {
      const patient = editing.data;
      setForm({
        name: patient.name,
        birthDate: patient.birthDate ? toDateInputValue(patient.birthDate) : "",
        sex: patient.sex ?? SEX_NONE,
        genderIdentity: patient.genderIdentity ?? "",
        cpf: patient.cpf ?? "",
        email: patient.email ?? "",
        phone: patient.phone ?? "",
        occupation: patient.occupation ?? "",
        notes: patient.notes ?? "",
        consent: patient.consentAt !== null,
      });
      setLoadedKey(formKey);
    }
  }

  function patch(partial: Partial<FormState>) {
    setForm((previous) => ({ ...previous, ...partial }));
  }

  const onError = (error: { message: string }) => toast.error(error.message);
  const onSaved = (message: string) => {
    void utils.patient.invalidate();
    toast.success(message);
    onClose();
  };

  const create = api.patient.create.useMutation({
    onSuccess: () => onSaved(messages.patients.created),
    onError,
  });
  const update = api.patient.update.useMutation({
    onSuccess: () => onSaved(messages.patients.updated),
    onError,
  });

  function submit() {
    // Reusa o schema canônico no cliente antes de enviar.
    const parsed = patientInput.safeParse({
      name: form.name.trim(),
      birthDate: form.birthDate === "" ? null : form.birthDate,
      sex: form.sex === SEX_NONE ? null : form.sex,
      genderIdentity: form.genderIdentity.trim() || null,
      cpf: form.cpf.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      occupation: form.occupation.trim() || null,
      notes: form.notes.trim() || null,
      consent: form.consent,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? messages.errors.internal);
      return;
    }
    if (editingPatientId) {
      update.mutate({ id: editingPatientId, ...parsed.data });
    } else {
      create.mutate(parsed.data);
    }
  }

  const saving = create.isPending || update.isPending;
  const loading = editingPatientId !== null && editing.isPending;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPatientId
              ? messages.patients.form.editTitle
              : messages.patients.form.newTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2
              className="text-muted-foreground size-6 animate-spin"
              aria-hidden
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="patient-name">
                {messages.patients.form.nameLabel}
              </Label>
              <Input
                id="patient-name"
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="patient-birth">
                  {messages.patients.form.birthDateLabel}
                </Label>
                <Input
                  id="patient-birth"
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => patch({ birthDate: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{messages.patients.form.sexLabel}</Label>
                <Select
                  value={form.sex}
                  onValueChange={(value) => patch({ sex: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEX_NONE}>
                      {messages.patients.overview.notInformed}
                    </SelectItem>
                    <SelectItem value="female">
                      {messages.patients.overview.sexFemale}
                    </SelectItem>
                    <SelectItem value="male">
                      {messages.patients.overview.sexMale}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="patient-gender">
                  {messages.patients.form.genderLabel}
                </Label>
                <Input
                  id="patient-gender"
                  value={form.genderIdentity}
                  onChange={(event) =>
                    patch({ genderIdentity: event.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="patient-cpf">
                  {messages.patients.form.cpfLabel}
                </Label>
                <Input
                  id="patient-cpf"
                  value={form.cpf}
                  onChange={(event) => patch({ cpf: event.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="patient-email">
                  {messages.patients.form.emailLabel}
                </Label>
                <Input
                  id="patient-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => patch({ email: event.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="patient-phone">
                  {messages.patients.form.phoneLabel}
                </Label>
                <Input
                  id="patient-phone"
                  value={form.phone}
                  onChange={(event) => patch({ phone: event.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="patient-occupation">
                {messages.patients.form.occupationLabel}
              </Label>
              <Input
                id="patient-occupation"
                value={form.occupation}
                onChange={(event) => patch({ occupation: event.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="patient-notes">
                {messages.patients.form.notesLabel}
              </Label>
              <Textarea
                id="patient-notes"
                rows={3}
                value={form.notes}
                onChange={(event) => patch({ notes: event.target.value })}
              />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.consent}
                onCheckedChange={(checked) =>
                  patch({ consent: checked === true })
                }
                className="mt-0.5"
              />
              {messages.patients.form.consentLabel}
            </label>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
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
        )}
      </DialogContent>
    </Dialog>
  );
}
