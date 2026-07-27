import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Database, Droplets, MapPinned } from "lucide-react";
import { FichaMunicipal } from "@/components/FichaMunicipal";
import { fetchApi, type IndicadoresMunicipio } from "@/lib/api";
import { getPrestadorAgua } from "@/lib/prestadoresAgua";

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
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-normal text-ms-ink">{municipio.nome}</h1>
            <div className="mt-3 max-w-3xl rounded-md border border-ms-line bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ms-sky text-ms-blue">
                    <Droplets className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ms-muted">Concessionária de distribuição de água</p>
                    <p className="mt-1 break-words text-base font-semibold text-ms-ink">{prestadorAguaNome}</p>
                    <p className="mt-1 text-xs text-ms-muted">
                      Fonte: {prestadorAgua?.fonte ?? "Não informada"}
                    </p>
                  </div>
                </div>
                {prestadorAgua?.areaAtuacao ? (
                  <span className="w-fit rounded-md bg-ms-bg px-3 py-2 text-xs font-medium text-ms-muted">
                    {prestadorAgua.areaAtuacao}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-ms-muted">
              Código IBGE {municipio.codigo_ibge}
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-md bg-ms-sky px-3 py-2 text-sm font-medium text-ms-blue">
            <Database className="h-4 w-4" />
            {indicadores.length} registros disponíveis
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
