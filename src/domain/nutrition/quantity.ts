import { DomainError } from "@/domain/shared/errors";

export interface UnitRef {
  type: "mass" | "volume" | "unit";
  /** Fator de conversão para a base (g ou ml). Null quando não conversível. */
  gramsPerUnit: number | null;
}

export interface QuantitySource {
  /** Medida caseira do alimento ("colher de sopa cheia" = 12 g). */
  measureGramWeight?: number;
  /** Unidade global (g, kg, ml, L, porção). */
  unit?: UnitRef;
}

/**
 * Resolve uma quantidade informada para a base do alimento (g ou ml).
 * Volume↔massa são tratados 1:1 apenas na própria base do alimento
 * (alimentos líquidos são cadastrados por 100 ml) — nunca há conversão
 * de densidade implícita entre bases diferentes.
 */
export function resolveGrams(quantity: number, source: QuantitySource): number {
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new DomainError("Quantidade inválida");
  }

  if (source.measureGramWeight !== undefined) {
    if (source.measureGramWeight <= 0) {
      throw new DomainError("Peso da medida caseira deve ser positivo");
    }
    return quantity * source.measureGramWeight;
  }

  if (source.unit) {
    if (source.unit.gramsPerUnit == null) {
      throw new DomainError(
        "Unidade sem fator de conversão exige uma medida caseira do alimento",
      );
    }
    return quantity * source.unit.gramsPerUnit;
  }

  throw new DomainError("Informe uma unidade ou uma medida caseira");
}
