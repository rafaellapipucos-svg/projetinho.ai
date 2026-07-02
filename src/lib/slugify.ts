/**
 * Converte um nome livre em slug de URL: minúsculo, sem acentos,
 * apenas [a-z0-9-], no máximo 48 caracteres.
 */
export function slugify(input: string, fallback = "item"): string {
  const slug = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug.length > 0 ? slug : fallback;
}

/** 1ª tentativa usa o slug limpo; colisões recebem sufixo aleatório curto. */
export function slugCandidate(base: string, attempt: number): string {
  if (attempt === 0) return base;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
