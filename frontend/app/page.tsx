import Link from "next/link";
import { ArrowRight, Database, FileCheck2, History, MapPinned, ShieldCheck } from "lucide-react";
import { AvisoIndisponivel } from "@/components/AvisoIndisponivel";
import { MapaMunicipiosMS } from "@/components/MapaMunicipiosMS";
import { RankingSaneamento } from "@/components/RankingSaneamento";
import { fetchApiResult, type Indicador, type Municipio } from "@/lib/api";
import { obterRankingSaneamento } from "@/lib/rankingSaneamento";

const recursos = [
  {
    title: "Fontes oficiais",
    description: "Dados do SINISA, SNIS Série Histórica e malha municipal do IBGE organizados por código municipal.",
    icon: ShieldCheck
  },
  {
    title: "Consulta por território",
    description: "Mapa de Mato Grosso do Sul com navegação direta para a ficha de cada município.",
    icon: MapPinned
  },
  {
    title: "Exportação e relatório",
    description: "Filtros por ano, tema e fonte com impressão e exportação em CSV para análise externa.",
    icon: FileCheck2
  }
];

export default async function Home() {
  const [municipiosResult, indicadoresResult, rankingSaneamentoCompleto] = await Promise.all([
    fetchApiResult<Municipio[]>("/municipios", []),
    fetchApiResult<Indicador[]>("/indicadores", []),
    obterRankingSaneamento()
  ]);

  const municipios = municipiosResult.data;
  const indicadores = indicadoresResult.data;
  const apiIndisponivel = !municipiosResult.disponivel || !indicadoresResult.disponivel;
  const rankingSaneamento = rankingSaneamentoCompleto.slice(0, 8);

  return (
    <div>
      {apiIndisponivel ? (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <AvisoIndisponivel />
        </div>
      ) : null}
      <section className="border-b border-ms-line bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-ms-line bg-ms-bg px-3 py-2 text-sm font-semibold text-ms-green">
              <img src="/brand/cesam-symbol.svg" alt="" className="h-6 w-6" aria-hidden="true" />
              Observatório de Saneamento
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-ms-ink md:text-5xl">
              Dados municipais de saneamento e infraestrutura de Mato Grosso do Sul
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ms-muted">
              Consulte séries históricas, compare indicadores e gere relatórios municipais em uma interface clara,
              sóbria e preparada para expansão.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/municipios"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-ms-blue px-4 text-sm font-semibold text-white hover:bg-ms-navy"
              >
                Consultar municípios
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#mapa-ms"
                className="inline-flex h-11 items-center gap-2 rounded-md border border-ms-line bg-white px-4 text-sm font-semibold text-ms-ink hover:border-ms-blue hover:text-ms-blue"
              >
                Ver mapa de MS
                <MapPinned className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-md border border-ms-line bg-ms-bg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-ms-muted">
                <MapPinned className="h-4 w-4 text-ms-green" />
                Municípios
              </div>
              <p className="mt-3 text-3xl font-semibold text-ms-ink">{municipios.length}</p>
            </div>
            <div className="rounded-md border border-ms-line bg-ms-bg p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-ms-muted">
                <Database className="h-4 w-4 text-ms-blue" />
                Indicadores
              </div>
              <p className="mt-3 text-3xl font-semibold text-ms-ink">{indicadores.length}</p>
            </div>
            <Link
              href="/municipios"
              className="rounded-md border border-ms-line bg-ms-bg p-4 transition hover:border-ms-blue hover:bg-white"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-ms-muted">
                <History className="h-4 w-4 text-ms-amber" />
                Série disponível
              </div>
              <p className="mt-3 text-3xl font-semibold text-ms-ink">1995-2023</p>
              <p className="mt-1 text-xs text-ms-blue">Ver evolução por município →</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {recursos.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="rounded-md border border-ms-line bg-white p-5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ms-sky text-ms-blue">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-ms-ink">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ms-muted">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <RankingSaneamento ranking={rankingSaneamento} />

      <section id="mapa-ms" className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ms-green">Primeira etapa</p>
            <h2 className="mt-1 text-2xl font-semibold text-ms-ink">Seleção territorial por município</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-ms-muted">
            Use o mapa ou a lista para abrir a ficha municipal, selecionar anos de referência e exportar os dados.
          </p>
        </div>
        <MapaMunicipiosMS municipios={municipios} notaSaneamento={rankingSaneamentoCompleto} />
      </section>
    </div>
  );
}
