"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber, formatNutrient } from "@/lib/format";
import { messages } from "@/messages/pt-br";

export function FoodDetailDialog({
  foodId,
  onClose,
  onEdit,
}: {
  foodId: string | null;
  onClose: () => void;
  onEdit: (foodId: string) => void;
}) {
  const utils = api.useUtils();
  const detail = api.food.byId.useQuery(
    { id: foodId ?? "" },
    { enabled: foodId !== null },
  );

  const [measureName, setMeasureName] = useState("");
  const [measureGrams, setMeasureGrams] = useState("");

  const invalidate = () => {
    if (foodId) void utils.food.byId.invalidate({ id: foodId });
  };

  const addMeasure = api.food.addMeasure.useMutation({
    onSuccess: () => {
      invalidate();
      setMeasureName("");
      setMeasureGrams("");
      toast.success(messages.foods.measureAdded);
    },
    onError: (error) => toast.error(error.message),
  });
  const removeMeasure = api.food.removeMeasure.useMutation({
    onSuccess: () => {
      invalidate();
      toast.success(messages.foods.measureRemoved);
    },
    onError: (error) => toast.error(error.message),
  });
  const deactivate = api.food.deactivate.useMutation({
    onSuccess: () => {
      toast.success(messages.foods.deactivated);
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  const food = detail.data;
  const grams = Number(measureGrams.replace(",", "."));
  const canAddMeasure =
    measureName.trim().length > 0 && Number.isFinite(grams) && grams > 0;

  const nutrientGroups = new Map<
    string,
    NonNullable<typeof food>["nutrients"]
  >();
  for (const nutrient of food?.nutrients ?? []) {
    nutrientGroups.set(nutrient.groupName, [
      ...(nutrientGroups.get(nutrient.groupName) ?? []),
      nutrient,
    ]);
  }

  return (
    <Dialog open={foodId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        {detail.isPending || !food ? (
          <div className="flex justify-center py-10">
            <Loader2
              className="text-muted-foreground size-6 animate-spin"
              aria-hidden
            />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                {food.name}
                {food.isOwn ? (
                  <Badge variant="secondary">{messages.foods.ownBadge}</Badge>
                ) : (
                  <Badge variant="outline">
                    {food.source.key.toUpperCase()}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <p className="text-muted-foreground text-sm">
              {food.categoryName ?? messages.foods.form.noCategory} ·{" "}
              {messages.foods.per100(food.baseUnit)}
            </p>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                {messages.foods.nutrientsTitle}
              </h3>
              {[...nutrientGroups.entries()].map(([group, nutrients]) => (
                <div key={group}>
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                    {group}
                  </p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
                    {nutrients.map((nutrient) => (
                      <li
                        key={nutrient.key}
                        className="flex justify-between gap-2"
                      >
                        <span className="truncate">{nutrient.name}</span>
                        <span className="shrink-0 tabular-nums">
                          {formatNutrient(
                            nutrient.amount,
                            nutrient.unit,
                            nutrient.decimals,
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {messages.foods.measuresTitle}
              </h3>
              {food.measures.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {messages.foods.noMeasures}
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {food.measures.map((measure) => (
                    <li
                      key={measure.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span>
                        {measure.name}{" "}
                        <span className="text-muted-foreground">
                          — {formatNumber(measure.gramWeight, 1)}{" "}
                          {food.baseUnit}
                        </span>
                      </span>
                      {measure.isOwn ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            removeMeasure.mutate({ id: measure.id })
                          }
                          disabled={removeMeasure.isPending}
                          aria-label={messages.config.delete}
                        >
                          <Trash2
                            className="text-destructive size-4"
                            aria-hidden
                          />
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="measure-name">
                    {messages.foods.measureNameLabel}
                  </Label>
                  <Input
                    id="measure-name"
                    value={measureName}
                    onChange={(event) => setMeasureName(event.target.value)}
                    placeholder={messages.foods.measureNamePlaceholder}
                  />
                </div>
                <div className="w-28 space-y-1">
                  <Label htmlFor="measure-grams">
                    {messages.foods.measureGramsLabel}
                  </Label>
                  <Input
                    id="measure-grams"
                    inputMode="decimal"
                    value={measureGrams}
                    onChange={(event) => setMeasureGrams(event.target.value)}
                  />
                </div>
                <Button
                  onClick={() =>
                    addMeasure.mutate({
                      foodId: food.id,
                      name: measureName.trim(),
                      gramWeight: grams,
                    })
                  }
                  disabled={!canAddMeasure || addMeasure.isPending}
                >
                  {messages.foods.addMeasureButton}
                </Button>
              </div>
            </section>

            {food.isOwn ? (
              <div className="flex justify-end gap-2 border-t pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={deactivate.isPending}>
                      {messages.foods.deactivateButton}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {messages.foods.deactivateConfirmTitle}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {messages.foods.deactivateConfirmBody}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {messages.config.cancel}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deactivate.mutate({ id: food.id })}
                      >
                        {messages.foods.deactivateButton}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={() => onEdit(food.id)}>
                  {messages.foods.editButton}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
