/**
 * Uso restrito à fórmula fixa da nota composta de saneamento
 * (lib/rankingSaneamento.ts), que já referencia estes códigos de indicador
 * diretamente. Para qualquer tela que exiba indicadores genéricos (ficha
 * municipal, mapa, ranking completo), use o campo `sentido` que já vem da
 * API (Indicador.sentido / RankingItem.sentido) em vez desta lista — ele é a
 * fonte única de verdade no backend (app/models.py) e evita que as duas
 * camadas divirjam quando um indicador novo for cadastrado.
 */
export const INDICADORES_MENOR_MELHOR = new Set<string>(["agua_perdas_distribuicao"]);

export function valorNormalizado(codigoIndicador: string, valorPercentual: number): number {
  if (INDICADORES_MENOR_MELHOR.has(codigoIndicador)) {
    return 100 - valorPercentual;
  }

  return valorPercentual;
}
