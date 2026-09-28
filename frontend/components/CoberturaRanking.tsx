import { Badge } from "@/components/ui/Badge";
import { INDICADORES_RANKING_SANEAMENTO, type RankingSaneamentoItem } from "@/lib/rankingSaneamento";

export const TOTAL_INDICADORES_RANKING = INDICADORES_RANKING_SANEAMENTO.length;

export function indicadoresInformados(item: Pick<RankingSaneamentoItem, "cobertura">): number {
  return Math.round((item.cobertura / 100) * TOTAL_INDICADORES_RANKING);
}

/** PG-02.3: "completa" discreto; selo de atenção só quando incompleta; selo tracejado sem dado. */
export function CoberturaRanking({ item, ano }: { item: RankingSaneamentoItem | null | undefined; ano?: number }) {
  if (!item) {
    return <Badge variante="missing">sem dado{ano ? ` ${ano}` : ""}</Badge>;
  }

  const informados = indicadoresInformados(item);
  if (informados >= TOTAL_INDICADORES_RANKING) {
    return <span className="text-xs text-ms-muted">completa</span>;
  }

  return (
    <Badge variante="warning">
      {informados} de {TOTAL_INDICADORES_RANKING}
    </Badge>
  );
}
