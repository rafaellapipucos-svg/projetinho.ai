"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";
import { cn } from "@/lib/utils";

export type FoodSearchResult = RouterOutputs["food"]["search"][number];

const DEBOUNCE_MS = 300;

/**
 * Busca de alimento com type-ahead (índice trigram no servidor).
 * Reutilizado na tela de alimentos, no editor de receitas e no builder.
 */
export function FoodPicker({
  placeholder,
  onSelect,
  clearOnSelect = false,
  autoFocus = false,
}: {
  placeholder: string;
  onSelect: (food: FoodSearchResult) => void;
  clearOnSelect?: boolean;
  autoFocus?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const enabled = debounced.length >= 2;
  const search = api.food.search.useQuery({ term: debounced }, { enabled });

  function handleSelect(food: FoodSearchResult) {
    onSelect(food);
    setOpen(false);
    if (clearOnSelect) {
      setTerm("");
      setDebounced("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={open && enabled}
        />
        {search.isFetching ? (
          <Loader2
            className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
            aria-hidden
          />
        ) : null}
      </div>
      {open && enabled ? (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border shadow-md">
          {search.data?.length === 0 && !search.isFetching ? (
            <p className="text-muted-foreground p-3 text-sm">
              {messages.foods.noResults}
            </p>
          ) : null}
          {(search.data ?? []).map((food) => (
            <button
              key={food.id}
              type="button"
              onClick={() => handleSelect(food)}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">{food.name}</span>
                {food.isOwn ? (
                  <Badge variant="secondary">{messages.foods.ownBadge}</Badge>
                ) : null}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {food.energyKcal !== null
                  ? `${formatNumber(food.energyKcal, 0)} kcal`
                  : "—"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
