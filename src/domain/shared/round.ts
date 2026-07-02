/**
 * Arredondamento central do domínio (política de precisão §3.5):
 * cálculos correm em float64 sem arredondamento intermediário;
 * arredonda-se UMA vez, na borda de exibição/persistência.
 */
export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function nearlyEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) < epsilon;
}
