import "server-only";

/**
 * Rate limiter em memória (janela deslizante por chave). Protege contra
 * abuso básico; é POR INSTÂNCIA — em produção com min-instances=1 cobre o
 * caso comum. Upgrade para Upstash/Redis é o próximo passo se houver
 * múltiplas instâncias sob carga (documentado em docs/ARQUITETURA.md §8).
 */
const buckets = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

export function rateLimit(
  key: string,
  { windowMs = WINDOW_MS, max = MAX_REQUESTS } = {},
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );
  hits.push(now);
  buckets.set(key, hits);

  // Limpeza oportunista para não crescer indefinidamente
  if (buckets.size > 10_000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) {
        buckets.delete(bucketKey);
      }
    }
  }
  return hits.length <= max;
}

/** Extrai o IP do cliente dos cabeçalhos do proxy (Cloud Run/Vercel). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
