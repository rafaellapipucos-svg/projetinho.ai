"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { messages } from "@/messages/pt-br";
import { PlanCreateDialog } from "./plan-create-dialog";

export function TemplatesPage() {
  const list = api.plan.listTemplates.useQuery();
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.plans.templatesTitle}
          </h1>
          <p className="text-muted-foreground">
            {messages.plans.templatesSubtitle}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          {messages.plans.newTemplateButton}
        </Button>
      </div>

      {list.isPending ? (
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      ) : list.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ClipboardList
              className="text-muted-foreground size-10"
              aria-hidden
            />
            <p className="text-muted-foreground">
              {messages.plans.templatesEmpty}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border">
          {(list.data ?? []).map((template) => (
            <li key={template.id}>
              <Link
                href={`/planos/${template.id}`}
                className="hover:bg-accent flex items-center justify-between px-4 py-3 transition-colors"
              >
                <span className="font-medium">{template.name}</span>
                <span className="text-muted-foreground text-sm">
                  {messages.plans.daysCount(template.dayCount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <PlanCreateDialog
        open={creating}
        patientId={null}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
