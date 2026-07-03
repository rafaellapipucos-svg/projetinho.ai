"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MERGE_FIELDS } from "@/domain/documents/merge";
import { messages } from "@/messages/pt-br";
import { RowActions } from "./row-actions";

type Template = RouterOutputs["operations"]["documents"]["templates"][number];
type EditorState = { id: string | null } | null;

export function DocumentTemplatesTab() {
  const utils = api.useUtils();
  const list = api.operations.documents.templates.useQuery();
  const [editor, setEditor] = useState<EditorState>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");

  const save = api.operations.documents.saveTemplate.useMutation({
    onSuccess: () => {
      void utils.operations.documents.templates.invalidate();
      setEditor(null);
      toast.success(messages.documents.templates.saved);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.operations.documents.deactivateTemplate.useMutation({
    onSuccess: () => {
      void utils.operations.documents.templates.invalidate();
      toast.success(messages.documents.templates.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  function openNew() {
    setName("");
    setBody("");
    setEditor({ id: null });
  }
  function openEdit(template: Template) {
    setName(template.name);
    setBody(template.body);
    setEditor({ id: template.id });
  }

  function insertField(field: string) {
    setBody((previous) => `${previous}{{${field}}}`);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{messages.documents.templates.title}</CardTitle>
          <CardDescription>
            {messages.documents.templates.description}
          </CardDescription>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          {messages.documents.templates.newButton}
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
            {(list.data ?? []).map((template) => (
              <li
                key={template.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{template.name}</span>
                  {template.isSystem ? (
                    <Badge variant="secondary">
                      {messages.config.systemBadge}
                    </Badge>
                  ) : null}
                </div>
                {!template.isSystem ? (
                  <RowActions
                    onEdit={() => openEdit(template)}
                    onDelete={() => remove.mutate({ id: template.id })}
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
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.id
                ? messages.documents.templates.editTitle
                : messages.documents.templates.newTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="doc-template-name">
                {messages.documents.templates.nameLabel}
              </Label>
              <Input
                id="doc-template-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-template-body">
                {messages.documents.templates.bodyLabel}
              </Label>
              <Textarea
                id="doc-template-body"
                rows={8}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1 text-xs">
                {messages.documents.form.fieldsHelp}
              </p>
              <div className="flex flex-wrap gap-1">
                {MERGE_FIELDS.map((field) => (
                  <Button
                    key={field.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => insertField(field.key)}
                  >
                    {`{{${field.key}}}`}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setEditor(null)}>
                {messages.config.cancel}
              </Button>
              <Button
                onClick={() =>
                  save.mutate({
                    id: editor?.id ?? null,
                    name: name.trim(),
                    body,
                  })
                }
                disabled={
                  save.isPending || name.trim().length < 2 || body.trim() === ""
                }
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
