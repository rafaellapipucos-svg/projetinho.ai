/** Formatação numérica centralizada (Intl pt-BR) — nunca formatar inline. */

const formatters = new Map<number, Intl.NumberFormat>();

function formatter(decimals: number): Intl.NumberFormat {
  let cached = formatters.get(decimals);
  if (!cached) {
    cached = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, cached);
  }
  return cached;
}

export function formatNumber(value: number, decimals = 1): string {
  return formatter(decimals).format(value);
}

/** Valor de nutriente com a unidade do catálogo (ex.: "12,5 g"). */
export function formatNutrient(
  value: number,
  unit: string,
  decimals: number,
): string {
  return `${formatNumber(value, decimals)} ${unit}`;
}
