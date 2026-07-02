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

// Deriva do schema compartilhado: o <input type="time"> produz "" quando vazio.
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(40, messages.validation.nameMax40),
  defaultTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, messages.validation.timeInvalid)
    .or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;
type EditorState = { mode: "create" } | { mode: "edit"; id: string } | null;

export function MealTypesTab() {
  const utils = api.useUtils();
  const list = api.catalog.mealTypes.list.useQuery();
  const [editor, setEditor] = useState<EditorState>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", defaultTime: "" },
  });

  const onDone = (message: string) => {
    void utils.catalog.mealTypes.list.invalidate();
    setEditor(null);
    toast.success(message);
  };
  const onError = (error: { message: string }) => toast.error(error.message);

  const create = api.catalog.mealTypes.create.useMutation({
    onSuccess: () => onDone(messages.config.created),
    onError,
  });
  const update = api.catalog.mealTypes.update.useMutation({
    onSuccess: () => onDone(messages.config.updated),
    onError,
  });
  const remove = api.catalog.mealTypes.remove.useMutation({
    onSuccess: () => onDone(messages.config.deleted),
    onError,
  });

  function openCreate() {
    form.reset({ name: "", defaultTime: "" });
    setEditor({ mode: "create" });
  }

  function openEdit(item: {
    id: string;
    name: string;
    defaultTime: string | null;
  }) {
    form.reset({ name: item.name, defaultTime: item.defaultTime ?? "" });
    setEditor({ mode: "edit", id: item.id });
  }

  function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      defaultTime: values.defaultTime || null,
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
          <CardTitle>{messages.config.mealTypes.title}</CardTitle>
          <CardDescription>
            {messages.config.mealTypes.description}
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
                    {item.defaultTime ?? messages.config.noTime}
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
                ? messages.config.mealTypes.editTitle
                : messages.config.mealTypes.newTitle}
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
                    <FormLabel>{messages.config.mealTypes.nameLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{messages.config.mealTypes.timeLabel}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
