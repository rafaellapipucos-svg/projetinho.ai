"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2, Plus } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date";
import { messages } from "@/messages/pt-br";
import { PlanCreateDialog } from "../../planos/plan-create-dialog";

export function PlansTab({ patientId }: { patientId: string }) {
  const list = api.plan.listByPatient.useQuery({ patientId });
  const [creating, setCreating] = useState(false);

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{messages.plans.title}</h3>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden />
            {messages.plans.newPlanButton}
          </Button>
        </div>

        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : list.data?.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ClipboardList
              className="text-muted-foreground size-8"
              aria-hidden
            />
            <p className="text-muted-foreground text-sm">
              {messages.plans.empty}
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/planos/${plan.id}`}
                  className="hover:bg-accent flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{plan.name}</span>
                    <Badge
                      variant={
                        plan.status === "active" ? "default" : "secondary"
                      }
                    >
                      {messages.plans.status[plan.status]}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-sm">
                    {messages.plans.daysCount(plan.dayCount)} ·{" "}
                    {formatDate(plan.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <PlanCreateDialog
          open={creating}
          patientId={patientId}
          onClose={() => setCreating(false)}
        />
      </CardContent>
    </Card>
  );
}
