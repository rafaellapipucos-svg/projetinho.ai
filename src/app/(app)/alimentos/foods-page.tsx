"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FoodPicker,
  type FoodSearchResult,
} from "@/app/_components/food-picker";
import { messages } from "@/messages/pt-br";
import { FoodDetailDialog } from "./food-detail-dialog";
import { FoodFormDialog } from "./food-form-dialog";

export function FoodsPage() {
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingFoodId, setEditingFoodId] = useState<string | null>(null);

  function handleSelect(food: FoodSearchResult) {
    setSelectedFoodId(food.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.foods.title}
          </h1>
          <p className="text-muted-foreground">{messages.foods.subtitle}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden />
          {messages.foods.newButton}
        </Button>
      </div>

      <div className="max-w-xl space-y-2">
        <FoodPicker
          placeholder={messages.foods.searchPlaceholder}
          onSelect={handleSelect}
          autoFocus
        />
        <p className="text-muted-foreground text-sm">
          {messages.foods.searchHint}
        </p>
      </div>

      <FoodDetailDialog
        foodId={selectedFoodId}
        onClose={() => setSelectedFoodId(null)}
        onEdit={(foodId) => {
          setSelectedFoodId(null);
          setEditingFoodId(foodId);
        }}
      />

      <FoodFormDialog
        open={creating}
        editingFoodId={null}
        onClose={() => setCreating(false)}
      />
      <FoodFormDialog
        open={editingFoodId !== null}
        editingFoodId={editingFoodId}
        onClose={() => setEditingFoodId(null)}
      />
    </div>
  );
}
