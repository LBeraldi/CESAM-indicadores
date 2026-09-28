import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FichaMunicipal } from "@/components/FichaMunicipal";
import { CoberturaOficial, ResumoMunicipio } from "@/components/municipio/ResumoMunicipio";
import { TEMA_ORDEM, notaDoModulo, temaConfig } from "@/components/municipio/fichaConfig";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { fetchApi, fetchApiSafe, type IndicadoresMunicipio, type InstitucionalMunicipio, type Municipio } from "@/lib/api";
import { formatarArea, formatarNota, formatarPopulacao } from "@/lib/formatters";
import { ANO_RANKING_SANEAMENTO, obterRankingSaneamento } from "@/lib/rankingSaneamento";

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

export default async function MunicipioDetalhePage({ params }: Props) {
  const { codigo_ibge } = await params;
  let dados: IndicadoresMunicipio;
  let institucional: InstitucionalMunicipio;

  try {
    [dados, institucional] = await Promise.all([
      fetchApi<IndicadoresMunicipio>(`/municipios/${codigo_ibge}/indicadores`),
      fetchApiSafe<InstitucionalMunicipio>(`/municipios/${codigo_ibge}/institucional`, {
        atendimento_agua: null,
        recursos: [],
      }),
    ]);
  } catch {
    notFound();
  }

  const ranking = await obterRankingSaneamento();
  const { municipio, indicadores } = dados;
  const rankingItem = ranking.find((item) => item.codigo_ibge === municipio.codigo_ibge) ?? null;
  const anoRanking = ranking[0]?.ano ?? ANO_RANKING_SANEAMENTO;
  const anos = Array.from(new Set(indicadores.map((valor) => valor.ano))).sort((a, b) => b - a);
  const anoMaisRecente = anos[0] ?? null;
  const anoMaisAntigo = anos[anos.length - 1] ?? null;

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

      <div className="mt-4 grid gap-6 pb-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-6">
          <div>
            <p className="eyebrow">Ficha municipal</p>
            <h1 className="t-h1 mt-3 text-ms-ink">{municipio.nome}</h1>
            {/* PG-03.2 Metadados em uma linha, no lugar dos cards */}
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
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
              <div className="flex gap-1.5">
                <dt className="text-ms-muted">Série</dt>
                <dd className="font-data text-ms-ink">
                  {anoMaisAntigo && anoMaisRecente ? `${anoMaisAntigo}–${anoMaisRecente}` : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* PG-03.3 Faixa de notas: mesma nota do ranking (ADR-001) */}
          <section aria-label={`Notas de saneamento ${anoRanking}`} className="rounded-md border border-ms-line bg-ms-surface">
            {rankingItem ? (
              <div className="grid divide-y divide-ms-line md:grid-cols-[13rem_minmax(0,1fr)] md:divide-x md:divide-y-0">
                <div className="grid content-center gap-1 p-4">
                  <p className="t-label text-ms-muted">Nota geral {rankingItem.ano}</p>
                  <p className="flex items-baseline gap-1.5">
                    <span className="t-data-lg text-ms-ink">{formatarNota(rankingItem.nota)}</span>
                    <span className="text-xs text-ms-muted">de 100</span>
                  </p>
                  <p className="text-[13px] text-ms-muted">
                    {rankingItem.posicao}º de {ranking.length} municípios
                  </p>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 sm:grid-cols-3 xl:grid-cols-5">
                  {TEMA_ORDEM.map((tema) => {
                    const config = temaConfig(tema);
                    const Icon = config.icon;
                    const nota = notaDoModulo(rankingItem, tema);
                    return (
                      <li key={tema} className="grid content-start gap-1.5">
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-ms-ink">
                          <Icon className={`h-4 w-4 ${config.textClass}`} strokeWidth={1.75} aria-hidden="true" />
                          {config.nomeCurto}
                        </span>
                        <span className="font-data text-lg font-medium text-ms-ink">{formatarNota(nota)}</span>
                        <ScoreBar valor={nota} cor={config.cor} className="w-full max-w-24" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="p-4 text-sm text-ms-muted">
                Sem nota geral oficial em {anoRanking}: o município não tem indicadores oficiais suficientes nesse ano.
              </p>
            )}
            <p className="border-t border-ms-line px-4 py-2 text-xs text-ms-muted">
              Notas de 0 a 100 do ranking do Observatório, com indicadores oficiais de {rankingItem?.ano ?? anoRanking}.{" "}
              <Link href="/metodologia" className="font-semibold text-ms-blue hover:underline">
                Como calculamos
              </Link>
            </p>
          </section>

          <CoberturaOficial indicadores={indicadores} />
        </div>

        <ResumoMunicipio municipio={municipio} atendimento={institucional.atendimento_agua} />
      </div>

      <FichaMunicipal
        municipio={municipio}
        indicadores={indicadores}
        recursos={institucional.recursos}
        rankingItem={rankingItem}
      />
    </div>
  );
}
