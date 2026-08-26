import Link from "next/link";
import Image from "next/image";
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
      <section className="relative overflow-hidden border-b border-ms-line bg-white">
        <div aria-hidden="true" className="hidrografia-marca">
          <svg viewBox="0 0 640 640" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M40 40C120 120 90 200 150 260C210 320 320 260 380 330C440 400 400 480 470 540C520 585 570 590 610 620"
              stroke="#1f5f9f"
              strokeWidth="3"
            />
            <path
              d="M-10 180C70 190 110 250 90 320C70 390 150 410 190 470C230 530 200 590 260 630"
              stroke="#18765a"
              strokeWidth="3"
            />
            <path
              d="M120 -10C160 60 130 110 190 160C250 210 330 170 380 220C430 270 400 330 460 370C520 410 560 380 620 410"
              stroke="#0c2d57"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1fr_20rem] lg:items-start">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 border-b-2 border-ms-green pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ms-green">
              <Image src="/brand/cesam-symbol.svg" alt="" width={18} height={18} aria-hidden="true" />
              Observatório de Saneamento · CESAM
            </div>
            <h1 className="mt-4 font-serif text-4xl italic leading-[1.1] text-ms-ink md:text-[3.25rem]">
              O retrato do saneamento em Mato Grosso do Sul, município por município.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-ms-muted">
              Água, esgoto, resíduos, águas pluviais e gestão: consulte a série histórica, compare os 79 municípios
              e exporte o relatório de cada território.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
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

          <div className="ficha-campo rounded-md p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ms-muted">Ficha do acervo</p>
            <dl className="mt-1">
              <div className="flex items-baseline justify-between py-3">
                <dt className="flex items-center gap-2 text-sm text-ms-ink">
                  <MapPinned className="h-4 w-4 text-ms-green" />
                  Municípios
                </dt>
                <dd className="font-data text-xl font-medium text-ms-ink">{municipios.length}</dd>
              </div>
              <div className="flex items-baseline justify-between py-3">
                <dt className="flex items-center gap-2 text-sm text-ms-ink">
                  <Database className="h-4 w-4 text-ms-blue" />
                  Indicadores
                </dt>
                <dd className="font-data text-xl font-medium text-ms-ink">{indicadores.length}</dd>
              </div>
              <Link href="/municipios" className="group flex items-baseline justify-between py-3">
                <dt className="flex items-center gap-2 text-sm text-ms-ink">
                  <History className="h-4 w-4 text-ms-amber" />
                  Série disponível
                </dt>
                <dd className="font-data text-xl font-medium text-ms-ink group-hover:text-ms-blue">1995–2023</dd>
              </Link>
            </dl>
            <Link href="/municipios" className="mt-1 block text-xs font-semibold text-ms-blue hover:underline">
              Ver evolução por município →
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {recursos.map((item, index) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className="rounded-md border border-ms-line bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ms-sky text-ms-blue">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-data text-xs text-ms-line">0{index + 1}</span>
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
            <p className="inline-block border-b-2 border-ms-green pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ms-green">
              Primeira etapa
            </p>
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
