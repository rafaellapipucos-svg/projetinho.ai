/**
 * Normalização canônica para busca: minúsculas, sem acentos, espaços
 * colapsados. É a MESMA função usada na escrita (name_normalized) e na
 * leitura (termo de busca) — divergência aqui quebraria a busca.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
