"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { messages } from "@/messages/pt-br";
import { RowActions } from "./row-actions";

// Inputs numéricos produzem string no formulário; ""→null no submit.
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(60, messages.validation.nameMax60),
  unit: z.string().trim().max(20),
  referenceMin: z.string(),
  referenceMax: z.string(),
});

type FormValues = z.infer<typeof formSchema>;
type EditorState = { mode: "create" } | { mode: "edit"; id: string } | null;

function toNumberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function rangeLabel(range: unknown, unit: string | null): string | null {
  if (typeof range !== "object" || range === null) return null;
  const { min, max } = range as { min?: number; max?: number };
  const suffix = unit ? ` ${unit}` : "";
  if (min != null && max != null) return `${min}–${max}${suffix}`;
  if (min != null) return `≥ ${min}${suffix}`;
  if (max != null) return `≤ ${max}${suffix}`;
  return null;
}

export function ExamTypesTab() {
  const utils = api.useUtils();
  const list = api.catalog.examTypes.list.useQuery();
  const [editor, setEditor] = useState<EditorState>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", unit: "", referenceMin: "", referenceMax: "" },
  });

  const onDone = (message: string) => {
    void utils.catalog.examTypes.list.invalidate();
    setEditor(null);
    toast.success(message);
  };
  const onError = (error: { message: string }) => toast.error(error.message);

  const create = api.catalog.examTypes.create.useMutation({
    onSuccess: () => onDone(messages.config.created),
    onError,
  });
  const update = api.catalog.examTypes.update.useMutation({
    onSuccess: () => onDone(messages.config.updated),
    onError,
  });
  const remove = api.catalog.examTypes.remove.useMutation({
    onSuccess: () => onDone(messages.config.deleted),
    onError,
  });

  function openCreate() {
    form.reset({ name: "", unit: "", referenceMin: "", referenceMax: "" });
    setEditor({ mode: "create" });
  }

  function openEdit(item: {
    id: string;
    name: string;
    unit: string | null;
    referenceRange: unknown;
  }) {
    const range = (item.referenceRange ?? {}) as { min?: number; max?: number };
    form.reset({
      name: item.name,
      unit: item.unit ?? "",
      referenceMin: range.min != null ? String(range.min) : "",
      referenceMax: range.max != null ? String(range.max) : "",
    });
    setEditor({ mode: "edit", id: item.id });
  }

  function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      unit: values.unit || null,
      referenceMin: toNumberOrNull(values.referenceMin),
      referenceMax: toNumberOrNull(values.referenceMax),
    };
    if (editor?.mode === "edit") {
      update.mutate({ id: editor.id, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{messages.config.examTypes.title}</CardTitle>
          <CardDescription>
            {messages.config.examTypes.description}
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          {messages.config.newButton}
        </Button>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {rangeLabel(item.referenceRange, item.unit) ??
                      item.unit ??
                      ""}
                  </span>
                  {item.isSystem ? (
                    <Badge variant="secondary">
                      {messages.config.systemBadge}
                    </Badge>
                  ) : null}
                </div>
                {!item.isSystem ? (
                  <RowActions
                    onEdit={() => openEdit(item)}
                    onDelete={() => remove.mutate({ id: item.id })}
                    deleting={remove.isPending}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === "edit"
                ? messages.config.examTypes.editTitle
                : messages.config.examTypes.newTitle}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{messages.config.examTypes.nameLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{messages.config.examTypes.unitLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="referenceMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {messages.config.examTypes.minLabel}
                      </FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="referenceMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {messages.config.examTypes.maxLabel}
                      </FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditor(null)}
                >
                  {messages.config.cancel}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {messages.config.save}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
