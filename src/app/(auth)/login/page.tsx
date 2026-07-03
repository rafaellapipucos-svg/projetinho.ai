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
import { GoogleButton, AuthDivider } from "../google-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: messages.auth.loginTitle };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; next?: string }>;
}) {
  const { erro, next } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.auth.loginTitle}</CardTitle>
        <CardDescription>{messages.auth.loginSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {erro === "link-invalido" ? (
          <p className="text-destructive text-sm" role="alert">
            {messages.auth.linkInvalid}
          </p>
        ) : null}
        <GoogleButton next={next} />
        <AuthDivider />
        <LoginForm next={next} />
      </CardContent>
      <CardFooter className="text-muted-foreground justify-center text-sm">
        <span>
          {messages.auth.noAccount}{" "}
          <Link
            href="/cadastro"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {messages.auth.signupLink}
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
