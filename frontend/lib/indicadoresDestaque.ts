import type { ValorIndicador } from "@/lib/api";

/**
 * ADR-007: indicadores principais de cada dimensão, na ordem em que aparecem na aba.
 * A lista completa continua acessível em "Ver todos" e na aba "Todos os indicadores".
 */
export const INDICADORES_DESTAQUE: Record<string, readonly string[]> = {
  Água: [
    "agua_atendimento_total",
    "agua_atendimento_urbano",
    "agua_perdas_distribuicao",
    "agua_consumo_per_capita",
    "agua_extensao_rede",
  ],
  Esgoto: [
    "esgoto_atendimento_total",
    "esgoto_atendimento_urbano",
    "esgoto_coleta",
    "esgoto_tratamento",
    "esgoto_extensao_rede",
  ],
  "Resíduos sólidos": [
    "residuos_cobertura_coleta_domiciliar",
    "residuos_cobertura_coleta_seletiva",
    "residuos_massa_coletada_per_capita",
    "residuos_massa_recuperada_per_capita",
  ],
  "Águas pluviais": [
    "aguas_pluviais_vias_pavimentadas",
    "aguas_pluviais_rede_subterranea",
    "aguas_pluviais_domicilios_risco_inundacao",
    "aguas_pluviais_populacao_impactada",
  ],
  "Gestão municipal": [
    "gestao_plano_municipal_saneamento",
    "gestao_conselho_municipal",
    "gestao_agencia_reguladora",
  ],
};

const TODOS_DESTAQUES = new Set(Object.values(INDICADORES_DESTAQUE).flat());

export function ehDestaque(codigo: string): boolean {
  return TODOS_DESTAQUES.has(codigo);
}

/** Valores do tema que estão em destaque, na ordem de INDICADORES_DESTAQUE. */
export function selecionarDestaques(valores: ValorIndicador[], tema: string): ValorIndicador[] {
  const ordem = INDICADORES_DESTAQUE[tema] ?? [];
  const porCodigo = new Map<string, ValorIndicador>();

  for (const valor of valores) {
    if (valor.indicador.tema !== tema || !ordem.includes(valor.indicador.codigo)) continue;

    const atual = porCodigo.get(valor.indicador.codigo);
    // A visão de destaques representa indicadores, não todos os registros históricos.
    if (!atual || valor.ano > atual.ano) porCodigo.set(valor.indicador.codigo, valor);
  }

  const posicao = new Map(ordem.map((codigo, index) => [codigo, index]));
  return [...porCodigo.values()].sort(
    (a, b) => (posicao.get(a.indicador.codigo) ?? Infinity) - (posicao.get(b.indicador.codigo) ?? Infinity),
  );
}
