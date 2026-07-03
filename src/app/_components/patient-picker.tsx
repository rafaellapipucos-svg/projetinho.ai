"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

/** Busca de paciente por nome (type-ahead). Reutilizado na agenda. */
export function PatientPicker({
  placeholder,
  onSelect,
  initialLabel = "",
}: {
  placeholder: string;
  onSelect: (patient: { id: string; name: string }) => void;
  initialLabel?: string;
}) {
  const [term, setTerm] = useState(initialLabel);
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

  const list = api.patient.list.useQuery(
    { term: debounced },
    { enabled: debounced.length >= 2 },
  );

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
        />
        {list.isFetching ? (
          <Loader2
            className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin"
            aria-hidden
          />
        ) : null}
      </div>
      {open && debounced.length >= 2 ? (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border shadow-md">
          {(list.data ?? []).map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => {
                onSelect({ id: patient.id, name: patient.name });
                setTerm(patient.name);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm",
                "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {patient.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
