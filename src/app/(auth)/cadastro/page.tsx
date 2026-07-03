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
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: messages.auth.signupTitle };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.auth.signupTitle}</CardTitle>
        <CardDescription>{messages.auth.signupSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm next={next} />
      </CardContent>
      <CardFooter className="text-muted-foreground justify-center text-sm">
        <span>
          {messages.auth.hasAccount}{" "}
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {messages.auth.loginLink}
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
