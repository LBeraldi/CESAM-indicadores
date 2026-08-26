import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, LandPlot, MapPinned, Users } from "lucide-react";
import { FichaMunicipal } from "@/components/FichaMunicipal";
import { ResumoMunicipio } from "@/components/municipio/ResumoMunicipio";
import { StatCardGroup } from "@/components/ui/stat-card-group";
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

      <StatCardGroup
        className="mt-5"
        items={[
          {
            label: "UF",
            value: municipio.uf,
            icon: MapPinned,
            tone: "green",
            detail: "Unidade federativa"
          },
          {
            label: "Série histórica",
            value: anoMaisAntigo && anoMaisRecente ? `${anoMaisAntigo}-${anoMaisRecente}` : "Não informada",
            icon: CalendarDays,
            tone: "blue",
            detail: "Período com registros"
          },
          {
            label: "População estimada (IBGE)",
            value: municipio.populacao ? municipio.populacao.toLocaleString("pt-BR") : "Não informada",
            icon: Users,
            tone: "teal",
            detail: "Referência territorial IBGE"
          },
          {
            label: "Área territorial (IBGE)",
            value: municipio.area_km2 ? `${municipio.area_km2.toLocaleString("pt-BR")} km²` : "Não informada",
            icon: LandPlot,
            tone: "amber",
            detail: "Extensão do município"
          }
        ]}
      />

      <FichaMunicipal municipio={municipio} indicadores={indicadores} recursos={institucional.recursos} />
    </div>
  );
}
