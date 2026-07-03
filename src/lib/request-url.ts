/**
 * Origem pública da requisição. Em route handlers, `new URL(request.url)`
 * traz o host INTERNO do container no Cloud Run (0.0.0.0:8080) — atrás do
 * proxy, o host público vem em `x-forwarded-host`/`x-forwarded-proto`.
 * Sem isso, redirects de auth (OAuth/confirmação) apontam para o host interno.
 */
export function publicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}
