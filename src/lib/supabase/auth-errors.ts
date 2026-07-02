import { messages } from "@/messages/pt-br";

/** Traduz códigos de erro do Supabase Auth para mensagens pt-BR da UI. */
export function authErrorMessage(error: { code?: string } | null): string {
  switch (error?.code) {
    case "invalid_credentials":
      return messages.auth.invalidCredentials;
    case "email_not_confirmed":
      return messages.auth.emailNotConfirmed;
    default:
      return messages.auth.genericError;
  }
}
