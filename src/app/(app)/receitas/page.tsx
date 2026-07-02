import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { RecipesPage } from "./recipes-page";

export const metadata: Metadata = { title: messages.recipes.title };

export default function ReceitasPage() {
  return <RecipesPage />;
}
