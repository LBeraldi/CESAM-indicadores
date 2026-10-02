import { describe, expect, it } from "vitest";
import type { Indicador, ValorIndicador } from "@/lib/api";
import { INDICADORES_DESTAQUE, ehDestaque, selecionarDestaques } from "@/lib/indicadoresDestaque";

function valor(codigo: string, tema: string, id = 1): ValorIndicador {
  const indicador: Indicador = {
    id,
    codigo,
    nome: codigo,
    tema,
    descricao: null,
    unidade: "%",
    formula: null,
    fonte: "SINISA",
    sentido: "maior_melhor",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };
  return { id, ano: 2024, valor: 1, status_validacao: "oficial_sinisa", observacoes: null, indicador, fonte: "SINISA 2024" };
}

describe("indicadores em destaque (ADR-007)", () => {
  it("segue a lista da referência visual para Água, na ordem do design", () => {
    expect(INDICADORES_DESTAQUE["Água"]).toEqual([
      "agua_atendimento_total",
      "agua_atendimento_urbano",
      "agua_perdas_distribuicao",
      "agua_consumo_per_capita",
      "agua_extensao_rede",
    ]);
  });

  it("cobre as cinco dimensões com cerca de 22 indicadores", () => {
    const total = Object.values(INDICADORES_DESTAQUE).flat().length;
    expect(Object.keys(INDICADORES_DESTAQUE)).toHaveLength(5);
    expect(total).toBeGreaterThanOrEqual(20);
    expect(total).toBeLessThanOrEqual(24);
  });

  it("seleciona só os destaques do tema, na ordem da lista", () => {
    const lista = [
      valor("agua_extensao_rede", "Água", 1),
      valor("agua_outro", "Água", 2),
      valor("agua_atendimento_total", "Água", 3),
      valor("esgoto_coleta", "Esgoto", 4),
    ];
    expect(selecionarDestaques(lista, "Água").map((v) => v.indicador.codigo)).toEqual([
      "agua_atendimento_total",
      "agua_extensao_rede",
    ]);
    expect(ehDestaque("agua_outro")).toBe(false);
  });

  it("devolve lista vazia quando o tema não tem destaque com dado", () => {
    expect(selecionarDestaques([valor("agua_outro", "Água")], "Água")).toEqual([]);
  });

  it("mantém somente o ano mais recente de cada destaque", () => {
    const antigo = valor("agua_atendimento_total", "Água");
    const recente = { ...antigo, id: 2, ano: 2025 };

    expect(selecionarDestaques([recente, antigo], "Água")).toEqual([recente]);
  });
});
