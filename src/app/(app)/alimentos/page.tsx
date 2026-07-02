import type { Metadata } from "next";
import { messages } from "@/messages/pt-br";
import { FoodsPage } from "./foods-page";

export const metadata: Metadata = { title: messages.foods.title };

export default function AlimentosPage() {
  return <FoodsPage />;
}
