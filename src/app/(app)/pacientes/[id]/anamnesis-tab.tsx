"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, Loader2, Plus, Trash2 } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatDate, toDateInputValue } from "@/lib/date";
import { messages } from "@/messages/pt-br";

type Template = RouterOutputs["clinical"]["anamnesis"]["templates"][number];
type Question = Template["questions"][number];
type ResponseRow = RouterOutputs["clinical"]["anamnesis"]["responses"][number];

function formatAnswer(type: string, answer: unknown): string {
  if (answer === null || answer === undefined || answer === "") {
    return messages.clinical.anamnesis.noAnswer;
  }
  if (type === "boolean") {
    return answer === true
      ? messages.clinical.anamnesis.yes
      : messages.clinical.anamnesis.no;
  }
  if (Array.isArray(answer)) return answer.join(", ");
  return String(answer);
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const options = (question.options as string[]) ?? [];
  switch (question.type) {
    case "text":
      return (
        <Textarea
          rows={2}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          inputMode="decimal"
          value={
            typeof value === "number"
              ? String(value)
              : ((value as string) ?? "")
          }
          onChange={(event) => {
            const parsed = Number(event.target.value.replace(",", "."));
            onChange(
              event.target.value === ""
                ? ""
                : Number.isFinite(parsed)
                  ? parsed
                  : event.target.value,
            );
          }}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {messages.clinical.anamnesis.yes}
        </label>
      );
    case "select":
      return (
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(selected) => onChange(selected)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "multi": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={(checked) =>
                  onChange(
                    checked === true
                      ? [...selected, option]
                      : selected.filter((item) => item !== option),
                  )
                }
              />
              {option}
            </label>
          ))}
        </div>
      );
    }
    case "scale":
      return (
        <Select
          value={typeof value === "number" ? String(value) : ""}
          onValueChange={(selected) => onChange(Number(selected))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 11 }, (_, index) => (
              <SelectItem key={index} value={String(index)}>
                {index}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return null;
  }
}

export function AnamnesisTab({ patientId }: { patientId: string }) {
  const utils = api.useUtils();
  const templates = api.clinical.anamnesis.templates.useQuery();
  const responses = api.clinical.anamnesis.responses.useQuery({ patientId });

  const [responding, setResponding] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [answeredAt, setAnsweredAt] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [viewing, setViewing] = useState<ResponseRow | null>(null);

  const template = (templates.data ?? []).find(
    (item) => item.id === templateId,
  );

  const respond = api.clinical.anamnesis.respond.useMutation({
    onSuccess: () => {
      void utils.clinical.anamnesis.responses.invalidate({ patientId });
      setResponding(false);
      setAnswers({});
      toast.success(messages.clinical.anamnesis.answered);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.clinical.anamnesis.removeResponse.useMutation({
    onSuccess: () => {
      void utils.clinical.anamnesis.responses.invalidate({ patientId });
      toast.success(messages.clinical.anamnesis.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  function submit() {
    if (!template) {
      toast.error(messages.validation.required);
      return;
    }
    for (const question of template.questions) {
      const answer = answers[question.id];
      if (
        question.required &&
        (answer === undefined || answer === "" || answer === null)
      ) {
        toast.error(
          `${messages.clinical.anamnesis.requiredMissing}: ${question.prompt}`,
        );
        return;
      }
    }
    const payload = template.questions
      .map((question) => ({
        questionId: question.id,
        answer: answers[question.id],
      }))
      .filter(
        (
          entry,
        ): entry is {
          questionId: string;
          answer: string | number | boolean | string[];
        } => entry.answer !== undefined && entry.answer !== "",
      );
    respond.mutate({
      patientId,
      templateId: template.id,
      answeredAt,
      answers: payload,
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {messages.clinical.anamnesis.title}
          </h3>
          <Button onClick={() => setResponding(true)}>
            <Plus className="size-4" aria-hidden />
            {messages.clinical.anamnesis.respondButton}
          </Button>
        </div>

        {responses.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : responses.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ClipboardCheck
              className="text-muted-foreground size-8"
              aria-hidden
            />
            <p className="text-muted-foreground text-sm">
              {messages.clinical.anamnesis.empty}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {(responses.data ?? []).map((response) => (
              <li
                key={response.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-sm"
                  onClick={() => setViewing(response)}
                >
                  <span className="font-medium">
                    {formatDate(response.answeredAt)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    · {response.templateName}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove.mutate({ id: response.id })}
                  disabled={remove.isPending}
                  aria-label={messages.config.delete}
                >
                  <Trash2 className="text-destructive size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Responder anamnese */}
        <Dialog
          open={responding}
          onOpenChange={(open) => !open && setResponding(false)}
        >
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {messages.clinical.anamnesis.respondButton}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{messages.clinical.anamnesis.templateLabel}</Label>
                  <Select
                    value={templateId}
                    onValueChange={(value) => {
                      setTemplateId(value);
                      setAnswers({});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={messages.clinical.anamnesis.templateLabel}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(templates.data ?? []).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="anamnesis-date">
                    {messages.clinical.anamnesis.dateLabel}
                  </Label>
                  <Input
                    id="anamnesis-date"
                    type="date"
                    value={answeredAt}
                    onChange={(event) => setAnsweredAt(event.target.value)}
                  />
                </div>
              </div>

              {(template?.questions ?? []).map((question) => (
                <div key={question.id} className="space-y-1">
                  <Label className="text-sm">
                    {question.prompt}
                    {question.required ? " *" : ""}
                  </Label>
                  <QuestionField
                    question={question}
                    value={answers[question.id]}
                    onChange={(value) =>
                      setAnswers((previous) => ({
                        ...previous,
                        [question.id]: value,
                      }))
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setResponding(false)}>
                  {messages.config.cancel}
                </Button>
                <Button
                  onClick={submit}
                  disabled={respond.isPending || !template}
                >
                  {respond.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {messages.config.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ver respostas (snapshot) */}
        <Dialog
          open={viewing !== null}
          onOpenChange={(open) => !open && setViewing(null)}
        >
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            {viewing ? (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {viewing.templateName} · {formatDate(viewing.answeredAt)}
                  </DialogTitle>
                </DialogHeader>
                <dl className="space-y-3 text-sm">
                  {viewing.answers.map((answer) => (
                    <div key={answer.questionId}>
                      <dt className="text-muted-foreground text-xs font-medium uppercase">
                        {answer.prompt}
                      </dt>
                      <dd>{formatAnswer(answer.type, answer.answer)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
