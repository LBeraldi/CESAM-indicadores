import { describe, expect, it } from "vitest";
import { valorNormalizado } from "@/lib/indicadorSentido";

describe("sentido dos indicadores", () => {
  it("inverte perdas de água e preserva indicadores maiores-melhores", () => {
    expect(valorNormalizado("agua_perdas_distribuicao", 30)).toBe(70);
    expect(valorNormalizado("agua_atendimento_total", 92)).toBe(92);
  });
});
