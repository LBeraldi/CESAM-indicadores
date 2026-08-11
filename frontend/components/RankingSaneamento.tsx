import Link from "next/link";
import { ArrowRight, Droplets, Gauge, Trophy, Waves } from "lucide-react";
import { ANO_RANKING_SANEAMENTO, PESOS_RANKING_SANEAMENTO, type RankingSaneamentoItem } from "@/lib/rankingSaneamento";

type Props = {
  ranking: RankingSaneamentoItem[];
};

function formatNota(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function barra(valor: number): string {
  return `${Math.max(0, Math.min(100, valor))}%`;
}

export function RankingSaneamento({ ranking }: Props) {
  if (ranking.length === 0) {
    return null;
  }

  const lider = ranking[0];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-8">
      <div className="overflow-hidden rounded-md border border-ms-line bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
          <div className="p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-ms-green">Referência PNQS/ABES</p>
                <h2 className="mt-1 text-2xl font-semibold text-ms-ink">Ranking municipal de saneamento</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ms-muted">
                  Nota calculada pelo Observatório a partir de 16 indicadores dos cinco módulos do SINISA, em escala
                  comparável de 0 a 100. Não representa certificação ou premiação oficial da ABES.
                </p>
                <details className="mt-3 max-w-3xl text-sm text-ms-muted">
                  <summary className="cursor-pointer font-medium text-ms-blue">Como calculamos essa nota</summary>
                  <div className="mt-2 grid gap-1 rounded-md bg-ms-bg p-3 leading-6">
                    <p>Água {Math.round(PESOS_RANKING_SANEAMENTO.agua * 100)}% · Esgoto {Math.round(PESOS_RANKING_SANEAMENTO.esgoto * 100)}% · Resíduos {Math.round(PESOS_RANKING_SANEAMENTO.residuos * 100)}% · Águas pluviais {Math.round(PESOS_RANKING_SANEAMENTO.aguasPluviais * 100)}% · Gestão {Math.round(PESOS_RANKING_SANEAMENTO.gestao * 100)}%.</p>
                    <p>
                      Indicadores de perdas, risco e impacto hidrológico são invertidos. Dados ausentes não são
                      estimados e reduzem a contribuição do módulo correspondente.
                    </p>
                  </div>
                </details>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span className="inline-flex w-fit items-center gap-2 rounded-md bg-ms-bg px-3 py-2 text-sm font-medium text-ms-muted">
                  <Gauge className="h-4 w-4 text-ms-blue" />
                  Ref. {ANO_RANKING_SANEAMENTO}
                </span>
                <Link href="/ranking" className="inline-flex items-center gap-1 text-sm font-semibold text-ms-blue hover:text-ms-navy">
                  Ver ranking completo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-ms-line text-left text-xs font-semibold uppercase tracking-wide text-ms-muted">
                    <th className="pb-3 pr-4">Posição</th>
                    <th className="pb-3 pr-4">Município</th>
                    <th className="pb-3 pr-4">Nota</th>
                    <th className="pb-3 pr-4">Água</th>
                    <th className="pb-3 pr-4">Esgoto</th>
                    <th className="pb-3 pr-4">Resíduos</th>
                    <th className="pb-3 pr-4">Pluviais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ms-line">
                  {ranking.map((item) => (
                    <tr key={item.codigo_ibge} className="align-top">
                      <td className="whitespace-nowrap py-4 pr-4">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ms-sky text-sm font-semibold text-ms-blue">
                          {item.posicao}
                        </span>
                      </td>
                      <td className="min-w-56 py-4 pr-4">
                        <Link
                          href={`/municipios/${item.codigo_ibge}`}
                          className="font-semibold text-ms-ink hover:text-ms-blue"
                        >
                          {item.municipio}
                        </Link>
                        <p className="mt-1 text-xs leading-5 text-ms-muted">{item.resumo}</p>
                      </td>
                      <td className="min-w-36 py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-ms-ink">{formatNota(item.nota)}</span>
                          <div className="h-2 w-20 overflow-hidden rounded-full bg-ms-bg">
                            <div className="h-full rounded-full bg-ms-blue" style={{ width: barra(item.nota) }} />
                          </div>
                        </div>
                      </td>
                      <td className="min-w-28 py-4 pr-4">
                        <span className="font-semibold text-ms-green">{formatNota(item.agua)}</span>
                      </td>
                      <td className="min-w-28 py-4 pr-4">
                        <span className="font-semibold text-ms-blue">{formatNota(item.esgoto)}</span>
                      </td>
                      <td className="min-w-28 py-4 pr-4">
                        <span className="font-semibold text-ms-green">{formatNota(item.residuos)}</span>
                      </td>
                      <td className="min-w-28 py-4 pr-4">
                        <span className="font-semibold text-ms-blue">{formatNota(item.aguasPluviais)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="border-t border-ms-line bg-ms-bg p-5 lg:border-l lg:border-t-0">
            <div className="rounded-md bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ms-blue text-white">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ms-muted">Líder atual</p>
                  <p className="font-semibold text-ms-ink">{lider.municipio}</p>
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-normal text-ms-blue">{formatNota(lider.nota)}</p>
              <p className="mt-1 text-xs text-ms-muted">Nota PNQS/ABES adaptada</p>
            </div>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-md border border-ms-line bg-white p-4">
                <div className="flex items-center gap-2 font-semibold text-ms-ink">
                  <Droplets className="h-4 w-4 text-ms-green" />
                  Água
                </div>
                <p className="mt-2 leading-6 text-ms-muted">
                  Atendimento total, atendimento urbano e perdas na distribuição com peso invertido.
                </p>
              </div>
              <div className="rounded-md border border-ms-line bg-white p-4">
                <div className="flex items-center gap-2 font-semibold text-ms-ink">
                  <Waves className="h-4 w-4 text-ms-blue" />
                  Esgoto
                </div>
                <p className="mt-2 leading-6 text-ms-muted">
                  Atendimento, coleta e tratamento informados na base oficial.
                </p>
              </div>
            </div>

            <Link
              href={`/municipios/${lider.codigo_ibge}`}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-ms-blue px-3 text-sm font-semibold text-white hover:bg-ms-navy"
            >
              Ver líder do ranking
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
