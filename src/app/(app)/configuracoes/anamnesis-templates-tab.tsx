"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { messages } from "@/messages/pt-br";
import { RowActions } from "./row-actions";

type Template = RouterOutputs["clinical"]["anamnesis"]["templates"][number];
type QuestionType =
  "text" | "number" | "boolean" | "select" | "multi" | "scale";

interface DraftQuestion {
  localId: string;
  prompt: string;
  type: QuestionType;
  options: string;
  required: boolean;
}

const TYPE_LABELS = messages.clinical.anamnesis.types;

function emptyQuestion(): DraftQuestion {
  return {
    localId: crypto.randomUUID(),
    prompt: "",
    type: "text",
    options: "",
    required: false,
  };
}

export function AnamnesisTemplatesTab() {
  const utils = api.useUtils();
  const templates = api.clinical.anamnesis.templates.useQuery();

  const [editor, setEditor] = useState<{ id: string | null } | null>(null);
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);

  const save = api.clinical.anamnesis.saveTemplate.useMutation({
    onSuccess: () => {
      void utils.clinical.anamnesis.templates.invalidate();
      setEditor(null);
      toast.success(messages.clinical.anamnesis.templateSaved);
    },
    onError: (error) => toast.error(error.message),
  });
  const deactivate = api.clinical.anamnesis.deactivateTemplate.useMutation({
    onSuccess: () => {
      void utils.clinical.anamnesis.templates.invalidate();
      toast.success(messages.clinical.anamnesis.templateRemoved);
    },
    onError: (error) => toast.error(error.message),
  });

  function openNew() {
    setName("");
    setQuestions([emptyQuestion()]);
    setEditor({ id: null });
  }

  function openEdit(template: Template) {
    setName(template.name);
    setQuestions(
      template.questions.map((question) => ({
        localId: crypto.randomUUID(),
        prompt: question.prompt,
        type: question.type,
        options: ((question.options as string[]) ?? []).join(", "),
        required: question.required,
      })),
    );
    setEditor({ id: template.id });
  }

  function patchQuestion(localId: string, patch: Partial<DraftQuestion>) {
    setQuestions((previous) =>
      previous.map((question) =>
        question.localId === localId ? { ...question, ...patch } : question,
      ),
    );
  }

  function submit() {
    const payload = questions
      .filter((question) => question.prompt.trim().length > 0)
      .map((question) => ({
        prompt: question.prompt.trim(),
        type: question.type,
        options:
          question.type === "select" || question.type === "multi"
            ? question.options
                .split(",")
                .map((option) => option.trim())
                .filter((option) => option.length > 0)
            : [],
        required: question.required,
      }));
    if (payload.length === 0) {
      toast.error(messages.validation.required);
      return;
    }
    save.mutate({
      id: editor?.id ?? null,
      name: name.trim(),
      questions: payload,
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{messages.clinical.anamnesis.templatesTitle}</CardTitle>
          <CardDescription>
            {messages.clinical.anamnesis.templatesDescription}
          </CardDescription>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          {messages.clinical.anamnesis.newTemplate}
        </Button>
      </CardHeader>
      <CardContent>
        {templates.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : (
          <ul className="divide-y">
            {(templates.data ?? []).map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{template.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {template.questions.length} perguntas
                  </span>
                  {template.isSystem ? (
                    <Badge variant="secondary">
                      {messages.config.systemBadge}
                    </Badge>
                  ) : null}
                </div>
                {!template.isSystem ? (
                  <RowActions
                    onEdit={() => openEdit(template)}
                    onDelete={() => deactivate.mutate({ id: template.id })}
                    deleting={deactivate.isPending}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.id
                ? messages.clinical.anamnesis.editTemplate
                : messages.clinical.anamnesis.newTemplate}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="template-name">
                {messages.clinical.anamnesis.templateNameLabel}
              </Label>
              <Input
                id="template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <p className="text-muted-foreground text-xs font-medium uppercase">
              {messages.clinical.anamnesis.questionsTitle}
            </p>
            <div className="space-y-3">
              {questions.map((question) => (
                <div
                  key={question.localId}
                  className="space-y-2 rounded-md border p-3"
                >
                  <div className="grid grid-cols-[1fr_10rem_auto] items-start gap-2">
                    <Input
                      placeholder={messages.clinical.anamnesis.promptLabel}
                      value={question.prompt}
                      onChange={(event) =>
                        patchQuestion(question.localId, {
                          prompt: event.target.value,
                        })
                      }
                    />
                    <Select
                      value={question.type}
                      onValueChange={(value) =>
                        patchQuestion(question.localId, {
                          type: value as QuestionType,
                        })
                      }
                    >
                      <SelectTrigger
                        aria-label={messages.clinical.anamnesis.typeLabel}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setQuestions((previous) =>
                          previous.filter(
                            (item) => item.localId !== question.localId,
                          ),
                        )
                      }
                      aria-label={messages.config.delete}
                    >
                      <Trash2 className="text-destructive size-4" aria-hidden />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    {question.type === "select" || question.type === "multi" ? (
                      <Input
                        className="flex-1"
                        placeholder={messages.clinical.anamnesis.optionsLabel}
                        value={question.options}
                        onChange={(event) =>
                          patchQuestion(question.localId, {
                            options: event.target.value,
                          })
                        }
                      />
                    ) : null}
                    <label className="flex shrink-0 items-center gap-1.5 text-sm">
                      <Checkbox
                        checked={question.required}
                        onCheckedChange={(checked) =>
                          patchQuestion(question.localId, {
                            required: checked === true,
                          })
                        }
                      />
                      {messages.clinical.anamnesis.requiredLabel}
                    </label>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuestions((previous) => [...previous, emptyQuestion()])
                }
              >
                <Plus className="size-4" aria-hidden />
                {messages.clinical.anamnesis.addQuestion}
              </Button>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setEditor(null)}>
                {messages.config.cancel}
              </Button>
              <Button
                onClick={submit}
                disabled={save.isPending || name.trim().length < 2}
              >
                {save.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {messages.config.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
