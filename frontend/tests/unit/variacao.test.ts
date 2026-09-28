import { describe, expect, it } from "vitest";
import { avaliarVariacao } from "@/lib/variacao";

// Tabela-verdade de DS-04 / CP-08: seta pela direção, cor e texto pelo sentido.
describe("avaliarVariacao", () => {
  it.each([
    [1.2, "maior_melhor", "sobe", "melhora"],
    [-1.2, "maior_melhor", "desce", "piora"],
    [-0.9, "menor_melhor", "desce", "melhora"],
    [0.9, "menor_melhor", "sobe", "piora"],
    [3.4, "neutro", "sobe", "neutra"],
    [-71.6, "neutro", "desce", "neutra"],
    [0, "maior_melhor", "estavel", "neutra"],
    [0, "menor_melhor", "estavel", "neutra"]
  ] as const)("variação %s com sentido %s → %s, %s", (variacao, sentido, direcao, avaliacao) => {
    expect(avaliarVariacao(variacao, sentido)).toEqual({ direcao, avaliacao });
  });
});
