"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/date";
import { messages } from "@/messages/pt-br";
import { AppointmentDialog } from "./appointment-dialog";

type Appointment = RouterOutputs["operations"]["appointments"]["range"][number];

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  scheduled: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  no_show: "destructive",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Segunda-feira 00:00 da semana que contém `date`. */
function weekStart(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  const diff = (day + 6) % 7; // 0=domingo → volta 6; 1=segunda → volta 0
  result.setDate(result.getDate() - diff);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function timeLabel(value: Date | string): string {
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AgendaView() {
  const utils = api.useUtils();
  const [anchor, setAnchor] = useState(() => weekStart(new Date()));
  const [dialog, setDialog] = useState<
    { mode: "new" } | { mode: "edit"; appointment: Appointment } | null
  >(null);

  const from = anchor;
  const to = addDays(anchor, 7);
  const range = api.operations.appointments.range.useQuery({
    from: from.toISOString(),
    to: to.toISOString(),
  });

  const setStatus = api.operations.appointments.setStatus.useMutation({
    onSuccess: () => {
      void utils.operations.appointments.range.invalidate();
    },
  });

  const appointments = range.data;
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appointment of appointments ?? []) {
      const key = new Date(appointment.startsAt).toDateString();
      map.set(key, [...(map.get(key) ?? []), appointment]);
    }
    return map;
  }, [appointments]);

  const days = Array.from({ length: 7 }, (_, index) => addDays(anchor, index));
  const rangeLabel = `${formatDate(from)} – ${formatDate(addDays(anchor, 6))}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.agenda.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {messages.agenda.weekOf(rangeLabel)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchor(addDays(anchor, -7))}
            aria-label={messages.agenda.prevWeek}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            onClick={() => setAnchor(weekStart(new Date()))}
          >
            {messages.agenda.today}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAnchor(addDays(anchor, 7))}
            aria-label={messages.agenda.nextWeek}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button onClick={() => setDialog({ mode: "new" })}>
            <Plus className="size-4" aria-hidden />
            {messages.agenda.newButton}
          </Button>
        </div>
      </div>

      {range.isPending ? (
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day) => {
            const appointments = byDay.get(day.toDateString()) ?? [];
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <Card
                key={day.toISOString()}
                className={isToday ? "border-primary" : ""}
              >
                <CardContent className="space-y-2 p-3">
                  <p className="text-sm font-medium">
                    {WEEKDAYS[day.getDay()]} {day.getDate()}
                  </p>
                  {appointments.length === 0 ? (
                    <p className="text-muted-foreground text-xs">—</p>
                  ) : (
                    appointments.map((appointment) => (
                      <DropdownMenu key={appointment.id}>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="hover:bg-accent w-full rounded border p-1.5 text-left text-xs"
                          >
                            <span className="font-medium">
                              {timeLabel(appointment.startsAt)}
                            </span>{" "}
                            <span className="block truncate">
                              {appointment.patientName}
                            </span>
                            <Badge
                              variant={
                                STATUS_VARIANT[appointment.status] ??
                                "secondary"
                              }
                              className="mt-1"
                            >
                              {
                                messages.agenda.status[
                                  appointment.status as keyof typeof messages.agenda.status
                                ]
                              }
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            onSelect={() =>
                              setDialog({ mode: "edit", appointment })
                            }
                          >
                            {messages.config.edit}
                          </DropdownMenuItem>
                          {(
                            [
                              "confirmed",
                              "completed",
                              "cancelled",
                              "no_show",
                            ] as const
                          ).map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onSelect={() =>
                                setStatus.mutate({ id: appointment.id, status })
                              }
                            >
                              {messages.agenda.setStatus}:{" "}
                              {messages.agenda.status[status]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AppointmentDialog
        open={dialog !== null}
        appointment={dialog?.mode === "edit" ? dialog.appointment : null}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
