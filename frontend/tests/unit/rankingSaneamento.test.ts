import { afterEach, describe, expect, it, vi } from "vitest";
import { ANO_RANKING_SANEAMENTO, calcularRankingSaneamento, INDICADORES_RANKING_SANEAMENTO, obterRankingSaneamento } from "@/lib/rankingSaneamento";
import type { RankingSaneamentoValor } from "@/lib/api";

function valoresParaMunicipio(codigo: string, municipio: string, valor: number): RankingSaneamentoValor[] {
  return INDICADORES_RANKING_SANEAMENTO.map((indicador) => ({
    codigo_ibge: codigo,
    municipio,
    uf: "MS",
    ano: 2024,
    valor: indicador.includes("perdas") || indicador.includes("risco") || indicador.includes("impactada") ? valor : valor,
    indicador,
    unidade: indicador.startsWith("gestao_") ? "sim/não" : "%",
    fonte: "SINISA 2024",
    sentido: indicador.includes("perdas") || indicador.includes("risco") || indicador.includes("impactada") ? "menor_melhor" : "maior_melhor",
  }));
}

describe("ranking municipal composto", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calcula nota completa, cobertura e posição sem depender da API", () => {
    const primeiro = valoresParaMunicipio("5003702", "Dourados", 90);
    const segundo = valoresParaMunicipio("5004007", "Glória de Dourados", 70);
    const ranking = calcularRankingSaneamento([...primeiro, ...segundo], 2024);

    expect(ranking).toHaveLength(2);
    expect(ranking[0]).toMatchObject({ codigo_ibge: "5003702", posicao: 1, cobertura: 100, ano: 2024 });
    expect(ranking[0].nota).toBeGreaterThan(ranking[1].nota);
    expect(ranking[0].resumo).toBe("16 de 16 indicadores informados");
  });

  it("não produz NaN quando um município tem dados incompletos", () => {
    const indicador = INDICADORES_RANKING_SANEAMENTO[0];
    const ranking = calcularRankingSaneamento([
      {
        codigo_ibge: "5003702",
        municipio: "Dourados",
        uf: "MS",
        ano: 2024,
        valor: 92,
        indicador,
        unidade: "%",
        fonte: "SINISA 2024",
        sentido: "maior_melhor",
      },
    ], 2024);

    expect(ranking[0].nota).not.toBeNaN();
    expect(ranking[0].cobertura).toBeCloseTo(100 / 16);
    expect(ranking[0].resumo).toBe("1 de 16 indicadores informados");
  });

  it("prefere 2024 e usa o último ano disponível quando a base ainda não tem 2024", async () => {
    const resposta2023 = valoresParaMunicipio("5003702", "Dourados", 80).map((item) => ({ ...item, ano: 2023 }));
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input.includes("ano=2024")) return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      if (input.includes("/anos")) return Promise.resolve(new Response(JSON.stringify([2023]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify(resposta2023), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const ranking = await obterRankingSaneamento(1);
    expect(ranking[0]).toMatchObject({ ano: 2023, codigo_ibge: "5003702" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(ANO_RANKING_SANEAMENTO).toBe(2024);
  });
});
