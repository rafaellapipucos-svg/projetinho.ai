import { describe, expect, it } from "vitest";
import { slugCandidate, slugify } from "@/lib/slugify";

describe("slugify", () => {
  it("remove acentos e normaliza para minúsculas", () => {
    expect(slugify("Clínica São João")).toBe("clinica-sao-joao");
  });

  it("colapsa espaços e símbolos em um único hífen", () => {
    expect(slugify("  Nutri  &  Saúde!! ")).toBe("nutri-saude");
  });

  it("usa o fallback quando nada sobra da entrada", () => {
    expect(slugify("!!!", "clinica")).toBe("clinica");
  });

  it("limita a 48 caracteres sem terminar em hífen", () => {
    const slug = slugify(`${"a".repeat(47)} bc`);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slugCandidate", () => {
  it("tentativa 0 retorna a base intacta", () => {
    expect(slugCandidate("clinica-vida", 0)).toBe("clinica-vida");
  });

  it("tentativas seguintes anexam sufixo aleatório de 4 caracteres", () => {
    expect(slugCandidate("clinica-vida", 1)).toMatch(
      /^clinica-vida-[a-z0-9]{4}$/,
    );
  });
});
