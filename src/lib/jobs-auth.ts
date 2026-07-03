import "server-only";
import { OAuth2Client } from "google-auth-library";
import { logger } from "@/lib/logger";

/**
 * Autoriza chamadas de jobs internos (Cloud Scheduler → endpoint).
 * Aceita um token OIDC do Google (Authorization: Bearer <jwt>) validando
 * o audience, OU um segredo compartilhado (JOBS_SECRET) para dev/local.
 */
const oauthClient = new OAuth2Client();

export async function authorizeJobRequest(request: Request): Promise<boolean> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length);

  const sharedSecret = process.env.JOBS_SECRET;
  if (sharedSecret && token === sharedSecret) return true;

  const audience = process.env.JOBS_OIDC_AUDIENCE;
  if (!audience) return false;
  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: token,
      audience,
    });
    return ticket.getPayload() !== undefined;
  } catch (error) {
    logger.warn({ error: (error as Error).message }, "jobs_oidc_verify_failed");
    return false;
  }
}
