"use client";

import { Plus, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { messages } from "@/messages/pt-br";
import { useBuilder } from "./store";

/** Barra de dias: seleção, nome, dias da semana e adição/remoção. */
export function DayBar({ readOnly }: { readOnly: boolean }) {
  const dayOrder = useBuilder(useShallow((state) => state.dayOrder));
  const days = useBuilder((state) => state.days);
  const selectedDayId = useBuilder((state) => state.selectedDayId);
  const selectDay = useBuilder((state) => state.selectDay);
  const addDay = useBuilder((state) => state.addDay);
  const updateDay = useBuilder((state) => state.updateDay);
  const removeDay = useBuilder((state) => state.removeDay);

  const selected = selectedDayId ? days[selectedDayId] : undefined;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {dayOrder.map((dayId) => (
          <button
            key={dayId}
            type="button"
            onClick={() => selectDay(dayId)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              dayId === selectedDayId
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-accent",
            )}
          >
            {days[dayId]?.name}
          </button>
        ))}
        {!readOnly ? (
          <Button variant="outline" size="sm" onClick={addDay}>
            <Plus className="size-4" aria-hidden />
            {messages.plans.builder.addDay}
          </Button>
        ) : null}
      </div>

      {selected && !readOnly ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
          <Input
            className="h-8 w-40"
            value={selected.name}
            onChange={(event) =>
              updateDay(selected.id, { name: event.target.value })
            }
            aria-label={messages.plans.builder.dayNameLabel}
          />
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-xs">
              {messages.plans.builder.weekdaysLabel}:
            </span>
            {messages.plans.builder.weekdaysShort.map((label, weekday) => {
              const active = selected.weekdays.includes(weekday);
              return (
                <button
                  key={weekday}
                  type="button"
                  onClick={() =>
                    updateDay(selected.id, {
                      weekdays: active
                        ? selected.weekdays.filter((value) => value !== weekday)
                        : [...selected.weekdays, weekday].sort(),
                    })
                  }
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {dayOrder.length > 1 ? (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => removeDay(selected.id)}
              aria-label={messages.plans.builder.removeDay}
            >
              <Trash2 className="text-destructive size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
