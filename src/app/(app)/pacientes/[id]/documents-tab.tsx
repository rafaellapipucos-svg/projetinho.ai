"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Printer, Trash2 } from "lucide-react";
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
import { renderMergeFields, MERGE_FIELDS } from "@/domain/documents/merge";
import { formatDate, toDateInputValue } from "@/lib/date";
import { messages } from "@/messages/pt-br";

const BLANK = "blank";

export function DocumentsTab({ patientId }: { patientId: string }) {
  const utils = api.useUtils();
  const list = api.operations.documents.list.useQuery({ patientId });
  const templates = api.operations.documents.templates.useQuery();
  const context = api.operations.documents.mergeContext.useQuery({ patientId });

  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState(BLANK);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => toDateInputValue(new Date()));

  const issue = api.operations.documents.issue.useMutation({
    onSuccess: () => {
      void utils.operations.documents.list.invalidate({ patientId });
      setCreating(false);
      setTitle("");
      setBody("");
      setTemplateId(BLANK);
      toast.success(messages.documents.issued);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.operations.documents.remove.useMutation({
    onSuccess: () => {
      void utils.operations.documents.list.invalidate({ patientId });
      toast.success(messages.documents.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  // Preview renderizado no cliente com o MESMO motor do servidor
  const preview = useMemo(
    () => (context.data ? renderMergeFields(body, context.data) : body),
    [body, context.data],
  );

  function chooseTemplate(value: string) {
    setTemplateId(value);
    const template = templates.data?.find((item) => item.id === value);
    if (template) {
      setBody(template.body);
      if (title.trim() === "") setTitle(template.name);
    }
  }

  function insertField(field: string) {
    setBody((previous) => `${previous}{{${field}}}`);
  }

  function openPrint(id: string) {
    window.open(`/imprimir/documento/${id}`, "_blank", "noopener");
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{messages.documents.title}</h3>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {messages.documents.newButton}
          </Button>
        </div>

        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : list.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="text-muted-foreground size-8" aria-hidden />
            <p className="text-muted-foreground text-sm">
              {messages.documents.empty}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((document) => (
              <li
                key={document.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {document.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(document.issuedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openPrint(document.id)}
                    aria-label={messages.documents.printButton}
                  >
                    <Printer className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate({ id: document.id })}
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

        <Dialog
          open={creating}
          onOpenChange={(open) => !open && setCreating(false)}
        >
          <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{messages.documents.form.title}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{messages.documents.form.templateLabel}</Label>
                    <Select value={templateId} onValueChange={chooseTemplate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={BLANK}>
                          {messages.documents.form.blank}
                        </SelectItem>
                        {(templates.data ?? []).map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="doc-date">
                      {messages.documents.form.dateLabel}
                    </Label>
                    <Input
                      id="doc-date"
                      type="date"
                      value={issuedAt}
                      onChange={(event) => setIssuedAt(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-title">
                    {messages.documents.form.titleLabel}
                  </Label>
                  <Input
                    id="doc-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="doc-body">
                    {messages.documents.form.bodyLabel}
                  </Label>
                  <Textarea
                    id="doc-body"
                    rows={10}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                  />
                </div>
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

              <div className="space-y-1">
                <Label>{messages.documents.form.previewLabel}</Label>
                <div className="min-h-[20rem] rounded-md border bg-white p-4 text-sm whitespace-pre-wrap text-black">
                  {preview}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setCreating(false)}>
                {messages.config.cancel}
              </Button>
              <Button
                onClick={() =>
                  issue.mutate({
                    patientId,
                    templateId: templateId === BLANK ? null : templateId,
                    title: title.trim(),
                    body,
                    issuedAt,
                  })
                }
                disabled={
                  issue.isPending ||
                  title.trim().length < 2 ||
                  body.trim() === ""
                }
              >
                {issue.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {messages.documents.newButton}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
