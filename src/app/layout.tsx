import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { Toaster } from "@/components/ui/sonner";
import { messages } from "@/messages/pt-br";

export const metadata: Metadata = {
  title: {
    default: messages.app.name,
    template: `%s · ${messages.app.name}`,
  },
  description: messages.app.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="bg-background min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
