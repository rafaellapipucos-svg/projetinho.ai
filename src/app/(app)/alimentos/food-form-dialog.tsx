"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
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
import { messages } from "@/messages/pt-br";

const NO_CATEGORY = "none";

function parseAmount(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Criação/edição de alimento próprio. Os campos de nutrientes são gerados
 * dinamicamente a partir do catálogo — nenhum nutriente chumbado na UI.
 */
export function FoodFormDialog({
  open,
  editingFoodId,
  onClose,
}: {
  open: boolean;
  editingFoodId: string | null;
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const nutrients = api.catalog.system.nutrients.useQuery(undefined, {
    enabled: open,
  });
  const categories = api.catalog.foodCategories.list.useQuery(undefined, {
    enabled: open,
  });
  const editing = api.food.byId.useQuery(
    { id: editingFoodId ?? "" },
    { enabled: open && editingFoodId !== null },
  );

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [baseUnit, setBaseUnit] = useState<"g" | "ml">("g");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Semeia o formulário na abertura (derivação durante o render — sem effect).
  const formKey = open ? (editingFoodId ?? "new") : null;
  if (formKey !== loadedKey) {
    if (formKey === null) {
      setLoadedKey(null);
    } else if (formKey === "new") {
      setName("");
      setCategoryId(NO_CATEGORY);
      setBaseUnit("g");
      setValues({});
      setLoadedKey(formKey);
    } else if (editing.data && editing.data.id === formKey) {
      setName(editing.data.name);
      setCategoryId(editing.data.categoryId ?? NO_CATEGORY);
      setBaseUnit(editing.data.baseUnit);
      setValues(
        Object.fromEntries(
          editing.data.nutrients.map((nutrient) => [
            nutrient.key,
            String(nutrient.amount),
          ]),
        ),
      );
      setLoadedKey(formKey);
    }
  }

  const onError = (error: { message: string }) => toast.error(error.message);
  const onSaved = (message: string) => {
    void utils.food.invalidate();
    toast.success(message);
    onClose();
  };

  const create = api.food.create.useMutation({
    onSuccess: () => onSaved(messages.foods.created),
    onError,
  });
  const update = api.food.update.useMutation({
    onSuccess: () => onSaved(messages.foods.updated),
    onError,
  });

  function submit() {
    const nutrientValues = Object.entries(values)
      .map(([key, raw]) => ({ key, amount: parseAmount(raw) }))
      .filter(
        (entry): entry is { key: string; amount: number } =>
          entry.amount !== null,
      );
    const payload = {
      name: name.trim(),
      foodCategoryId: categoryId === NO_CATEGORY ? null : categoryId,
      baseUnit,
      nutrients: nutrientValues,
    };
    if (editingFoodId) {
      update.mutate({ id: editingFoodId, ...payload });
    } else {
      create.mutate(payload);
    }
  }

  const saving = create.isPending || update.isPending;
  const loading =
    nutrients.isPending ||
    categories.isPending ||
    (editingFoodId !== null && editing.isPending);

  const nutrientsByGroup = new Map<
    string,
    NonNullable<typeof nutrients.data>
  >();
  for (const nutrient of nutrients.data ?? []) {
    const group = nutrient.nutrientGroup.name;
    nutrientsByGroup.set(group, [
      ...(nutrientsByGroup.get(group) ?? []),
      nutrient,
    ]);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingFoodId
              ? messages.foods.form.editTitle
              : messages.foods.form.newTitle}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2
              className="text-muted-foreground size-6 animate-spin"
              aria-hidden
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="food-name">{messages.foods.form.nameLabel}</Label>
              <Input
                id="food-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>{messages.foods.form.categoryLabel}</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>
                      {messages.foods.form.noCategory}
                    </SelectItem>
                    {(categories.data ?? []).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{messages.foods.form.baseUnitLabel}</Label>
                <Select
                  value={baseUnit}
                  onValueChange={(value) => setBaseUnit(value as "g" | "ml")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">
                      {messages.foods.form.baseUnitG}
                    </SelectItem>
                    <SelectItem value="ml">
                      {messages.foods.form.baseUnitMl}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-muted-foreground text-sm">
              {messages.foods.form.nutrientsHelp}
            </p>

            {[...nutrientsByGroup.entries()].map(([group, groupNutrients]) => (
              <div key={group} className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  {group}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                  {groupNutrients.map((nutrient) => (
                    <div key={nutrient.key} className="space-y-1">
                      <Label
                        htmlFor={`nutrient-${nutrient.key}`}
                        className="text-xs"
                      >
                        {nutrient.name} ({nutrient.unit})
                      </Label>
                      <Input
                        id={`nutrient-${nutrient.key}`}
                        inputMode="decimal"
                        value={values[nutrient.key] ?? ""}
                        onChange={(event) =>
                          setValues((previous) => ({
                            ...previous,
                            [nutrient.key]: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {messages.config.cancel}
              </Button>
              <Button
                onClick={submit}
                disabled={saving || name.trim().length < 2}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {messages.config.save}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
