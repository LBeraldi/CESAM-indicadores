import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoberturaRanking, TOTAL_INDICADORES_RANKING, indicadoresInformados } from "@/components/CoberturaRanking";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatarNota } from "@/lib/formatters";
import { ANO_RANKING_SANEAMENTO, PESOS_RANKING_SANEAMENTO, type RankingSaneamentoItem } from "@/lib/rankingSaneamento";

type Props = {
  ranking: RankingSaneamentoItem[];
  total: number;
};

const DIMENSOES: { campo: keyof Pick<RankingSaneamentoItem, "agua" | "esgoto" | "residuos" | "aguasPluviais" | "gestao">; rotulo: string }[] = [
  { campo: "agua", rotulo: "Água" },
  { campo: "esgoto", rotulo: "Esgoto" },
  { campo: "residuos", rotulo: "Resíduos" },
  { campo: "aguasPluviais", rotulo: "Pluviais" },
  { campo: "gestao", rotulo: "Gestão" }
];

const pct = (valor: number) => Math.round(valor * 100);

export function RankingSaneamento({ ranking, total }: Props) {
  if (ranking.length === 0) {
    return null;
  }

  const ano = ranking[0].ano ?? ANO_RANKING_SANEAMENTO;

  return (
    <section aria-labelledby="ranking-resumo-titulo" className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Referência PNQS/ABES</p>
          <h2 id="ranking-resumo-titulo" className="t-h2 mt-3 text-ms-ink">
            Ranking municipal de saneamento · {ano}
          </h2>
        </div>
        <Link href="/ranking" className="inline-flex items-center gap-1 text-sm font-semibold text-ms-blue hover:text-ms-navy">
          Ver ranking completo dos {total} municípios
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-ms-line bg-ms-surface">
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Os {ranking.length} primeiros municípios pela nota geral de saneamento de {ano}
            </caption>
            <thead className="bg-ms-surface-muted">
              <tr className="border-b border-ms-line text-left">
                <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Pos.</th>
                <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Município</th>
                <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">
                  Nota geral <span className="font-normal normal-case tracking-normal">0–100</span>
                </th>
                {DIMENSOES.map((dimensao) => (
                  <th key={dimensao.campo} scope="col" className="t-label px-3 py-2.5 text-right text-ms-muted">
                    {dimensao.rotulo}
                  </th>
                ))}
                <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={item.codigo_ibge} className="border-b border-ms-line last:border-b-0 hover:bg-ms-sky/60">
                  <td className="font-data px-4 py-2.5 text-ms-muted">{item.posicao}º</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/municipios/${item.codigo_ibge}`} className="font-semibold text-ms-ink hover:text-ms-blue hover:underline">
                      {item.municipio}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <span className="font-data w-10 text-right font-medium text-ms-ink">{formatarNota(item.nota)}</span>
                      <ScoreBar valor={item.nota} />
                    </span>
                  </td>
                  {DIMENSOES.map((dimensao) => (
                    <td key={dimensao.campo} className="font-data px-3 py-2.5 text-right text-ms-ink">
                      {formatarNota(item[dimensao.campo])}
                    </td>
                  ))}
                  <td className="px-4 py-2.5">
                    <CoberturaRanking item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ol className="divide-y divide-ms-line md:hidden">
          {ranking.map((item) => {
            const incompleta = indicadoresInformados(item) < TOTAL_INDICADORES_RANKING;
            return (
              <li key={item.codigo_ibge} className="flex items-center gap-3 px-4 py-3">
                <span className="font-data w-8 shrink-0 text-sm text-ms-muted">{item.posicao}º</span>
                <span className="min-w-0 flex-1">
                  <Link href={`/municipios/${item.codigo_ibge}`} className="block truncate font-semibold text-ms-ink">
                    {item.municipio}
                  </Link>
                  {incompleta ? <CoberturaRanking item={item} /> : null}
                </span>
                <span className="font-data font-medium text-ms-ink">{formatarNota(item.nota)}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-3 max-w-4xl text-sm leading-[22px] text-ms-muted">
        Nota de 0 a 100 calculada pelo Observatório com os indicadores oficiais de {ano}. Pesos: água{" "}
        {pct(PESOS_RANKING_SANEAMENTO.agua)}%, esgoto {pct(PESOS_RANKING_SANEAMENTO.esgoto)}%, resíduos{" "}
        {pct(PESOS_RANKING_SANEAMENTO.residuos)}%, pluviais {pct(PESOS_RANKING_SANEAMENTO.aguasPluviais)}%, gestão{" "}
        {pct(PESOS_RANKING_SANEAMENTO.gestao)}%. Não é certificação da ABES.{" "}
        <Link href="/metodologia" className="font-semibold text-ms-blue hover:underline">
          Como calculamos
        </Link>
      </p>
    </section>
  );
}
