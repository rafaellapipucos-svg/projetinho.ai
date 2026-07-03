"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Ruler, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type RouterOutputs } from "@/app/_trpc/client";
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
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type AssessmentRow = RouterOutputs["clinical"]["assessments"]["list"][number];

const NO_METHOD = "none";
const GROUP_LABELS = messages.config.system.groups;

function parseValue(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resultEntries(
  results: AssessmentRow["results"],
): Array<[string, string]> {
  const labels = messages.clinical.assessments.resultLabels;
  const entries: Array<[string, string]> = [];
  for (const [key, label] of Object.entries(labels)) {
    const value = results[key as keyof AssessmentRow["results"]];
    if (value === undefined) continue;
    if (key === "bmiClassification") {
      const classes = messages.clinical.assessments.bmiClasses;
      entries.push([
        label,
        classes[value as keyof typeof classes] ?? String(value),
      ]);
    } else if (typeof value === "number") {
      entries.push([label, formatNumber(value, 2)]);
    }
  }
  return entries;
}

export function AssessmentsTab({ patientId }: { patientId: string }) {
  const utils = api.useUtils();
  const list = api.clinical.assessments.list.useQuery({ patientId });
  const methods = api.catalog.system.calculationMethods.useQuery();
  const measurementTypes = api.catalog.system.measurementTypes.useQuery();

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<AssessmentRow | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const [assessedAt, setAssessedAt] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [methodKey, setMethodKey] = useState(NO_METHOD);
  const [conversion, setConversion] = useState<"siri" | "brozek">("siri");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  const bodyMethods = (methods.data ?? []).filter(
    (method) => method.kind === "body_composition",
  );

  const create = api.clinical.assessments.create.useMutation({
    onSuccess: () => {
      void utils.clinical.assessments.list.invalidate({ patientId });
      setCreating(false);
      setValues({});
      setNotes("");
      toast.success(messages.clinical.assessments.created);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.clinical.assessments.remove.useMutation({
    onSuccess: () => {
      void utils.clinical.assessments.list.invalidate({ patientId });
      setRemoving(null);
      toast.success(messages.clinical.assessments.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  const chartData = useMemo(
    () =>
      (list.data ?? []).map((assessment) => ({
        date: formatDate(assessment.assessedAt),
        peso: assessment.values.find((value) => value.key === "weight")?.value,
        gordura: assessment.results.bodyFatPct,
      })),
    [list.data],
  );
  const hasChart =
    chartData.filter(
      (point) => point.peso !== undefined || point.gordura !== undefined,
    ).length >= 2;

  function submit() {
    const entries = Object.entries(values)
      .map(([measurementTypeId, raw]) => ({
        measurementTypeId,
        value: parseValue(raw),
      }))
      .filter(
        (entry): entry is { measurementTypeId: string; value: number } =>
          entry.value !== null,
      );
    if (entries.length === 0) {
      toast.error(messages.validation.required);
      return;
    }
    create.mutate({
      patientId,
      assessedAt,
      methodKey: methodKey === NO_METHOD ? null : methodKey,
      conversion,
      values: entries,
      notes: notes.trim() || null,
    });
  }

  const typesByGroup = new Map<
    string,
    NonNullable<typeof measurementTypes.data>
  >();
  for (const type of measurementTypes.data ?? []) {
    typesByGroup.set(type.group, [
      ...(typesByGroup.get(type.group) ?? []),
      type,
    ]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {messages.clinical.assessments.evolutionTitle}
          </CardTitle>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {messages.clinical.assessments.newButton}
          </Button>
        </CardHeader>
        <CardContent>
          {hasChart ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="peso"
                    name={messages.clinical.assessments.weightSeries}
                    stroke="var(--chart-1)"
                    connectNulls
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="gordura"
                    name={messages.clinical.assessments.bodyFatSeries}
                    stroke="var(--chart-2)"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              {messages.clinical.assessments.evolutionEmpty}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {list.isPending ? (
            <Loader2
              className="text-muted-foreground size-5 animate-spin"
              aria-hidden
            />
          ) : list.data?.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Ruler className="text-muted-foreground size-8" aria-hidden />
              <p className="text-muted-foreground text-sm">
                {messages.clinical.assessments.empty}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {[...(list.data ?? [])].reverse().map((assessment) => (
                <li
                  key={assessment.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setViewing(assessment)}
                  >
                    <p className="text-sm font-medium">
                      {formatDate(assessment.assessedAt)}
                      {assessment.methodName ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {assessment.methodName}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {assessment.results.bmi !== undefined
                        ? `IMC ${formatNumber(assessment.results.bmi, 1)}`
                        : ""}
                      {assessment.results.bodyFatPct !== undefined
                        ? ` · %G ${formatNumber(assessment.results.bodyFatPct, 1)}`
                        : ""}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRemoving(assessment.id)}
                    aria-label={messages.config.delete}
                  >
                    <Trash2 className="text-destructive size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Nova avaliação */}
      <Dialog
        open={creating}
        onOpenChange={(open) => !open && setCreating(false)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{messages.clinical.assessments.newButton}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="assessment-date">
                  {messages.clinical.assessments.dateLabel}
                </Label>
                <Input
                  id="assessment-date"
                  type="date"
                  value={assessedAt}
                  onChange={(event) => setAssessedAt(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>{messages.clinical.assessments.conversionLabel}</Label>
                <Select
                  value={conversion}
                  onValueChange={(value) =>
                    setConversion(value as "siri" | "brozek")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="siri">Siri</SelectItem>
                    <SelectItem value="brozek">Brozek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{messages.clinical.assessments.methodLabel}</Label>
              <Select value={methodKey} onValueChange={setMethodKey}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_METHOD}>
                    {messages.clinical.assessments.noMethod}
                  </SelectItem>
                  {bodyMethods.map((method) => (
                    <SelectItem key={method.key} value={method.key}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-muted-foreground text-sm">
              {messages.clinical.assessments.valuesHelp}
            </p>
            {[...typesByGroup.entries()].map(([group, types]) => (
              <div key={group} className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {GROUP_LABELS[group as keyof typeof GROUP_LABELS] ?? group}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {types.map((type) => (
                    <div key={type.id} className="space-y-1">
                      <Label htmlFor={`mt-${type.key}`} className="text-xs">
                        {type.name} ({type.unit})
                      </Label>
                      <Input
                        id={`mt-${type.key}`}
                        inputMode="decimal"
                        value={values[type.id] ?? ""}
                        onChange={(event) =>
                          setValues((previous) => ({
                            ...previous,
                            [type.id]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="space-y-1">
              <Label htmlFor="assessment-notes">
                {messages.clinical.assessments.notesLabel}
              </Label>
              <Textarea
                id="assessment-notes"
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

      {/* Detalhe */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {viewing ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatDate(viewing.assessedAt)}
                  {viewing.methodName ? ` · ${viewing.methodName}` : ""}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {messages.clinical.assessments.resultsTitle}
                  </p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {resultEntries(viewing.results).map(([label, value]) => (
                      <li key={label} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="tabular-nums">{value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {viewing.values.map((value) => (
                      <li
                        key={value.key}
                        className="flex justify-between gap-2"
                      >
                        <span className="text-muted-foreground truncate">
                          {value.name}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {formatNumber(value.value, 1)} {value.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                {viewing.notes ? <p>{viewing.notes}</p> : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {messages.clinical.assessments.removeConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {messages.clinical.assessments.removeConfirmBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{messages.config.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removing && remove.mutate({ id: removing })}
            >
              {messages.config.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
