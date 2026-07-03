import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("permite até o máximo e bloqueia o excedente na janela", () => {
    const key = `teste-${Math.random()}`;
    const options = { windowMs: 60_000, max: 3 };
    expect(rateLimit(key, options)).toBe(true);
    expect(rateLimit(key, options)).toBe(true);
    expect(rateLimit(key, options)).toBe(true);
    expect(rateLimit(key, options)).toBe(false);
  });

  it("chaves diferentes têm baldes independentes", () => {
    const options = { windowMs: 60_000, max: 1 };
    expect(rateLimit(`a-${Math.random()}`, options)).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, options)).toBe(true);
  });
});
