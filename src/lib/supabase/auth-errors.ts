import { messages } from "@/messages/pt-br";

/** Traduz códigos de erro do Supabase Auth para mensagens pt-BR da UI. */
export function authErrorMessage(error: { code?: string } | null): string {
  switch (error?.code) {
    case "invalid_credentials":
      return messages.auth.invalidCredentials;
    case "email_not_confirmed":
      return messages.auth.emailNotConfirmed;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return messages.auth.emailRateLimited;
    case "user_already_exists":
    case "email_exists":
      return messages.auth.userAlreadyExists;
    case "weak_password":
      return messages.auth.weakPassword;
    case "signup_disabled":
    case "email_provider_disabled":
      return messages.auth.signupDisabled;
    default:
      return messages.auth.genericError;
  }
}
