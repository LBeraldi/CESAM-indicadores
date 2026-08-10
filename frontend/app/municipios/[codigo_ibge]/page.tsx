import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Database, Droplets, ExternalLink, Globe2, MapPinned, Navigation } from "lucide-react";
import { FichaMunicipal } from "@/components/FichaMunicipal";
import { MiniMapaMunicipio } from "@/components/MiniMapaMunicipio";
import { fetchApi, type IndicadoresMunicipio } from "@/lib/api";
import { getPrestadorAgua } from "@/lib/prestadoresAgua";
import { getAtendimentoPrestador } from "@/lib/atendimentoPrestadores";

type Props = {
  params: Promise<{ codigo_ibge: string }>;
};

export default async function MunicipioDetalhePage({ params }: Props) {
  const { codigo_ibge } = await params;
  let dados: IndicadoresMunicipio;

  try {
    dados = await fetchApi<IndicadoresMunicipio>(`/municipios/${codigo_ibge}/indicadores`);
  } catch {
    notFound();
  }

  const { municipio, indicadores } = dados;
  const anos = Array.from(new Set(indicadores.map((valor) => valor.ano))).sort((a, b) => b - a);
  const anoMaisRecente = anos[0] ?? null;
  const anoMaisAntigo = anos[anos.length - 1] ?? null;
  const prestadorAgua = getPrestadorAgua(municipio.codigo_ibge);
  const prestadorAguaNome = prestadorAgua
    ? `${prestadorAgua.nome}${prestadorAgua.sigla ? ` (${prestadorAgua.sigla})` : ""}`
    : "Não informado";
  const atendimentoPrestador = getAtendimentoPrestador(municipio.codigo_ibge, municipio.nome, prestadorAgua);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Trilha de navegação" className="no-print flex flex-wrap items-center gap-1.5 text-sm text-ms-muted">
        <Link href="/" className="hover:text-ms-blue">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link href="/municipios" className="hover:text-ms-blue">
          Municípios
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-ms-ink">{municipio.nome}</span>
      </nav>

      <Link
        href="/municipios"
        className="no-print mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-ms-line bg-white px-3 text-sm font-medium text-ms-ink hover:border-ms-blue hover:text-ms-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para municípios
      </Link>

      <section className="mt-6 border-b border-ms-line pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-ms-green">{municipio.uf}</p>
        <div className="mt-2 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div>
            <h1 className="text-4xl font-semibold tracking-normal text-ms-ink">{municipio.nome}</h1>
            <div className="mt-3 max-w-4xl rounded-md border border-ms-line bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ms-sky text-ms-blue">
                    <Droplets className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ms-muted">Atendimento de água no município</p>
                    <p className="mt-1 break-words text-base font-semibold text-ms-ink">{prestadorAguaNome}</p>
                    <div className="mt-2 flex items-start gap-2 text-sm text-ms-muted">
                      <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-ms-green" />
                      <span>
                        {atendimentoPrestador?.endereco
                          ? `${atendimentoPrestador.endereco}, ${municipio.nome} - MS`
                          : "Endereço local não confirmado em fonte institucional."}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ms-muted">Prestador: {prestadorAgua?.fonte ?? "Fonte não informada"}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-72 lg:justify-end">
                  {atendimentoPrestador ? (
                    <>
                      <a
                        href={atendimentoPrestador.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-ms-line bg-white px-3 text-sm font-semibold text-ms-blue hover:border-ms-blue hover:bg-ms-sky"
                      >
                        <Globe2 className="h-4 w-4" />
                        Site do prestador
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={atendimentoPrestador.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-ms-blue px-3 text-sm font-semibold text-white hover:bg-ms-navy"
                      >
                        <Navigation className="h-4 w-4" />
                        Abrir no Google Maps
                      </a>
                    </>
                  ) : null}
                  {prestadorAgua?.areaAtuacao ? (
                    <span className="w-fit rounded-md bg-ms-bg px-3 py-2 text-xs font-medium text-ms-muted">
                      {prestadorAgua.areaAtuacao}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-ms-muted">
              Código IBGE {municipio.codigo_ibge}
            </p>
          </div>
          <div className="grid gap-3">
            <MiniMapaMunicipio codigoIbge={municipio.codigo_ibge} municipio={municipio.nome} />
            <div className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ms-sky px-3 py-2 text-sm font-medium text-ms-blue">
              <Database className="h-4 w-4" />
              {indicadores.length} registros disponíveis
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-ms-muted">
            <MapPinned className="h-4 w-4 text-ms-green" />
            UF
          </div>
          <p className="mt-2 text-lg font-semibold text-ms-ink">{municipio.uf}</p>
        </div>
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-ms-muted">
            <CalendarDays className="h-4 w-4 text-ms-blue" />
            Série histórica
          </div>
          <p className="mt-2 text-lg font-semibold text-ms-ink">
            {anoMaisAntigo && anoMaisRecente ? `${anoMaisAntigo}-${anoMaisRecente}` : "Não informada"}
          </p>
        </div>
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <p className="text-sm text-ms-muted">População estimada (IBGE)</p>
          <p className="mt-2 text-lg font-semibold text-ms-ink">
            {municipio.populacao ? municipio.populacao.toLocaleString("pt-BR") : "Não informada"}
          </p>
        </div>
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <p className="text-sm text-ms-muted">Área territorial (IBGE)</p>
          <p className="mt-2 text-lg font-semibold text-ms-ink">
            {municipio.area_km2 ? `${municipio.area_km2.toLocaleString("pt-BR")} km²` : "Não informada"}
          </p>
        </div>
      </div>

      <FichaMunicipal municipio={municipio} indicadores={indicadores} />
    </div>
  );
}
