import { describe, expect, it } from "vitest";
import { aggregate, scaleNutrients } from "@/domain/nutrition/vector";

describe("scaleNutrients", () => {
  it("escala valores por 100 g para a quantidade dada", () => {
    const arroz100g = {
      energy_kcal: 128,
      protein_g: 2.5,
      carbohydrate_g: 28.1,
    };
    const porcao150g = scaleNutrients(arroz100g, 150);
    expect(porcao150g.energy_kcal).toBeCloseTo(192, 6);
    expect(porcao150g.protein_g).toBeCloseTo(3.75, 6);
    expect(porcao150g.carbohydrate_g).toBeCloseTo(42.15, 6);
  });

  it("quantidade zero zera o vetor", () => {
    expect(scaleNutrients({ energy_kcal: 100 }, 0)).toEqual({ energy_kcal: 0 });
  });
});

describe("aggregate", () => {
  it("soma vetores com chaves diferentes", () => {
    const total = aggregate([
      { energy_kcal: 128, protein_g: 2.5 },
      { energy_kcal: 76, fiber_g: 8.5 },
    ]);
    expect(total.energy_kcal).toBeCloseTo(204, 6);
    expect(total.protein_g).toBeCloseTo(2.5, 6);
    expect(total.fiber_g).toBeCloseTo(8.5, 6);
  });

  it("agregação de milhares de itens não acumula erro relevante (política §3.5)", () => {
    // 1.260 itens (pior caso do builder) de 0,1 g de proteína
    const vectors = Array.from({ length: 1260 }, () => ({ protein_g: 0.1 }));
    const total = aggregate(vectors);
    expect(total.protein_g).toBeCloseTo(126, 6);
  });

  it("lista vazia produz vetor vazio", () => {
    expect(aggregate([])).toEqual({});
  });
});
