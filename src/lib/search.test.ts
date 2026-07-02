import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/lib/search";

describe("normalizeSearchText", () => {
  it("remove acentos, baixa a caixa e colapsa espaços", () => {
    expect(normalizeSearchText("  Pão  de   Queijo ")).toBe("pao de queijo");
    expect(normalizeSearchText("AÇAÍ")).toBe("acai");
    expect(normalizeSearchText("Arroz, integral, cru")).toBe(
      "arroz, integral, cru",
    );
  });
});
