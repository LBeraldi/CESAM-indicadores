import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaMunicipal } from "@/components/FichaMunicipal";
import { CoberturaOficial, ResumoMunicipio } from "@/components/municipio/ResumoMunicipio";
import { TEMA_ORDEM, notaDoModulo, temaConfig } from "@/components/municipio/fichaConfig";
import { ScoreBar } from "@/components/ui/ScoreBar";
import {
  fetchApi,
  ApiError,
  fetchApiResult,
  type IndicadoresMunicipio,
  type InstitucionalMunicipio,
  type Municipio,
  type ValorIndicador,
} from "@/lib/api";
import { formatarArea, formatarNota, formatarPopulacao } from "@/lib/formatters";
import { ANO_RANKING_SANEAMENTO, obterRankingSaneamento, type RankingSaneamentoItem } from "@/lib/rankingSaneamento";

type Props = {
  params: Promise<{ codigo_ibge: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { codigo_ibge } = await params;

  try {
    const municipio = await fetchApi<Municipio>(`/municipios/${codigo_ibge}`);
    const titulo = `Saneamento em ${municipio.nome} (${municipio.uf})`;
    const descricao = `Indicadores oficiais de água, esgoto, resíduos sólidos e águas pluviais de ${municipio.nome} - ${municipio.uf}, com série histórica e dados institucionais do prestador de serviço.`;

    return {
      title: titulo,
      description: descricao,
      alternates: { canonical: `/municipios/${municipio.codigo_ibge}` }
    };
  } catch {
    return { title: "Município" };
  }
}

function CabecalhoFicha({
  municipio,
  anoMaisAntigo,
  anoMaisRecente,
}: {
  municipio: Municipio;
  anoMaisAntigo: number | null;
  anoMaisRecente: number | null;
}) {
  return (<div className="min-w-0">
            <p className="eyebrow">Ficha municipal</p>
            <h1 className="t-h1 mt-3 text-ms-ink">{municipio.nome}</h1>
            {/* PG-03.2 Metadados em uma linha, no lugar dos cards */}
            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              <div className="flex gap-1.5">
                <dt className="text-ms-muted">Código IBGE</dt>
                <dd className="font-data text-ms-ink">{municipio.codigo_ibge}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ms-muted">População</dt>
                <dd className="text-ms-ink">
                  <span className="font-data">{formatarPopulacao(municipio.populacao)}</span>
                  {municipio.populacao ? <span className="ml-1 text-xs text-ms-muted">hab.</span> : null}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ms-muted">Área</dt>
                <dd className="text-ms-ink">
                  <span className="font-data">{formatarArea(municipio.area_km2)}</span>
                  {municipio.area_km2 ? <span className="ml-1 text-xs text-ms-muted">km²</span> : null}
                </dd>
              </div>
              <div className="flex basis-full gap-1.5">
                <dt className="text-ms-muted">Série</dt>
                <dd className="font-data text-ms-ink">
                  {anoMaisAntigo && anoMaisRecente ? `${anoMaisAntigo}–${anoMaisRecente}` : "—"}
                </dd>
              </div>
            </dl>
          </div>
  );
}

/** PG-03.3 Faixa de notas: mesma nota do ranking (ADR-001), uma célula por dimensão. */
function FaixaNotas({
  rankingItem,
  totalMunicipios,
  anoRanking,
  indicadores,
}: {
  rankingItem: RankingSaneamentoItem | null;
  totalMunicipios: number;
  anoRanking: number;
  indicadores: ValorIndicador[];
}) {
  return (<section aria-label={`Notas de saneamento ${anoRanking}`} className="overflow-hidden rounded-md border border-ms-line bg-ms-surface">
            {rankingItem ? (
              <ul className="grid grid-cols-2 gap-px bg-ms-line sm:grid-cols-3 lg:grid-cols-[minmax(0,1.15fr)_repeat(5,minmax(0,1fr))]">
                <li className="col-span-2 grid content-start gap-1 bg-ms-surface p-3.5 sm:col-span-1">
                  <p className="t-label text-ms-muted">Nota geral {rankingItem.ano}</p>
                  <p className="t-data-lg text-ms-ink">{formatarNota(rankingItem.nota)}</p>
                  <p className="text-xs text-ms-muted">
                    0–100 · {rankingItem.posicao}º de {totalMunicipios}
                  </p>
                </li>
                {TEMA_ORDEM.map((tema) => {
                  const config = temaConfig(tema);
                  const Icon = config.icon;
                  const nota = notaDoModulo(rankingItem, tema);
                  return (
                    // No celular (2 colunas), a última dimensão ocupa a linha inteira para não sobrar célula vazia.
                    <li key={tema} className={`grid content-start gap-2 bg-ms-surface p-3.5 ${tema === TEMA_ORDEM[TEMA_ORDEM.length - 1] ? "col-span-2 sm:col-span-1" : ""}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded ${config.bgClass} text-white`}>
                          <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                        </span>
                        <span className="t-label text-ms-muted">{config.nomeCurto}</span>
                      </span>
                      <span className="font-data text-lg font-medium text-ms-ink">{formatarNota(nota)}</span>
                      <ScoreBar valor={nota} cor={config.cor} className="w-full" />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-4 text-sm text-ms-muted">
                Sem nota geral oficial em {anoRanking}: o município não tem indicadores oficiais suficientes nesse ano.
              </p>
            )}
            {/* PG-03.3.1 Cobertura oficial no rodapé, discreta */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-ms-line bg-ms-surface-muted px-3.5 py-2">
              <CoberturaOficial indicadores={indicadores} />
              <p className="text-xs text-ms-muted">
                Indicadores oficiais de {rankingItem?.ano ?? anoRanking} ·{" "}
                <Link href="/metodologia" className="font-semibold text-ms-blue hover:underline">
                  Como calculamos
                </Link>
              </p>
            </div>
          </section>
  );
}

export default async function MunicipioDetalhePage({ params }: Props) {
  const { codigo_ibge } = await params;
  let dados: IndicadoresMunicipio;
  let institucionalResult: { data: InstitucionalMunicipio; disponivel: boolean };

  try {
    [dados, institucionalResult] = await Promise.all([
      fetchApi<IndicadoresMunicipio>(`/municipios/${codigo_ibge}/indicadores`),
      fetchApiResult<InstitucionalMunicipio>(`/municipios/${codigo_ibge}/institucional`, {
        atendimento_agua: null,
        recursos: [],
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const institucional = institucionalResult.data;
  const ranking = await obterRankingSaneamento();
  const { municipio, indicadores } = dados;
  const rankingItem = ranking.find((item) => item.codigo_ibge === municipio.codigo_ibge) ?? null;
  const anoRanking = ranking[0]?.ano ?? ANO_RANKING_SANEAMENTO;
  const anos = Array.from(new Set(indicadores.map((valor) => valor.ano))).sort((a, b) => b - a);
  const anoMaisRecente = anos[0] ?? null;
  const anoMaisAntigo = anos[anos.length - 1] ?? null;
  const notasMapa = Object.fromEntries(ranking.map((item) => [item.codigo_ibge, item.nota]));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 md:px-6 md:pt-8 lg:px-8">
      <nav aria-label="Trilha de navegação" className="no-print text-sm text-ms-muted">
        <Link href="/" className="hover:text-ms-blue">
          Início
        </Link>
        <span aria-hidden="true"> / </span>
        <Link href="/municipios" className="hover:text-ms-blue">
          Municípios
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ms-ink" aria-current="page">
          {municipio.nome}
        </span>
      </nav>

      <FichaMunicipal
        municipio={municipio}
        indicadores={indicadores}
        recursos={institucional.recursos}
        rankingItem={rankingItem}
        cabecalho={<CabecalhoFicha municipio={municipio} anoMaisAntigo={anoMaisAntigo} anoMaisRecente={anoMaisRecente} />}
        faixaNotas={
          <FaixaNotas rankingItem={rankingItem} totalMunicipios={ranking.length} anoRanking={anoRanking} indicadores={indicadores} />
        }
        lateral={
          <ResumoMunicipio
            municipio={municipio}
            atendimento={institucional.atendimento_agua}
            institucionalDisponivel={institucionalResult.disponivel}
            notas={notasMapa}
            anoNotas={anoRanking}
          />
        }
      />
    </div>
  );
}
