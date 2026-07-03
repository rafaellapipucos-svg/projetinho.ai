"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";
import { PaymentDialog } from "./payment-dialog";

type Payment = RouterOutputs["finance"]["list"][number];
type StatusFilter = "all" | "pending" | "paid" | "cancelled";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> =
  {
    paid: "default",
    pending: "secondary",
    cancelled: "destructive",
  };

export function FinanceView() {
  const utils = api.useUtils();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dialog, setDialog] = useState<
    { mode: "new" } | { mode: "edit"; payment: Payment } | null
  >(null);

  const totals = api.finance.totals.useQuery();
  const list = api.finance.list.useQuery(status === "all" ? {} : { status });

  const remove = api.finance.remove.useMutation({
    onSuccess: () => {
      void utils.finance.invalidate();
      toast.success(messages.finance.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.finance.title}
          </h1>
          <p className="text-muted-foreground">{messages.finance.subtitle}</p>
        </div>
        <Button onClick={() => setDialog({ mode: "new" })}>
          <Plus className="size-4" aria-hidden />
          {messages.finance.newButton}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Wallet className="text-muted-foreground size-5" aria-hidden />
            <div>
              <p className="text-muted-foreground text-xs">
                {messages.finance.paidTotal}
              </p>
              <p className="text-xl font-semibold tabular-nums">
                R$ {formatNumber(totals.data?.paidReais ?? 0, 2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Wallet className="text-muted-foreground size-5" aria-hidden />
            <div>
              <p className="text-muted-foreground text-xs">
                {messages.finance.pendingTotal}
              </p>
              <p className="text-xl font-semibold tabular-nums">
                R$ {formatNumber(totals.data?.pendingReais ?? 0, 2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{messages.finance.filterAll}</SelectItem>
            <SelectItem value="pending">
              {messages.finance.status.pending}
            </SelectItem>
            <SelectItem value="paid">{messages.finance.status.paid}</SelectItem>
            <SelectItem value="cancelled">
              {messages.finance.status.cancelled}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {list.isPending ? (
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      ) : list.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Wallet className="text-muted-foreground size-10" aria-hidden />
            <p className="text-muted-foreground">{messages.finance.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border">
          {(list.data ?? []).map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setDialog({ mode: "edit", payment })}
              >
                <p className="flex items-center gap-2 text-sm font-medium">
                  {payment.description}
                  <Badge
                    variant={STATUS_VARIANT[payment.status] ?? "secondary"}
                  >
                    {messages.finance.status[payment.status]}
                  </Badge>
                </p>
                <p className="text-muted-foreground text-xs">
                  {payment.patientName}
                  {payment.paidAt ? ` · ${formatDate(payment.paidAt)}` : ""}
                </p>
              </button>
              <span className="shrink-0 tabular-nums">
                R$ {formatNumber(payment.amountReais, 2)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove.mutate({ id: payment.id })}
                disabled={remove.isPending}
                aria-label={messages.config.delete}
              >
                <Trash2 className="text-destructive size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <PaymentDialog
        open={dialog !== null}
        payment={dialog?.mode === "edit" ? dialog.payment : null}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
