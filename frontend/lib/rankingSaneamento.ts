import { fetchApiSafe, type RankingItem } from "@/lib/api";
import { valorNormalizado } from "@/lib/indicadorSentido";

export const ANO_RANKING_SANEAMENTO = 2023;

export const PESOS_RANKING_SANEAMENTO = {
  agua: 0.4,
  esgoto: 0.48,
  gestao: 0.09,
  dados: 0.03
} as const;

type IndicadorRanking = {
  codigo: string;
};

type MunicipioRankingBase = {
  codigo_ibge: string;
  municipio: string;
  uf: string;
  metricas: Partial<Record<string, number>>;
};

export type RankingSaneamentoItem = {
  posicao: number;
  codigo_ibge: string;
  municipio: string;
  uf: string;
  nota: number;
  agua: number;
  esgoto: number;
  gestao: number;
  dados: number;
  resumo: string;
};

const INDICADORES_RANKING: IndicadorRanking[] = [
  { codigo: "agua_atendimento_total" },
  { codigo: "agua_atendimento_urbano" },
  { codigo: "agua_perdas_distribuicao" },
  { codigo: "esgoto_atendimento_total" },
  { codigo: "esgoto_atendimento_urbano" },
  { codigo: "esgoto_coleta" },
  { codigo: "esgoto_tratamento" },
  { codigo: "gestao_plano_municipal_saneamento" },
  { codigo: "gestao_conselho_municipal" }
];

function clampPercentual(valor: number | null | undefined): number | null {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return null;
  }

  return Math.max(0, Math.min(100, valor));
}

function binarioParaPercentual(valor: number | null | undefined): number | null {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return null;
  }

  return valor >= 1 ? 100 : 0;
}

function valor(municipio: MunicipioRankingBase, codigo: string): number | null {
  return clampPercentual(municipio.metricas[codigo]);
}

function pontuar(municipio: MunicipioRankingBase): Omit<RankingSaneamentoItem, "posicao"> {
  const aguaAtendimento = valor(municipio, "agua_atendimento_total") ?? 0;
  const aguaUrbana = valor(municipio, "agua_atendimento_urbano") ?? 0;
  const perdas = valor(municipio, "agua_perdas_distribuicao");
  const eficienciaAgua = perdas === null ? 0 : valorNormalizado("agua_perdas_distribuicao", perdas);

  const esgotoAtendimento = valor(municipio, "esgoto_atendimento_total") ?? 0;
  const esgotoUrbano = valor(municipio, "esgoto_atendimento_urbano") ?? 0;
  const esgotoColeta = valor(municipio, "esgoto_coleta") ?? 0;
  const esgotoTratamento = valor(municipio, "esgoto_tratamento") ?? 0;
  const tratamentoEfetivo = (esgotoColeta * esgotoTratamento) / 100;

  const plano = binarioParaPercentual(municipio.metricas.gestao_plano_municipal_saneamento) ?? 0;
  const conselho = binarioParaPercentual(municipio.metricas.gestao_conselho_municipal) ?? 0;
  const dados = (Object.keys(municipio.metricas).length / INDICADORES_RANKING.length) * 100;

  const agua = aguaAtendimento * 0.7 + aguaUrbana * 0.1 + eficienciaAgua * 0.2;
  const esgoto =
    esgotoAtendimento * 0.3 + esgotoUrbano * 0.1 + esgotoColeta * 0.25 + tratamentoEfetivo * 0.35;
  const gestao = plano * 0.6 + conselho * 0.4;
  const nota =
    agua * PESOS_RANKING_SANEAMENTO.agua +
    esgoto * PESOS_RANKING_SANEAMENTO.esgoto +
    gestao * PESOS_RANKING_SANEAMENTO.gestao +
    dados * PESOS_RANKING_SANEAMENTO.dados;

  return {
    codigo_ibge: municipio.codigo_ibge,
    municipio: municipio.municipio,
    uf: municipio.uf,
    nota,
    agua,
    esgoto,
    gestao,
    dados,
    resumo: `${aguaAtendimento.toLocaleString("pt-BR", {
      maximumFractionDigits: 1
    })}% de agua total e ${tratamentoEfetivo.toLocaleString("pt-BR", {
      maximumFractionDigits: 1
    })}% de tratamento efetivo de esgoto`
  };
}

export const INDICADORES_RANKING_SANEAMENTO = INDICADORES_RANKING.map((item) => item.codigo);

export async function obterRankingSaneamento(limit = 79): Promise<RankingSaneamentoItem[]> {
  const rankings = await Promise.all(
    INDICADORES_RANKING.map((indicador) =>
      fetchApiSafe<RankingItem[]>(
        `/ranking?indicador=${indicador.codigo}&ano=${ANO_RANKING_SANEAMENTO}&limit=100`,
        []
      ).then((itens) => ({ indicador: indicador.codigo, itens }))
    )
  );

  const municipios = new Map<string, MunicipioRankingBase>();

  for (const ranking of rankings) {
    for (const item of ranking.itens) {
      if (item.valor === null) {
        continue;
      }

      const atual =
        municipios.get(item.codigo_ibge) ??
        ({
          codigo_ibge: item.codigo_ibge,
          municipio: item.municipio,
          uf: item.uf,
          metricas: {}
        } satisfies MunicipioRankingBase);

      atual.metricas[ranking.indicador] = item.valor;
      municipios.set(item.codigo_ibge, atual);
    }
  }

  return Array.from(municipios.values())
    .map(pontuar)
    .sort((a, b) => b.nota - a.nota || a.municipio.localeCompare(b.municipio, "pt-BR"))
    .slice(0, limit)
    .map((item, index) => ({ ...item, posicao: index + 1 }));
}
