"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FlaskConical, Loader2, Plus, Trash2 } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
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

type ExamRow = RouterOutputs["clinical"]["exams"]["list"][number];

interface DraftResult {
  localId: string;
  examTypeId: string;
  value: string;
}

function isOutOfRange(
  value: number,
  range: { min?: number; max?: number },
): boolean {
  return (
    (range.min !== undefined && value < range.min) ||
    (range.max !== undefined && value > range.max)
  );
}

function rangeLabel(
  range: { min?: number; max?: number },
  unit: string | null,
): string {
  const suffix = unit ? ` ${unit}` : "";
  if (range.min !== undefined && range.max !== undefined) {
    return `${range.min}–${range.max}${suffix}`;
  }
  if (range.min !== undefined) return `≥ ${range.min}${suffix}`;
  if (range.max !== undefined) return `≤ ${range.max}${suffix}`;
  return "—";
}

export function ExamsTab({ patientId }: { patientId: string }) {
  const utils = api.useUtils();
  const list = api.clinical.exams.list.useQuery({ patientId });
  const examTypes = api.catalog.examTypes.list.useQuery();

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<ExamRow | null>(null);
  const [collectedAt, setCollectedAt] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [labName, setLabName] = useState("");
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<DraftResult[]>([]);

  const create = api.clinical.exams.create.useMutation({
    onSuccess: () => {
      void utils.clinical.exams.list.invalidate({ patientId });
      setCreating(false);
      setResults([]);
      setLabName("");
      setNotes("");
      toast.success(messages.clinical.exams.created);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.clinical.exams.remove.useMutation({
    onSuccess: () => {
      void utils.clinical.exams.list.invalidate({ patientId });
      toast.success(messages.clinical.exams.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  function submit() {
    const parsed = results
      .map((result) => ({
        examTypeId: result.examTypeId,
        value: Number(result.value.replace(",", ".")),
      }))
      .filter(
        (result) => result.examTypeId !== "" && Number.isFinite(result.value),
      );
    if (parsed.length === 0) {
      toast.error(messages.validation.required);
      return;
    }
    create.mutate({
      patientId,
      collectedAt,
      labName: labName.trim() || null,
      notes: notes.trim() || null,
      results: parsed,
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {messages.clinical.exams.title}
          </h3>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {messages.clinical.exams.newButton}
          </Button>
        </div>

        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : list.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FlaskConical
              className="text-muted-foreground size-8"
              aria-hidden
            />
            <p className="text-muted-foreground text-sm">
              {messages.clinical.exams.empty}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((exam) => {
              const outCount = exam.results.filter((result) =>
                isOutOfRange(result.value, result.referenceRange),
              ).length;
              return (
                <li
                  key={exam.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setViewing(exam)}
                  >
                    <p className="text-sm font-medium">
                      {formatDate(exam.collectedAt)}
                      {exam.labName ? (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {exam.labName}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      {messages.clinical.exams.resultsCount(
                        exam.results.length,
                      )}
                      {outCount > 0 ? (
                        <Badge variant="outline" className="text-destructive">
                          {outCount} {messages.clinical.exams.outOfRange}
                        </Badge>
                      ) : null}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate({ id: exam.id })}
                    disabled={remove.isPending}
                    aria-label={messages.config.delete}
                  >
                    <Trash2 className="text-destructive size-4" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Novo exame */}
        <Dialog
          open={creating}
          onOpenChange={(open) => !open && setCreating(false)}
        >
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{messages.clinical.exams.newButton}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="exam-date">
                    {messages.clinical.exams.dateLabel}
                  </Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={collectedAt}
                    onChange={(event) => setCollectedAt(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exam-lab">
                    {messages.clinical.exams.labLabel}
                  </Label>
                  <Input
                    id="exam-lab"
                    value={labName}
                    onChange={(event) => setLabName(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {results.map((result) => (
                  <div
                    key={result.localId}
                    className="grid grid-cols-[1fr_7rem_auto] items-center gap-2"
                  >
                    <Select
                      value={result.examTypeId}
                      onValueChange={(value) =>
                        setResults((previous) =>
                          previous.map((item) =>
                            item.localId === result.localId
                              ? { ...item, examTypeId: value }
                              : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger
                        aria-label={messages.clinical.exams.examTypeLabel}
                      >
                        <SelectValue
                          placeholder={messages.clinical.exams.examTypeLabel}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(examTypes.data ?? []).map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                            {type.unit ? ` (${type.unit})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      inputMode="decimal"
                      aria-label={messages.clinical.exams.valueLabel}
                      value={result.value}
                      onChange={(event) =>
                        setResults((previous) =>
                          previous.map((item) =>
                            item.localId === result.localId
                              ? { ...item, value: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setResults((previous) =>
                          previous.filter(
                            (item) => item.localId !== result.localId,
                          ),
                        )
                      }
                      aria-label={messages.config.delete}
                    >
                      <Trash2 className="text-destructive size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setResults((previous) => [
                      ...previous,
                      {
                        localId: crypto.randomUUID(),
                        examTypeId: "",
                        value: "",
                      },
                    ])
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  {messages.clinical.exams.addResult}
                </Button>
              </div>

              <div className="space-y-1">
                <Label htmlFor="exam-notes">
                  {messages.clinical.exams.notesLabel}
                </Label>
                <Textarea
                  id="exam-notes"
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
                    {formatDate(viewing.collectedAt)}
                    {viewing.labName ? ` · ${viewing.labName}` : ""}
                  </DialogTitle>
                </DialogHeader>
                <ul className="divide-y text-sm">
                  {viewing.results.map((result) => {
                    const out = isOutOfRange(
                      result.value,
                      result.referenceRange,
                    );
                    return (
                      <li
                        key={result.examTypeId}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{result.name}</span>
                          <span className="text-muted-foreground text-xs">
                            {rangeLabel(result.referenceRange, result.unit)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 tabular-nums">
                          {formatNumber(result.value, 2)} {result.unit ?? ""}
                          {out ? (
                            <Badge
                              variant="outline"
                              className="text-destructive"
                            >
                              {messages.clinical.exams.outOfRange}
                            </Badge>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {viewing.notes ? (
                  <p className="text-sm">{viewing.notes}</p>
                ) : null}
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
