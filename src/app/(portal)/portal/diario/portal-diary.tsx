"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, NotebookPen, Trash2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/date";
import { messages } from "@/messages/pt-br";

const NO_MEAL_TYPE = "none";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function nowForInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function PortalDiary() {
  const utils = api.useUtils();
  const me = api.portal.me.useQuery();
  const list = api.portal.diary.list.useQuery();

  const [description, setDescription] = useState("");
  const [mealTypeId, setMealTypeId] = useState(NO_MEAL_TYPE);
  const [entryAt, setEntryAt] = useState(nowForInput);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const add = api.portal.diary.add.useMutation({
    onSuccess: () => {
      void utils.portal.diary.list.invalidate();
      setDescription("");
      setMealTypeId(NO_MEAL_TYPE);
      setEntryAt(nowForInput());
      setPhoto(null);
      toast.success(messages.portal.diary.added);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.portal.diary.remove.useMutation({
    onSuccess: () => {
      void utils.portal.diary.list.invalidate();
      toast.success(messages.portal.diary.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  async function submit() {
    if (!me.data || description.trim().length === 0) return;
    setSaving(true);
    try {
      let photoPath: string | null = null;
      if (photo) {
        if (photo.size > MAX_PHOTO_BYTES) {
          toast.error(messages.patients.attachments.tooLarge);
          return;
        }
        photoPath = `org/${me.data.organizationId}/patients/${me.data.patientId}/diary/${crypto.randomUUID()}.jpg`;
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("attachments")
          .upload(photoPath, photo);
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      add.mutate({
        entryAt: new Date(entryAt).toISOString(),
        mealTypeId: mealTypeId === NO_MEAL_TYPE ? null : mealTypeId,
        description: description.trim(),
        photoPath,
      });
    } finally {
      setSaving(false);
    }
  }

  async function openPhoto(path: string) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("attachments")
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error(messages.patients.attachments.openError);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">
        {messages.portal.diary.title}
      </h1>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="space-y-1">
            <Label htmlFor="diary-description">
              {messages.portal.diary.descriptionLabel}
            </Label>
            <Textarea
              id="diary-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="diary-when">
                {messages.portal.diary.whenLabel}
              </Label>
              <Input
                id="diary-when"
                type="datetime-local"
                value={entryAt}
                onChange={(event) => setEntryAt(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{messages.portal.diary.mealTypeLabel}</Label>
              <Select value={mealTypeId} onValueChange={setMealTypeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MEAL_TYPE}>
                    {messages.portal.diary.noMealType}
                  </SelectItem>
                  {(me.data?.mealTypes ?? []).map((mealType) => (
                    <SelectItem key={mealType.id} value={mealType.id}>
                      {mealType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => photoRef.current?.click()}
            >
              <Camera className="size-4" aria-hidden />
              {photo
                ? messages.portal.diary.photoSelected
                : messages.portal.diary.photoLabel}
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={
                saving || add.isPending || description.trim().length === 0
              }
            >
              {saving || add.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {messages.portal.diary.addButton}
            </Button>
          </div>
        </CardContent>
      </Card>

      {list.isPending ? (
        <Loader2
          className="text-muted-foreground size-5 animate-spin"
          aria-hidden
        />
      ) : list.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <NotebookPen className="text-muted-foreground size-8" aria-hidden />
            <p className="text-muted-foreground text-sm">
              {messages.portal.diary.empty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {(list.data ?? []).map((entry) => (
            <li key={entry.id}>
              <Card>
                <CardHeader className="flex-row items-start justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium">
                    {formatDateTime(entry.entryAt)}
                    {entry.mealType ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {entry.mealType.name}
                      </span>
                    ) : null}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => remove.mutate({ id: entry.id })}
                    disabled={remove.isPending}
                    aria-label={messages.config.delete}
                  >
                    <Trash2 className="text-destructive size-3.5" aria-hidden />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{entry.description}</p>
                  {entry.photoPath ? (
                    <button
                      type="button"
                      className="text-muted-foreground text-xs underline underline-offset-2"
                      onClick={() => void openPhoto(entry.photoPath ?? "")}
                    >
                      {messages.portal.diary.openPhoto}
                    </button>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
