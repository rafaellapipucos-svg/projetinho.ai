"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
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
import { messages } from "@/messages/pt-br";

const BLANK = "blank";

/**
 * Criação de plano (para um paciente) ou de modelo (patientId null).
 * Planos de paciente podem partir de um modelo existente.
 */
export function PlanCreateDialog({
  open,
  patientId,
  onClose,
}: {
  open: boolean;
  patientId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const isTemplate = patientId === null;
  const templates = api.plan.listTemplates.useQuery(undefined, {
    enabled: open && !isTemplate,
  });

  const [name, setName] = useState("");
  const [fromTemplate, setFromTemplate] = useState(BLANK);

  const create = api.plan.create.useMutation({
    onSuccess: (result) => {
      void utils.plan.invalidate();
      toast.success(messages.plans.created);
      onClose();
      setName("");
      setFromTemplate(BLANK);
      router.push(`/planos/${result.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isTemplate
              ? messages.plans.newTemplateButton
              : messages.plans.newPlanButton}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="plan-name">
              {isTemplate
                ? messages.plans.templateNameLabel
                : messages.plans.nameLabel}
            </Label>
            <Input
              id="plan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          {!isTemplate ? (
            <div className="space-y-1">
              <Label>{messages.plans.fromTemplateLabel}</Label>
              <Select value={fromTemplate} onValueChange={setFromTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BLANK}>
                    {messages.plans.blankOption}
                  </SelectItem>
                  {(templates.data ?? []).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {messages.config.cancel}
            </Button>
            <Button
              disabled={name.trim().length < 2 || create.isPending}
              onClick={() =>
                create.mutate({
                  name: name.trim(),
                  patientId,
                  isTemplate,
                  fromTemplateId: fromTemplate === BLANK ? null : fromTemplate,
                })
              }
            >
              {create.isPending ? (
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
