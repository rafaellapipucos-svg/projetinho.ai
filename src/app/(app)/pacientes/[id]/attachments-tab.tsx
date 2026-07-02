"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/format";
import { formatDateTime } from "@/lib/date";
import { messages } from "@/messages/pt-br";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .slice(0, 80) || "arquivo"
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024)
    return `${formatNumber(bytes / (1024 * 1024), 1)} MB`;
  return `${formatNumber(bytes / 1024, 0)} KB`;
}

export function AttachmentsTab({ patientId }: { patientId: string }) {
  const utils = api.useUtils();
  const organization = api.organization.current.useQuery();
  const list = api.patient.attachments.list.useQuery({ id: patientId });
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const register = api.patient.attachments.register.useMutation({
    onSuccess: () => {
      void utils.patient.attachments.list.invalidate({ id: patientId });
      toast.success(messages.patients.attachments.uploaded);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.patient.attachments.remove.useMutation({
    onSuccess: () => {
      void utils.patient.attachments.list.invalidate({ id: patientId });
      toast.success(messages.patients.attachments.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  async function handleFile(file: File) {
    if (!organization.data) return;
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(messages.patients.attachments.tooLarge);
      return;
    }
    setUploading(true);
    try {
      const path = `org/${organization.data.id}/patients/${patientId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("attachments")
        .upload(path, file);
      if (error) {
        toast.error(error.message);
        return;
      }
      register.mutate({
        patientId,
        fileName: file.name,
        storagePath: path,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    } finally {
      setUploading(false);
    }
  }

  async function open(storagePath: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUrl(storagePath, 60);
    if (error || !data) {
      toast.error(messages.patients.attachments.openError);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {messages.patients.attachments.title}
          </h3>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading || organization.isPending}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            {uploading
              ? messages.patients.attachments.uploading
              : messages.patients.attachments.uploadButton}
          </Button>
        </div>

        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : list.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {messages.patients.attachments.empty}
          </p>
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((attachment) => (
              <li
                key={attachment.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => void open(attachment.storagePath)}
                  className="flex min-w-0 items-center gap-2 text-left text-sm hover:underline"
                >
                  <FileText
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                  <span className="truncate font-medium">
                    {attachment.fileName}
                  </span>
                </button>
                <span className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
                  {formatSize(attachment.sizeBytes)} ·{" "}
                  {formatDateTime(attachment.createdAt)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove.mutate({ id: attachment.id })}
                    disabled={remove.isPending}
                    aria-label={messages.config.delete}
                  >
                    <Trash2 className="text-destructive size-4" aria-hidden />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
