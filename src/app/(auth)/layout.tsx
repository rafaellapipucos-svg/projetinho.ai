import { Salad } from "lucide-react";
import { messages } from "@/messages/pt-br";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center gap-2">
        <Salad className="size-6" aria-hidden />
        <span className="text-lg font-semibold">{messages.app.name}</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
