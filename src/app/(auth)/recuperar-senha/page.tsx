import type { Metadata } from "next";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { messages } from "@/messages/pt-br";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: messages.auth.recoverTitle };

export default function RecoverPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.auth.recoverTitle}</CardTitle>
        <CardDescription>{messages.auth.recoverSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <RecoverForm />
      </CardContent>
      <CardFooter className="text-muted-foreground justify-center text-sm">
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          {messages.auth.loginLink}
        </Link>
      </CardFooter>
    </Card>
  );
}
