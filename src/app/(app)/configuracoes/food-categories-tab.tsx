"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/app/_trpc/client";
import {
  foodCategoryInput,
  type FoodCategoryInput,
} from "@/lib/schemas/catalog";
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

type EditorState = { mode: "create" } | { mode: "edit"; id: string } | null;

export function FoodCategoriesTab() {
  const utils = api.useUtils();
  const list = api.catalog.foodCategories.list.useQuery();
  const [editor, setEditor] = useState<EditorState>(null);

  const form = useForm<FoodCategoryInput>({
    resolver: zodResolver(foodCategoryInput),
    defaultValues: { name: "" },
  });

  const onDone = (message: string) => {
    void utils.catalog.foodCategories.list.invalidate();
    setEditor(null);
    toast.success(message);
  };
  const onError = (error: { message: string }) => toast.error(error.message);

  const create = api.catalog.foodCategories.create.useMutation({
    onSuccess: () => onDone(messages.config.created),
    onError,
  });
  const update = api.catalog.foodCategories.update.useMutation({
    onSuccess: () => onDone(messages.config.updated),
    onError,
  });
  const remove = api.catalog.foodCategories.remove.useMutation({
    onSuccess: () => onDone(messages.config.deleted),
    onError,
  });

  function openCreate() {
    form.reset({ name: "" });
    setEditor({ mode: "create" });
  }

  function openEdit(item: { id: string; name: string }) {
    form.reset({ name: item.name });
    setEditor({ mode: "edit", id: item.id });
  }

  function onSubmit(values: FoodCategoryInput) {
    if (editor?.mode === "edit") {
      update.mutate({ id: editor.id, ...values });
    } else {
      create.mutate(values);
    }
  }

  const saving = create.isPending || update.isPending;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{messages.config.foodCategories.title}</CardTitle>
          <CardDescription>
            {messages.config.foodCategories.description}
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
                ? messages.config.foodCategories.editTitle
                : messages.config.foodCategories.newTitle}
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
                    <FormLabel>
                      {messages.config.foodCategories.nameLabel}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
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
