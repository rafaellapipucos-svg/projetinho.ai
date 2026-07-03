"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/app/_trpc/client";
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
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";
import { RowActions } from "./row-actions";

const numericField = z
  .string()
  .trim()
  .refine(
    (value) => value !== "" && Number.isFinite(Number(value.replace(",", "."))),
    {
      message: messages.validation.numberInvalid,
    },
  );

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, messages.validation.nameMin2)
    .max(60, messages.validation.nameMax60),
  durationMinutes: numericField,
  priceReais: numericField,
});

type FormValues = z.infer<typeof formSchema>;
type EditorState = { mode: "create" } | { mode: "edit"; id: string } | null;

export function ServicesTab() {
  const utils = api.useUtils();
  const list = api.operations.services.list.useQuery();
  const [editor, setEditor] = useState<EditorState>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", durationMinutes: "60", priceReais: "0" },
  });

  const onDone = (message: string) => {
    void utils.operations.services.list.invalidate();
    setEditor(null);
    toast.success(message);
  };
  const onError = (error: { message: string }) => toast.error(error.message);

  const create = api.operations.services.create.useMutation({
    onSuccess: () => onDone(messages.services.created),
    onError,
  });
  const update = api.operations.services.update.useMutation({
    onSuccess: () => onDone(messages.services.updated),
    onError,
  });
  const remove = api.operations.services.remove.useMutation({
    onSuccess: () => onDone(messages.services.removed),
    onError,
  });

  function openCreate() {
    form.reset({ name: "", durationMinutes: "60", priceReais: "0" });
    setEditor({ mode: "create" });
  }
  function openEdit(service: {
    id: string;
    name: string;
    durationMinutes: number;
    priceReais: number;
  }) {
    form.reset({
      name: service.name,
      durationMinutes: String(service.durationMinutes),
      priceReais: String(service.priceReais),
    });
    setEditor({ mode: "edit", id: service.id });
  }

  function onSubmit(values: FormValues) {
    const payload = {
      name: values.name,
      durationMinutes: Math.round(
        Number(values.durationMinutes.replace(",", ".")),
      ),
      priceCents: Math.round(Number(values.priceReais.replace(",", ".")) * 100),
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
          <CardTitle>{messages.services.title}</CardTitle>
          <CardDescription>{messages.services.description}</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" aria-hidden />
          {messages.services.newButton}
        </Button>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : list.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {messages.services.empty}
          </p>
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((service) => (
              <li
                key={service.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <span className="font-medium">{service.name}</span>
                  <span className="text-muted-foreground ml-2 text-sm">
                    {messages.services.minutes(service.durationMinutes)} · R${" "}
                    {formatNumber(service.priceReais, 2)}
                  </span>
                </div>
                <RowActions
                  onEdit={() => openEdit(service)}
                  onDelete={() => remove.mutate({ id: service.id })}
                  deleting={remove.isPending}
                />
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
                ? messages.services.editTitle
                : messages.services.newTitle}
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
                    <FormLabel>{messages.services.nameLabel}</FormLabel>
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
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{messages.services.durationLabel}</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceReais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{messages.services.priceLabel}</FormLabel>
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
