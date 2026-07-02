import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { RecipeEditor } from "../recipe-editor";

export const metadata: Metadata = { title: messages.recipes.editor.newTitle };

export default function NovaReceitaPage() {
  return <RecipeEditor recipeId={null} />;
}
