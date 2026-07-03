/**
 * Renderização de documentos com merge-fields {{campo}} (§5.2-F).
 * Puro e isomórfico: o preview do editor (cliente) e a emissão (servidor)
 * usam a MESMA função — o que o profissional vê é o que é gravado.
 */

/** Campos disponíveis, agrupados para exibição no editor. */
export const MERGE_FIELDS = [
  { key: "paciente.nome", group: "patient" },
  { key: "paciente.cpf", group: "patient" },
  { key: "paciente.email", group: "patient" },
  { key: "paciente.telefone", group: "patient" },
  { key: "paciente.nascimento", group: "patient" },
  { key: "paciente.idade", group: "patient" },
  { key: "clinica.nome", group: "clinic" },
  { key: "profissional.nome", group: "professional" },
  { key: "data.hoje", group: "date" },
] as const;

export type MergeContext = Record<string, string>;

const FIELD_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

/**
 * Substitui {{campo}} pelos valores do contexto. Campos ausentes ou vazios
 * viram string vazia — nunca deixam o placeholder cru no documento emitido.
 */
export function renderMergeFields(
  template: string,
  context: MergeContext,
): string {
  return template.replace(
    FIELD_PATTERN,
    (_match, key: string) => context[key] ?? "",
  );
}

/** Lista os campos referenciados por um template (para validação/aviso). */
export function extractMergeFields(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(FIELD_PATTERN)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}
