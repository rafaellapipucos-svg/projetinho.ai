import { describe, expect, it } from "vitest";
import { nearlyEqual, round } from "@/domain/shared/round";

describe("round", () => {
  it("arredonda meio para cima com correção de float (1,005 → 1,01)", () => {
    expect(round(1.005, 2)).toBe(1.01);
  });

  it("respeita o número de casas", () => {
    expect(round(2.34567, 1)).toBe(2.3);
    expect(round(2.34567, 0)).toBe(2);
    expect(round(1648.75, 0)).toBe(1649);
  });
});

describe("nearlyEqual", () => {
  it("tolera o erro clássico de float64 (0,1+0,2 ≈ 0,3)", () => {
    expect(0.1 + 0.2 === 0.3).toBe(false);
    expect(nearlyEqual(0.1 + 0.2, 0.3)).toBe(true);
  });
});
