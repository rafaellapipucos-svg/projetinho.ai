import { describe, expect, it } from "vitest";
import {
  extractMergeFields,
  renderMergeFields,
} from "@/domain/documents/merge";

describe("renderMergeFields", () => {
  const context = {
    "paciente.nome": "Maria Silva",
    "clinica.nome": "Clínica Vida",
    "data.hoje": "03/07/2026",
  };

  it("substitui campos existentes", () => {
    expect(
      renderMergeFields("Olá, {{paciente.nome}} — {{clinica.nome}}", context),
    ).toBe("Olá, Maria Silva — Clínica Vida");
  });

  it("tolera espaços dentro das chaves", () => {
    expect(renderMergeFields("{{ paciente.nome }}", context)).toBe(
      "Maria Silva",
    );
  });

  it("campo ausente vira vazio (nunca deixa placeholder cru)", () => {
    expect(renderMergeFields("Peso: {{paciente.peso}}kg", context)).toBe(
      "Peso: kg",
    );
  });

  it("preserva texto sem campos", () => {
    expect(renderMergeFields("Sem campos aqui.", context)).toBe(
      "Sem campos aqui.",
    );
  });
});

describe("extractMergeFields", () => {
  it("coleta os campos únicos referenciados", () => {
    const fields = extractMergeFields(
      "{{paciente.nome}} nasceu em {{paciente.nascimento}} — {{paciente.nome}}",
    );
    expect(fields.sort()).toEqual(["paciente.nascimento", "paciente.nome"]);
  });
});
