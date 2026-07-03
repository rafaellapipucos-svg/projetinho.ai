"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { messages } from "@/messages/pt-br";

export function ClaimInvite({ token }: { token: string }) {
  const router = useRouter();
  const [result, setResult] = useState<
    | { status: "pending" }
    | { status: "ok"; name: string }
    | { status: "error"; message: string }
  >({ status: "pending" });
  const fired = useRef(false);

  const claim = api.portal.claimInvite.useMutation({
    onSuccess: (data) => setResult({ status: "ok", name: data.patientName }),
    onError: (error) => setResult({ status: "error", message: error.message }),
  });

  useEffect(() => {
    if (!fired.current) {
      fired.current = true;
      claim.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result.status === "pending") {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {messages.portal.invite.claiming}
      </p>
    );
  }

  if (result.status === "error") {
    return (
      <p className="text-destructive flex items-center gap-2 text-sm">
        <TriangleAlert className="size-4" aria-hidden />
        {result.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm">
        <Check className="size-4 text-emerald-600" aria-hidden />
        {messages.portal.invite.success(result.name)}
      </p>
      <Button
        className="w-full"
        onClick={() => {
          router.push("/portal");
          router.refresh();
        }}
      >
        {messages.portal.invite.goToPortal}
      </Button>
    </div>
  );
}
