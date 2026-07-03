"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api, type RouterOutputs } from "@/app/_trpc/client";
import { FoodPicker } from "@/app/_components/food-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveGrams } from "@/domain/nutrition/quantity";
import { formatNumber } from "@/lib/format";
import { messages } from "@/messages/pt-br";
import { RowActions } from "./row-actions";

type Group = RouterOutputs["equivalence"]["list"][number];

interface DraftItem {
  localId: string;
  foodId: string;
  foodName: string;
  measures: Array<{ id: string; name: string; gramWeight: number }>;
  quantity: string;
  selection: string; // "m:<id>" ou "u:<id>"
}

export function EquivalenceTab() {
  const utils = api.useUtils();
  const list = api.equivalence.list.useQuery();
  const units = api.catalog.system.measurementUnits.useQuery();

  const [editor, setEditor] = useState<{ id: string | null } | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const usableUnits = (units.data ?? []).filter(
    (unit) => unit.gramsPerUnit !== null,
  );
  const gramUnitId = usableUnits.find((unit) => unit.key === "g")?.id;

  const save = api.equivalence.save.useMutation({
    onSuccess: () => {
      void utils.equivalence.list.invalidate();
      setEditor(null);
      toast.success(messages.equivalence.saved);
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.equivalence.remove.useMutation({
    onSuccess: () => {
      void utils.equivalence.list.invalidate();
      toast.success(messages.equivalence.removed);
    },
    onError: (error) => toast.error(error.message),
  });

  function openNew() {
    setName("");
    setItems([]);
    setEditor({ id: null });
  }

  async function openEdit(group: Group) {
    setName(group.name);
    const drafts = await Promise.all(
      group.items.map(async (item) => {
        const food = await utils.food.byId.fetch({ id: item.foodId });
        return {
          localId: crypto.randomUUID(),
          foodId: item.foodId,
          foodName: item.foodName,
          measures: food.measures.map((measure) => ({
            id: measure.id,
            name: measure.name,
            gramWeight: measure.gramWeight,
          })),
          quantity: String(item.quantity),
          selection: item.foodMeasureId
            ? `m:${item.foodMeasureId}`
            : `u:${item.measurementUnitId ?? ""}`,
        } satisfies DraftItem;
      }),
    );
    setItems(drafts);
    setEditor({ id: group.id });
  }

  async function addFood(foodId: string) {
    const food = await utils.food.byId.fetch({ id: foodId });
    const firstMeasure = food.measures[0];
    setItems((previous) => [
      ...previous,
      {
        localId: crypto.randomUUID(),
        foodId: food.id,
        foodName: food.name,
        measures: food.measures.map((measure) => ({
          id: measure.id,
          name: measure.name,
          gramWeight: measure.gramWeight,
        })),
        quantity: firstMeasure ? "1" : "100",
        selection: firstMeasure
          ? `m:${firstMeasure.id}`
          : `u:${gramUnitId ?? ""}`,
      },
    ]);
  }

  function gramsFor(item: DraftItem): number | null {
    const quantity = Number(item.quantity.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    try {
      if (item.selection.startsWith("m:")) {
        const measure = item.measures.find(
          (m) => m.id === item.selection.slice(2),
        );
        return measure
          ? resolveGrams(quantity, { measureGramWeight: measure.gramWeight })
          : null;
      }
      const unit = usableUnits.find((u) => u.id === item.selection.slice(2));
      return unit
        ? resolveGrams(quantity, {
            unit: { type: unit.type, gramsPerUnit: unit.gramsPerUnit },
          })
        : null;
    } catch {
      return null;
    }
  }

  function submit() {
    const payload = items.map((item) => ({
      foodId: item.foodId,
      quantity: Number(item.quantity.replace(",", ".")),
      measurementUnitId: item.selection.startsWith("u:")
        ? item.selection.slice(2)
        : null,
      foodMeasureId: item.selection.startsWith("m:")
        ? item.selection.slice(2)
        : null,
    }));
    save.mutate({ id: editor?.id ?? null, name: name.trim(), items: payload });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{messages.equivalence.title}</CardTitle>
          <CardDescription>{messages.equivalence.description}</CardDescription>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="size-4" aria-hidden />
          {messages.equivalence.newButton}
        </Button>
      </CardHeader>
      <CardContent>
        {list.isPending ? (
          <Loader2
            className="text-muted-foreground size-5 animate-spin"
            aria-hidden
          />
        ) : list.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {messages.equivalence.empty}
          </p>
        ) : (
          <ul className="divide-y">
            {(list.data ?? []).map((group) => (
              <li
                key={group.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <span className="font-medium">{group.name}</span>
                  <span className="text-muted-foreground ml-2 text-sm">
                    {messages.equivalence.itemsCount(group.items.length)}
                  </span>
                </div>
                <RowActions
                  onEdit={() => void openEdit(group)}
                  onDelete={() => remove.mutate({ id: group.id })}
                  deleting={remove.isPending}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={editor !== null}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.id
                ? messages.equivalence.editTitle
                : messages.equivalence.newTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="equiv-name">
                {messages.equivalence.nameLabel}
              </Label>
              <Input
                id="equiv-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <FoodPicker
              placeholder={messages.equivalence.addFoodPlaceholder}
              onSelect={(food) => void addFood(food.id)}
              clearOnSelect
            />

            <ul className="space-y-2">
              {items.map((item) => {
                const grams = gramsFor(item);
                return (
                  <li
                    key={item.localId}
                    className="grid grid-cols-[1fr_4.5rem_9rem_auto] items-center gap-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.foodName}
                      </p>
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {grams !== null ? `${formatNumber(grams, 0)} g` : "—"}
                      </p>
                    </div>
                    <Input
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(event) =>
                        setItems((previous) =>
                          previous.map((candidate) =>
                            candidate.localId === item.localId
                              ? { ...candidate, quantity: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                      aria-label={messages.recipes.editor.quantityLabel}
                    />
                    <Select
                      value={item.selection}
                      onValueChange={(value) =>
                        setItems((previous) =>
                          previous.map((candidate) =>
                            candidate.localId === item.localId
                              ? { ...candidate, selection: value }
                              : candidate,
                          ),
                        )
                      }
                    >
                      <SelectTrigger
                        aria-label={messages.recipes.editor.unitLabel}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {item.measures.map((measure) => (
                          <SelectItem
                            key={measure.id}
                            value={`m:${measure.id}`}
                          >
                            {measure.name} (
                            {formatNumber(measure.gramWeight, 0)} g)
                          </SelectItem>
                        ))}
                        {usableUnits.map((unit) => (
                          <SelectItem key={unit.id} value={`u:${unit.id}`}>
                            {unit.name} ({unit.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setItems((previous) =>
                          previous.filter((c) => c.localId !== item.localId),
                        )
                      }
                      aria-label={messages.config.delete}
                    >
                      <Trash2 className="text-destructive size-4" aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setEditor(null)}>
                {messages.config.cancel}
              </Button>
              <Button
                onClick={submit}
                disabled={
                  save.isPending || name.trim().length < 2 || items.length === 0
                }
              >
                {save.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {messages.config.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
