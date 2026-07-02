import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { RecipeEditor } from "../recipe-editor";

export const metadata: Metadata = { title: messages.recipes.editor.editTitle };

export default async function EditarReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RecipeEditor recipeId={id} />;
}
