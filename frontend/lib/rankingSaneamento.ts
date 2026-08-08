import { fetchApiSafe, type RankingItem } from "@/lib/api";

export const ANO_RANKING_SANEAMENTO = 2023;

/**
 * Adaptação municipal do referencial de indicadores do GRMD/PNQS da ABES.
 * O PNQS avalia organizações e não publica uma fórmula oficial de ranking
 * municipal. Por isso os cinco módulos do SINISA recebem pesos explícitos e
 * os resultados são identificados no site como cálculo do Observatório.
 */
export const PESOS_RANKING_SANEAMENTO = {
  agua: 0.25,
  esgoto: 0.25,
  residuos: 0.2,
  aguasPluviais: 0.2,
  gestao: 0.1
} as const;

type Modulo = keyof typeof PESOS_RANKING_SANEAMENTO;
type Sentido = "maior_melhor" | "menor_melhor" | "binario";

type IndicadorRanking = {
  codigo: string;
  modulo: Modulo;
  sentido: Sentido;
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
  residuos: number;
  aguasPluviais: number;
  gestao: number;
  cobertura: number;
  resumo: string;
};

const INDICADORES_RANKING: IndicadorRanking[] = [
  { codigo: "agua_atendimento_total", modulo: "agua", sentido: "maior_melhor" },
  { codigo: "agua_atendimento_urbano", modulo: "agua", sentido: "maior_melhor" },
  { codigo: "agua_perdas_distribuicao", modulo: "agua", sentido: "menor_melhor" },
  { codigo: "esgoto_atendimento_total", modulo: "esgoto", sentido: "maior_melhor" },
  { codigo: "esgoto_atendimento_urbano", modulo: "esgoto", sentido: "maior_melhor" },
  { codigo: "esgoto_coleta", modulo: "esgoto", sentido: "maior_melhor" },
  { codigo: "esgoto_tratamento", modulo: "esgoto", sentido: "maior_melhor" },
  { codigo: "residuos_cobertura_coleta_domiciliar", modulo: "residuos", sentido: "maior_melhor" },
  { codigo: "residuos_cobertura_coleta_seletiva", modulo: "residuos", sentido: "maior_melhor" },
  { codigo: "residuos_massa_recuperada_per_capita", modulo: "residuos", sentido: "maior_melhor" },
  { codigo: "aguas_pluviais_vias_pavimentadas", modulo: "aguasPluviais", sentido: "maior_melhor" },
  { codigo: "aguas_pluviais_rede_subterranea", modulo: "aguasPluviais", sentido: "maior_melhor" },
  { codigo: "aguas_pluviais_domicilios_risco_inundacao", modulo: "aguasPluviais", sentido: "menor_melhor" },
  { codigo: "aguas_pluviais_populacao_impactada", modulo: "aguasPluviais", sentido: "menor_melhor" },
  { codigo: "gestao_plano_municipal_saneamento", modulo: "gestao", sentido: "binario" },
  { codigo: "gestao_conselho_municipal", modulo: "gestao", sentido: "binario" }
];

function limitar(valor: number): number {
  return Math.max(0, Math.min(100, valor));
}

function percentil(valor: number, universo: number[]): number {
  if (universo.length <= 1) return universo.length === 1 ? 100 : 0;
  const menores = universo.filter((item) => item < valor).length;
  const iguais = universo.filter((item) => item === valor).length;
  return ((menores + Math.max(0, iguais - 1) / 2) / (universo.length - 1)) * 100;
}

function pontuacaoIndicador(indicador: IndicadorRanking, valor: number, universo: number[]): number {
  if (indicador.sentido === "binario") return valor >= 1 ? 100 : 0;

  // Percentuais preservam sua leitura natural. A massa recuperada, cuja
  // unidade não é percentual, é comparada por posição relativa no estado.
  const base = indicador.codigo === "residuos_massa_recuperada_per_capita" ? percentil(valor, universo) : limitar(valor);
  return indicador.sentido === "menor_melhor" ? 100 - base : base;
}

function pontuar(
  municipio: MunicipioRankingBase,
  universos: Map<string, number[]>
): Omit<RankingSaneamentoItem, "posicao"> {
  const notas: Record<Modulo, number[]> = {
    agua: [],
    esgoto: [],
    residuos: [],
    aguasPluviais: [],
    gestao: []
  };

  for (const indicador of INDICADORES_RANKING) {
    const valor = municipio.metricas[indicador.codigo];
    if (valor !== undefined && !Number.isNaN(valor)) {
      notas[indicador.modulo].push(pontuacaoIndicador(indicador, valor, universos.get(indicador.codigo) ?? []));
    }
  }

  const notaModulo = (modulo: Modulo) => {
    const valores = notas[modulo];
    const totalIndicadores = INDICADORES_RANKING.filter((item) => item.modulo === modulo).length;
    return valores.reduce((total, item) => total + item, 0) / totalIndicadores;
  };

  const agua = notaModulo("agua");
  const esgoto = notaModulo("esgoto");
  const residuos = notaModulo("residuos");
  const aguasPluviais = notaModulo("aguasPluviais");
  const gestao = notaModulo("gestao");
  const informados = Object.keys(municipio.metricas).length;
  const cobertura = (informados / INDICADORES_RANKING.length) * 100;

  // Cada indicador e módulo conserva seu peso mesmo quando não foi informado.
  // Assim, ausência de dados não eleva artificialmente a posição do município.
  const nota =
    agua * PESOS_RANKING_SANEAMENTO.agua +
    esgoto * PESOS_RANKING_SANEAMENTO.esgoto +
    residuos * PESOS_RANKING_SANEAMENTO.residuos +
    aguasPluviais * PESOS_RANKING_SANEAMENTO.aguasPluviais +
    gestao * PESOS_RANKING_SANEAMENTO.gestao;

  return {
    codigo_ibge: municipio.codigo_ibge,
    municipio: municipio.municipio,
    uf: municipio.uf,
    nota,
    agua,
    esgoto,
    residuos,
    aguasPluviais,
    gestao,
    cobertura,
    resumo: `${informados} de ${INDICADORES_RANKING.length} indicadores informados`
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
  const universos = new Map<string, number[]>();

  for (const ranking of rankings) {
    universos.set(
      ranking.indicador,
      ranking.itens.flatMap((item) => (item.valor === null ? [] : [item.valor]))
    );

    for (const item of ranking.itens) {
      if (item.valor === null) continue;
      const atual = municipios.get(item.codigo_ibge) ?? {
        codigo_ibge: item.codigo_ibge,
        municipio: item.municipio,
        uf: item.uf,
        metricas: {}
      };
      atual.metricas[ranking.indicador] = item.valor;
      municipios.set(item.codigo_ibge, atual);
    }
  }

  return Array.from(municipios.values())
    .map((municipio) => pontuar(municipio, universos))
    .sort((a, b) => b.nota - a.nota || b.cobertura - a.cobertura || a.municipio.localeCompare(b.municipio, "pt-BR"))
    .slice(0, limit)
    .map((item, index) => ({ ...item, posicao: index + 1 }));
}
