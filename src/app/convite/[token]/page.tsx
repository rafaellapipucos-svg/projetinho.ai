import type { Metadata } from "next";
import Link from "next/link";
import { Salad } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { messages } from "@/messages/pt-br";
import { ClaimInvite } from "./claim-invite";

export const metadata: Metadata = { title: messages.portal.invite.title };

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const next = `/convite/${token}`;

  return (
    <main className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center gap-2">
        <Salad className="size-6" aria-hidden />
        <span className="text-lg font-semibold">{messages.app.name}</span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{messages.portal.invite.title}</CardTitle>
          <CardDescription>{messages.portal.invite.cta}</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <ClaimInvite token={token} />
          ) : (
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/login?next=${encodeURIComponent(next)}`}>
                  {messages.portal.invite.loginButton}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/cadastro?next=${encodeURIComponent(next)}`}>
                  {messages.portal.invite.signupButton}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
