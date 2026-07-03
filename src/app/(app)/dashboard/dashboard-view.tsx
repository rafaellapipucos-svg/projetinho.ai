"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/app/_trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";

const MONTH_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
});

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="bg-muted rounded-md p-2">
          <Icon className="size-5" aria-hidden />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardView() {
  const data = api.finance.dashboard.useQuery();

  if (data.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      </div>
    );
  }
  if (!data.data) return null;
  const summary = data.data;

  const chartData = summary.revenueByMonth.map((row) => ({
    month: MONTH_FORMAT.format(new Date(row.month)),
    reais: row.reais,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Users}
          label={messages.dashboard.patients}
          value={String(summary.patientCount)}
        />
        <Metric
          icon={ClipboardList}
          label={messages.dashboard.activePlans}
          value={String(summary.activePlanCount)}
        />
        <Metric
          icon={Wallet}
          label={messages.dashboard.paid}
          value={`R$ ${formatNumber(summary.paidReais, 2)}`}
        />
        <Metric
          icon={Wallet}
          label={messages.dashboard.pending}
          value={`R$ ${formatNumber(summary.pendingReais, 2)}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {messages.dashboard.upcomingTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {messages.dashboard.upcomingEmpty}
              </p>
            ) : (
              <ul className="divide-y text-sm">
                {summary.upcoming.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays
                        className="text-muted-foreground size-4"
                        aria-hidden
                      />
                      {appointment.patientName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDateTime(appointment.startsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {messages.dashboard.revenueTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {messages.dashboard.revenueEmpty}
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value) =>
                        `R$ ${formatNumber(Number(value), 2)}`
                      }
                    />
                    <Bar dataKey="reais" fill="var(--chart-1)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-sm">
        <Link href="/financeiro" className="underline underline-offset-4">
          {messages.nav.finance}
        </Link>
      </p>
    </div>
  );
}
