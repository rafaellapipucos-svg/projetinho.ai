"use client";

import { toast } from "sonner";
import { Copy, Download, Link2, ShieldOff } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messages } from "@/messages/pt-br";

export function PortalAccessCard({
  patientId,
  userId,
  inviteToken,
}: {
  patientId: string;
  userId: string | null;
  inviteToken: string | null;
}) {
  const utils = api.useUtils();
  const invalidate = () =>
    void utils.patient.byId.invalidate({ id: patientId });

  const generate = api.patient.portalAccess.generateInvite.useMutation({
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const revoke = api.patient.portalAccess.revoke.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(messages.patients.portalAccess.revoked);
    },
    onError: (error) => toast.error(error.message),
  });

  const inviteUrl = inviteToken
    ? `${typeof window === "undefined" ? "" : window.location.origin}/convite/${inviteToken}`
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {messages.patients.portalAccess.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {userId ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-emerald-600">
              {messages.patients.portalAccess.active}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => revoke.mutate({ id: patientId })}
              disabled={revoke.isPending}
            >
              <ShieldOff className="size-4" aria-hidden />
              {messages.patients.portalAccess.revokeButton}
            </Button>
          </div>
        ) : inviteUrl ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">
              {messages.patients.portalAccess.invited}
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 text-xs">
                {inviteUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success(messages.patients.portalAccess.copied);
                }}
              >
                <Copy className="size-4" aria-hidden />
                {messages.patients.portalAccess.copyButton}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generate.mutate({ id: patientId })}
              disabled={generate.isPending}
            >
              {messages.patients.portalAccess.regenerateButton}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground">
              {messages.patients.portalAccess.none}
            </p>
            <Button
              size="sm"
              onClick={() => generate.mutate({ id: patientId })}
              disabled={generate.isPending}
            >
              <Link2 className="size-4" aria-hidden />
              {messages.patients.portalAccess.generateButton}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-muted-foreground">
            {messages.lgpd.exportDescription}
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/pacientes/${patientId}/exportar`} download>
              <Download className="size-4" aria-hidden />
              {messages.lgpd.exportButton}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
