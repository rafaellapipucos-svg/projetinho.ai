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
import { toDateInputValue } from "@/lib/date";
import { messages } from "@/messages/pt-br";

type Payment = RouterOutputs["finance"]["list"][number];
type Status = "pending" | "paid" | "cancelled";

export function PaymentDialog({
  open,
  payment,
  onClose,
}: {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
}) {
  const utils = api.useUtils();

  const [patient, setPatient] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState<Status>("pending");
  const [dueAt, setDueAt] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Semeia na abertura (derivação durante o render — sem effect)
  const formKey = open ? (payment?.id ?? "new") : null;
  if (formKey !== loadedId) {
    if (formKey === null || formKey === "new") {
      setPatient(null);
      setDescription("");
      setAmount("");
      setMethod("");
      setStatus("pending");
      setDueAt("");
      setPaidAt("");
    } else if (payment) {
      setPatient({ id: payment.patientId, name: payment.patientName });
      setDescription(payment.description);
      setAmount(String(payment.amountReais));
      setMethod(payment.method ?? "");
      setStatus(payment.status);
      setDueAt(payment.dueAt ? toDateInputValue(payment.dueAt) : "");
      setPaidAt(payment.paidAt ? toDateInputValue(payment.paidAt) : "");
    }
    setLoadedId(formKey);
  }

  const onDone = (message: string) => {
    void utils.finance.invalidate();
    toast.success(message);
    onClose();
  };
  const create = api.finance.create.useMutation({
    onSuccess: () => onDone(messages.finance.created),
    onError: (error) => toast.error(error.message),
  });
  const update = api.finance.update.useMutation({
    onSuccess: () => onDone(messages.finance.updated),
    onError: (error) => toast.error(error.message),
  });

  function submit() {
    if (!patient) {
      toast.error(messages.validation.required);
      return;
    }
    const amountReais = Number(amount.replace(",", "."));
    if (!Number.isFinite(amountReais) || amountReais < 0) {
      toast.error(messages.validation.numberInvalid);
      return;
    }
    const payload = {
      patientId: patient.id,
      appointmentId: null,
      description: description.trim(),
      amountReais,
      method: method.trim() || null,
      status,
      dueAt: dueAt || null,
      paidAt: paidAt || null,
    };
    if (payment) {
      update.mutate({ id: payment.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {payment ? messages.finance.editTitle : messages.finance.newTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>{messages.finance.patientLabel}</Label>
            <PatientPicker
              key={formKey ?? "closed"}
              placeholder={messages.finance.patientPlaceholder}
              onSelect={setPatient}
              initialLabel={patient?.name ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="payment-description">
              {messages.finance.descriptionLabel}
            </Label>
            <Input
              id="payment-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="payment-amount">
                {messages.finance.amountLabel}
              </Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{messages.finance.statusLabel}</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as Status)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    {messages.finance.status.pending}
                  </SelectItem>
                  <SelectItem value="paid">
                    {messages.finance.status.paid}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {messages.finance.status.cancelled}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="payment-method">
                {messages.finance.methodLabel}
              </Label>
              <Input
                id="payment-method"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment-due">{messages.finance.dueLabel}</Label>
              <Input
                id="payment-due"
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="payment-paid">
                {messages.finance.paidAtLabel}
              </Label>
              <Input
                id="payment-paid"
                type="date"
                value={paidAt}
                onChange={(event) => setPaidAt(event.target.value)}
              />
            </div>
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
