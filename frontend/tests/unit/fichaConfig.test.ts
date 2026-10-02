import { describe, expect, it } from "vitest";
import type { Indicador, ValorIndicador } from "@/lib/api";
import { calcularCobertura, calcularScore, notaDoModulo, ordemTema, temaConfig } from "@/components/municipio/fichaConfig";
import type { RankingSaneamentoItem } from "@/lib/rankingSaneamento";

function valor(codigo: string, tema: string, numero: number | null, unidade = "%", sentido: Indicador["sentido"] = "maior_melhor", status = "oficial_sinisa"): ValorIndicador {
  return {
    id: codigo.length,
    ano: 2024,
    valor: numero,
    status_validacao: status,
    observacoes: null,
    fonte: "SINISA 2024",
    indicador: {
      id: codigo.length,
      codigo,
      nome: codigo,
      tema,
      descricao: null,
      unidade,
      formula: null,
      fonte: "SINISA",
      sentido,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  };
}

describe("regras da ficha municipal", () => {
  it("calcula score médio e inverte indicadores de menor valor melhor", () => {
    const valores = [valor("atendimento", "Água", 80), valor("perdas", "Água", 20, "%", "menor_melhor")];
    expect(calcularScore(valores)).toBe(80);
  });

  it("trata Percentual como unidade percentual no score", () => {
    expect(calcularScore([valor("atendimento", "Água", 80, "Percentual")])).toBe(80);
  });

  it("ignora nulos e neutros no score e exige fonte oficial na cobertura", () => {
    const valores = [
      valor("nulo", "Água", null),
      valor("neutro", "Água", 10, "%", "neutro", "pendente"),
      valor("nao-oficial", "Esgoto", 90, "%", "maior_melhor", "pendente"),
    ];
    expect(calcularScore(valores)).toBe(90);
    expect(calcularCobertura(valores).find((item) => item.tema === "Água")?.coberto).toBe(false);
    expect(calcularCobertura(valores).find((item) => item.tema === "Esgoto")?.coberto).toBe(false);
  });

  it("mantém a ordem e a configuração visual das cinco dimensões", () => {
    expect([ordemTema("Água"), ordemTema("Esgoto"), ordemTema("Resíduos sólidos"), ordemTema("Águas pluviais"), ordemTema("Gestão municipal")]).toEqual([0, 1, 2, 3, 4]);
    // DS-03: cores de dimensão vêm de tokens, não de hex literais.
    expect(temaConfig("Água").bgClass).toBe("bg-dim-agua");
    expect(temaConfig("Gestão municipal").cor).toBe("var(--dim-gestao)");
    expect(calcularCobertura([]).map((item) => item.tema)).toEqual(["Água", "Esgoto", "Resíduos sólidos", "Águas pluviais", "Gestão municipal"]);
  });

  it("usa a nota do módulo do ranking para cada dimensão (ADR-001)", () => {
    const item = { agua: 86.7, esgoto: 85.1, residuos: 67.9, aguasPluviais: 88.6, gestao: 50 } as RankingSaneamentoItem;
    expect(notaDoModulo(item, "Água")).toBe(86.7);
    expect(notaDoModulo(item, "Águas pluviais")).toBe(88.6);
    expect(notaDoModulo(item, "Gestão municipal")).toBe(50);
    expect(notaDoModulo(null, "Água")).toBeNull();
    expect(notaDoModulo(item, "Tema desconhecido")).toBeNull();
  });
});
