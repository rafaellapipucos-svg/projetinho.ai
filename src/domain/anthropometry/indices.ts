import { DomainError } from "@/domain/shared/errors";

/** IMC em kg/m². */
export function bmi(weightKg: number, heightCm: number): number {
  if (weightKg <= 0 || heightCm <= 0) {
    throw new DomainError("Peso e altura devem ser positivos");
  }
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export type BmiClassification =
  | "underweight"
  | "normal"
  | "overweight"
  | "obesity_1"
  | "obesity_2"
  | "obesity_3";

/** Classificação OMS do IMC — retorna a chave; o rótulo pt-BR vive na UI. */
export function bmiClassification(bmiValue: number): BmiClassification {
  if (bmiValue < 18.5) return "underweight";
  if (bmiValue < 25) return "normal";
  if (bmiValue < 30) return "overweight";
  if (bmiValue < 35) return "obesity_1";
  if (bmiValue < 40) return "obesity_2";
  return "obesity_3";
}

/** Relação cintura-quadril. */
export function waistHipRatio(waistCm: number, hipCm: number): number {
  if (waistCm <= 0 || hipCm <= 0) {
    throw new DomainError("Circunferências devem ser positivas");
  }
  return waistCm / hipCm;
}

/** Faixa de peso para IMC 18,5–24,9 na altura dada. */
export function idealWeightRange(heightCm: number): {
  minKg: number;
  maxKg: number;
} {
  if (heightCm <= 0) {
    throw new DomainError("Altura deve ser positiva");
  }
  const heightM = heightCm / 100;
  return { minKg: 18.5 * heightM * heightM, maxKg: 24.9 * heightM * heightM };
}
