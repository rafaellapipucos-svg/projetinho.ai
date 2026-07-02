"use client";

import Link from "next/link";
import { CookingPot, Loader2, Plus } from "lucide-react";
import { api } from "@/app/_trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { messages } from "@/messages/pt-br";

export function RecipesPage() {
  const list = api.recipe.list.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.recipes.title}
          </h1>
          <p className="text-muted-foreground">{messages.recipes.subtitle}</p>
        </div>
        <Button asChild>
          <Link href="/receitas/nova">
            <Plus className="size-4" aria-hidden />
            {messages.recipes.newButton}
          </Link>
        </Button>
      </div>

      {list.isPending ? (
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-hidden
        />
      ) : list.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CookingPot className="text-muted-foreground size-10" aria-hidden />
            <p className="text-muted-foreground">{messages.recipes.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-md border">
          {(list.data ?? []).map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/receitas/${recipe.id}`}
                className="hover:bg-accent flex items-center justify-between px-4 py-3 transition-colors"
              >
                <span className="font-medium">{recipe.name}</span>
                <span className="text-muted-foreground text-sm">
                  {messages.recipes.servingsLabel(recipe.servings)} ·{" "}
                  {messages.recipes.ingredientsCount(recipe.ingredientCount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
