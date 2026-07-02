import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { messages } from "@/messages/pt-br";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: messages.auth.updatePasswordTitle };

export default function UpdatePasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.auth.updatePasswordTitle}</CardTitle>
        <CardDescription>
          {messages.auth.updatePasswordSubtitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  );
}
