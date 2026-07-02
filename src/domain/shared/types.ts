/** Sexo biológico — necessário para fórmulas clínicas (enum, não catálogo: §3.1). */
export type Sex = "male" | "female";

/**
 * Vetor nutricional indexado pela `key` canônica do nutriente
 * (ex.: "energy_kcal", "protein_g") — nunca por id de banco:
 * o motor é puro e agnóstico de persistência.
 */
export type NutrientVector = Record<string, number>;
