"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Flame, Loader2, Plus, Target, Trash2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDate, toDateInputValue } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";

/** Campos exigidos por fórmula (fallback: todos). */
const INPUT_HINTS: Record<string, Array<"weight" | "height" | "lean">> = {
  harris_benedict_1984: ["weight", "height"],
  mifflin_1990: ["weight", "height"],
  fao_who_1985: ["weight"],
  katch_mcardle: ["lean"],
  cunningham_1980: ["lean"],
  tinsley_2019: ["weight"],
};

function parse(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function EnergyTab({ patientId }: { patientId: string }) {
  const utils = api.useUtils();
  const list = api.clinical.energy.list.useQuery({ patientId });
  const methods = api.catalog.system.calculationMethods.useQuery();
  const plans = api.plan.listByPatient.useQuery({ patientId });

  const energyMethods = (methods.data ?? []).filter(
    (method) => method.kind === "energy_expenditure",
  );
  const factors = (methods.data ?? []).filter(
    (method) => method.kind === "activity_factor",
  );

  const [creating, setCreating] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [methodKey, setMethodKey] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [leanMass, setLeanMass] = useState("");
  const [factorKey, setFactorKey] = useState("");
  const [adjustment, setAdjustment] = useState("0");
  const [notes, setNotes] = useState("");
  const [applying, setApplying] = useState<number | null>(null);
  const [applyPlanId, setApplyPlanId] = useState("");

  const hints = INPUT_HINTS[methodKey] ?? ["weight", "height", "lean"];

  const create = api.clinical.energy.create.useMutation({
    onSuccess: () => {
      void utils.clinical.energy.list.invalidate({ patientId });
      setCreating(false);
      toast.success(messages.clinical.energy.created);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.clinical.energy.remove.useMutation({
    onSuccess: () => {
      void utils.clinical.energy.list.invalidate({ patientId });
      toast.success(messages.clinical.energy.removed);
    },
    onError: (error) => toast.error(error.message),
  });
  const applyTarget = api.plan.applyEnergyTarget.useMutation({
    onSuccess: () => {
      void utils.plan.invalidate();
      setApplying(null);
      setApplyPlanId("");
      toast.success(messages.clinical.energy.applied);
    },
    onError: (error) => toast.error(error.message),
  });

  const targetablePlans = (plans.data ?? []).filter(
    (plan) => plan.status !== "archived",
  );

  function submit() {
    if (methodKey === "" || factorKey === "") {
      toast.error(messages.validation.required);
      return;
    }
    create.mutate({
      patientId,
      calculatedAt,
      methodKey,
      weightKg: hints.includes("weight") ? parse(weight) : null,
      heightCm: hints.includes("height") ? parse(height) : null,
      leanMassKg: hints.includes("lean") ? parse(leanMass) : null,
      activityFactorKey: factorKey,
      adjustmentKcal: parse(adjustment) ?? 0,
      notes: notes.trim() || null,
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {messages.clinical.energy.title}
          </h3>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {messages.clinical.energy.newButton}
          </Button>
        </div>

        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : list.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Flame className="text-muted-foreground size-8" aria-hidden />
            <p className="text-muted-foreground text-sm">
              {messages.clinical.energy.empty}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((calculation) => (
              <li
                key={calculation.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatDate(calculation.calculatedAt)} ·{" "}
                    {calculation.methodName}
                  </p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {messages.clinical.energy.tmb}{" "}
                    {formatNumber(calculation.tmbKcal, 0)} ·{" "}
                    {messages.clinical.energy.get}{" "}
                    {formatNumber(calculation.getKcal, 0)} (×
                    {formatNumber(calculation.activityFactor, 3)}) ·{" "}
                    <span className="text-foreground font-medium">
                      {messages.clinical.energy.final}{" "}
                      {formatNumber(calculation.finalKcal, 0)} kcal
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setApplying(calculation.finalKcal)}
                  >
                    <Target className="size-4" aria-hidden />
                    {messages.clinical.energy.applyToPlan}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate({ id: calculation.id })}
                    disabled={remove.isPending}
                    aria-label={messages.config.delete}
                  >
                    <Trash2 className="text-destructive size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Novo cálculo */}
        <Dialog
          open={creating}
          onOpenChange={(open) => !open && setCreating(false)}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{messages.clinical.energy.newButton}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="energy-date">
                    {messages.clinical.energy.dateLabel}
                  </Label>
                  <Input
                    id="energy-date"
                    type="date"
                    value={calculatedAt}
                    onChange={(event) => setCalculatedAt(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{messages.clinical.energy.methodLabel}</Label>
                  <Select value={methodKey} onValueChange={setMethodKey}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={messages.clinical.energy.methodLabel}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {energyMethods.map((method) => (
                        <SelectItem key={method.key} value={method.key}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {hints.includes("weight") ? (
                  <div className="space-y-1">
                    <Label htmlFor="energy-weight">
                      {messages.clinical.energy.weightLabel}
                    </Label>
                    <Input
                      id="energy-weight"
                      inputMode="decimal"
                      value={weight}
                      onChange={(event) => setWeight(event.target.value)}
                    />
                  </div>
                ) : null}
                {hints.includes("height") ? (
                  <div className="space-y-1">
                    <Label htmlFor="energy-height">
                      {messages.clinical.energy.heightLabel}
                    </Label>
                    <Input
                      id="energy-height"
                      inputMode="decimal"
                      value={height}
                      onChange={(event) => setHeight(event.target.value)}
                    />
                  </div>
                ) : null}
                {hints.includes("lean") ? (
                  <div className="space-y-1">
                    <Label htmlFor="energy-lean">
                      {messages.clinical.energy.leanMassLabel}
                    </Label>
                    <Input
                      id="energy-lean"
                      inputMode="decimal"
                      value={leanMass}
                      onChange={(event) => setLeanMass(event.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{messages.clinical.energy.factorLabel}</Label>
                  <Select value={factorKey} onValueChange={setFactorKey}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={messages.clinical.energy.factorLabel}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {factors.map((factor) => (
                        <SelectItem key={factor.key} value={factor.key}>
                          {factor.name} (×
                          {formatNumber(
                            (factor.params as { factor?: number }).factor ?? 0,
                            3,
                          )}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="energy-adjustment">
                    {messages.clinical.energy.adjustmentLabel}
                  </Label>
                  <Input
                    id="energy-adjustment"
                    inputMode="numeric"
                    value={adjustment}
                    onChange={(event) => setAdjustment(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="energy-notes">
                  {messages.clinical.energy.notesLabel}
                </Label>
                <Textarea
                  id="energy-notes"
                  rows={2}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setCreating(false)}>
                  {messages.config.cancel}
                </Button>
                <Button onClick={submit} disabled={create.isPending}>
                  {create.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {messages.config.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Aplicar meta a um plano */}
        <Dialog
          open={applying !== null}
          onOpenChange={(open) => !open && setApplying(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {messages.clinical.energy.applyToPlan}
                {applying !== null
                  ? ` — ${formatNumber(applying, 0)} kcal`
                  : ""}
              </DialogTitle>
            </DialogHeader>
            {targetablePlans.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {messages.clinical.energy.noPlans}
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>{messages.clinical.energy.choosePlan}</Label>
                  <Select value={applyPlanId} onValueChange={setApplyPlanId}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={messages.clinical.energy.choosePlan}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {targetablePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({messages.plans.status[plan.status]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setApplying(null)}>
                    {messages.config.cancel}
                  </Button>
                  <Button
                    disabled={applyPlanId === "" || applyTarget.isPending}
                    onClick={() =>
                      applying !== null &&
                      applyTarget.mutate({
                        planId: applyPlanId,
                        kcal: Math.round(applying),
                      })
                    }
                  >
                    {applyTarget.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {messages.config.save}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
