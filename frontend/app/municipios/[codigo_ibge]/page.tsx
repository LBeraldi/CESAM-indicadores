import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPinned } from "lucide-react";
import { FichaMunicipal } from "@/components/FichaMunicipal";
import { ResumoMunicipio } from "@/components/municipio/ResumoMunicipio";
import { fetchApi, fetchApiSafe, type IndicadoresMunicipio, type InstitucionalMunicipio, type Municipio } from "@/lib/api";

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

  const { municipio, indicadores } = dados;
  const anos = Array.from(new Set(indicadores.map((valor) => valor.ano))).sort((a, b) => b - a);
  const anoMaisRecente = anos[0] ?? null;
  const anoMaisAntigo = anos[anos.length - 1] ?? null;

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

      <ResumoMunicipio
        municipio={municipio}
        atendimento={institucional.atendimento_agua}
        indicadores={indicadores}
        totalRegistros={indicadores.length}
      />

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

      <FichaMunicipal municipio={municipio} indicadores={indicadores} recursos={institucional.recursos} />
    </div>
  );
}
