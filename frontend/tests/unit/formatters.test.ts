import { describe, expect, it } from "vitest";
import type { Indicador, ValorIndicador } from "@/lib/api";
import {
  ehPercentual,
  formatValorIndicador,
  formatarNota,
  formatarValor,
  formatarVariacao,
  rotuloFonteCurto,
  valorParaPlanilha,
} from "@/lib/formatters";

function valor(valorAtual: number | null, unidade: string | null = "%"): ValorIndicador {
  const indicador: Indicador = {
    id: 1,
    codigo: "teste",
    nome: "Indicador de teste",
    tema: "Água",
    descricao: null,
    unidade,
    formula: null,
    fonte: "SINISA",
    sentido: "maior_melhor",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  return { id: 1, ano: 2024, valor: valorAtual, status_validacao: "oficial_sinisa", observacoes: null, indicador, fonte: "SINISA 2024" };
}

describe("formatadores de indicadores", () => {
  it("formata percentuais e números no padrão brasileiro", () => {
    expect(formatValorIndicador(valor(1234.5))).toBe("1.234,5 %");
    expect(valorParaPlanilha(valor(1234.5))).toBe("1234,5");
  });

  it("converte indicadores binários para Sim/Não", () => {
    expect(formatValorIndicador(valor(1, "sim/não"))).toBe("Sim");
    expect(formatValorIndicador(valor(0, "sim/nao"))).toBe("Não");
    expect(valorParaPlanilha(valor(0, "sim/não"))).toBe("Não");
  });

  it("diferencia ausência de valor na tela e na planilha", () => {
    // DS-07: ausência é exibida como travessão (com texto acessível no componente).
    expect(formatValorIndicador(valor(null))).toBe("—");
    expect(valorParaPlanilha(valor(null))).toBe("");
  });

  it("aplica casas decimais fixas por unidade (DS-07)", () => {
    expect(formatarValor(89.94, "%")).toEqual({ numero: "89,9", unidade: "%" });
    expect(formatarValor(90, "%")).toEqual({ numero: "90,0", unidade: "%" });
    expect(formatarValor(122.06, "L/hab.dia")).toEqual({ numero: "122,1", unidade: "L/hab.dia" });
    expect(formatarValor(0.781, "kg/hab.dia")).toEqual({ numero: "0,78", unidade: "kg/hab.dia" });
    expect(formatarValor(6.94, "kg/hab.ano")).toEqual({ numero: "6,9", unidade: "kg/hab.ano" });
    expect(formatarValor(1562.4, "km")).toEqual({ numero: "1.562", unidade: "km" });
    expect(formatarValor(1, "sim/não")).toEqual({ numero: "Sim", unidade: null });
    expect(formatarValor(null, "%")).toEqual({ numero: "—", unidade: null });
    expect(formatarNota(75)).toBe("75,0");
  });

  it("formata variação com sinal tipográfico e p.p. para percentuais", () => {
    expect(formatarVariacao(-0.9, "%")).toEqual({ numero: "−0,9", unidade: "p.p." });
    expect(formatarVariacao(1.2, "%")).toEqual({ numero: "+1,2", unidade: "p.p." });
    expect(formatarVariacao(7, "km")).toEqual({ numero: "+7", unidade: "km" });
    expect(formatarVariacao(0, "%")).toEqual({ numero: "0,0", unidade: "p.p." });
  });

  it("mantém o valor bruto no CSV mesmo com a nova formatação de tela", () => {
    expect(valorParaPlanilha(valor(89.94))).toBe("89,94");
    expect(formatValorIndicador(valor(89.94))).toBe("89,9 %");
  });

  it("exibe \"Percentual\" como % com as casas de DS-07 (PG-03.9)", () => {
    expect(formatarValor(88.91, "Percentual")).toEqual({ numero: "88,9", unidade: "%" });
    expect(formatarValor(62.4, " percentual ")).toEqual({ numero: "62,4", unidade: "%" });
    expect(formatarVariacao(1.5, "Percentual")).toEqual({ numero: "+1,5", unidade: "p.p." });
    expect(ehPercentual("Percentual")).toBe(true);
    expect(ehPercentual("km")).toBe(false);
  });

  it("mantém o valor bruto no CSV para unidade \"Percentual\"", () => {
    expect(valorParaPlanilha(valor(88.91, "Percentual"))).toBe("88,91");
  });

  it("usa selo curto de fonte por ano (PG-03.9)", () => {
    expect(rotuloFonteCurto("SNIS Serie Historica 1995-2022", 2021)).toBe("SNIS 2021");
    expect(rotuloFonteCurto("SINISA 2024", 2024)).toBe("SINISA 2024");
    expect(rotuloFonteCurto("IBGE", 2022)).toBe("IBGE 2022");
    expect(rotuloFonteCurto(null, 2022)).toBe("Fonte não informada");
  });
});
