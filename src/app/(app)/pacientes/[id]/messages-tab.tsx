"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import { messages as t } from "@/messages/pt-br";

const REFETCH_MS = 15_000;

export function MessagesTab({ patientId }: { patientId: string }) {
  const utils = api.useUtils();
  // Polling leve: o chat da clínica não exige realtime (o portal do paciente
  // usa Supabase Realtime; aqui um refetch periódico basta).
  const list = api.operations.messages.list.useQuery(
    { patientId },
    { refetchInterval: REFETCH_MS },
  );
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = api.operations.messages.send.useMutation({
    onSuccess: () => {
      setBody("");
      void utils.operations.messages.list.invalidate({ patientId });
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list.data?.length]);

  function submit() {
    const text = body.trim();
    if (text.length === 0) return;
    send.mutate({ patientId, body: text });
  }

  return (
    <Card>
      <CardContent className="flex h-[28rem] flex-col pt-6">
        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {list.isPending ? (
            <Loader2
              className="text-muted-foreground size-5 animate-spin"
              aria-hidden
            />
          ) : list.data?.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <MessagesSquare
                className="text-muted-foreground size-8"
                aria-hidden
              />
              <p className="text-muted-foreground text-sm">{t.chat.empty}</p>
            </div>
          ) : (
            (list.data ?? []).map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.mine ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-1.5 text-sm",
                    message.mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px]",
                      message.mine
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {message.mine ? t.chat.you : message.senderName} ·{" "}
                    {formatDateTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={t.chat.placeholder}
          />
          <Button
            onClick={submit}
            disabled={send.isPending || body.trim() === ""}
          >
            <Send className="size-4" aria-hidden />
            {t.chat.send}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
