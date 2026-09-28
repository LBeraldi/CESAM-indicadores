import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { AvisoIndisponivel } from "@/components/AvisoIndisponivel";
import { BuscaMunicipio } from "@/components/BuscaMunicipio";
import { MapaMunicipiosMS } from "@/components/MapaMunicipiosMS";
import { RankingSaneamento } from "@/components/RankingSaneamento";
import { Badge } from "@/components/ui/Badge";
import { fetchApiResult, type Indicador, type Municipio } from "@/lib/api";
import { ANO_RANKING_SANEAMENTO, obterRankingSaneamento } from "@/lib/rankingSaneamento";

// O SNIS Série Histórica vai até 2022; a partir de 2023 a referência é o SINISA.
function fonteDoAno(ano: number): string {
  return ano >= 2023 ? `SINISA ${ano}` : `SNIS ${ano}`;
}

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
  const anoReferencia = rankingSaneamentoCompleto[0]?.ano ?? ANO_RANKING_SANEAMENTO;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";
  const listaBusca = municipios.map(({ codigo_ibge, nome }) => ({ codigo_ibge, nome }));

  return (
    <div>
      {apiIndisponivel ? (
        <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6 lg:px-8">
          <AvisoIndisponivel />
        </div>
      ) : null}

      <section className="relative overflow-hidden border-b border-ms-line bg-ms-surface">
        <div aria-hidden="true" className="hidrografia-marca">
          <svg viewBox="0 0 640 640" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M40 40C120 120 90 200 150 260C210 320 320 260 380 330C440 400 400 480 470 540C520 585 570 590 610 620"
              stroke="var(--color-action)"
              strokeWidth="3"
            />
            <path
              d="M-10 180C70 190 110 250 90 320C70 390 150 410 190 470C230 530 200 590 260 630"
              stroke="var(--color-brand-green)"
              strokeWidth="3"
            />
            <path
              d="M120 -10C160 60 130 110 190 160C250 210 330 170 380 220C430 270 400 330 460 370C520 410 560 380 620 410"
              stroke="var(--color-navy)"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow">
              <Image src="/brand/cesam-symbol.svg" alt="" width={16} height={16} aria-hidden="true" />
              Observatório de Saneamento · CESAM
            </p>
            <h1 className="t-display mt-4 max-w-[22ch] text-ms-ink">
              O retrato do saneamento em Mato Grosso do Sul, município por município.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-[26px] text-ms-muted">
              Água, esgoto, resíduos, águas pluviais e gestão: consulte a série histórica, compare os 79 municípios e
              exporte o relatório de cada território.
            </p>

            <BuscaMunicipio municipios={listaBusca} mostrarBotao className="mt-6 max-w-xl" />

            <nav aria-label="Atalhos" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ms-blue">
              <a href="#mapa-ms" className="hover:underline">
                Selecionar no mapa ↓
              </a>
              <Link href="/municipios" className="hover:underline">
                Ver lista dos 79 municípios
              </Link>
              <Link href="/ranking" className="hover:underline">
                Ranking {anoReferencia}
              </Link>
            </nav>
          </div>

          <div className="ficha-campo rounded-md px-5 pb-0.5 pt-4">
            <p className="t-label text-ms-muted">Base de dados</p>
            <dl className="mt-1">
              <div className="flex h-11 items-center justify-between">
                <dt className="text-sm text-ms-ink">Municípios</dt>
                <dd className="font-data text-lg font-medium text-ms-ink">{municipios.length}</dd>
              </div>
              <div className="flex h-11 items-center justify-between">
                <dt className="text-sm text-ms-ink">Indicadores</dt>
                <dd className="font-data text-lg font-medium text-ms-ink">{indicadores.length}</dd>
              </div>
              <div className="flex h-11 items-center justify-between">
                <dt className="text-sm text-ms-ink">Série histórica</dt>
                <dd className="font-data text-lg font-medium text-ms-ink">1995–2024</dd>
              </div>
              <div className="flex h-11 items-center justify-between">
                <dt className="text-sm text-ms-ink">Referência atual</dt>
                <dd>
                  <Badge variante={anoReferencia >= 2023 ? "official" : "historical"}>{fonteDoAno(anoReferencia)}</Badge>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section id="mapa-ms" aria-labelledby="mapa-titulo" className="mx-auto max-w-7xl px-4 pt-8 md:px-6 md:pt-12 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Seleção territorial</p>
            <h2 id="mapa-titulo" className="t-h2 mt-3 text-ms-ink">
              Escolha um município no mapa
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-[22px] text-ms-muted">
            Clique em um município ou use o seletor para ver as notas por dimensão e abrir a ficha completa.
          </p>
        </div>
        <MapaMunicipiosMS municipios={municipios} notaSaneamento={rankingSaneamentoCompleto} />
      </section>

      <RankingSaneamento ranking={rankingSaneamento} total={municipios.length || rankingSaneamentoCompleto.length} />

      <section aria-labelledby="fontes-titulo" className="border-t border-ms-line bg-ms-surface">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12 lg:px-8">
          <h2 id="fontes-titulo" className="sr-only">
            Fontes, metodologia e dados abertos
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="t-h3 text-ms-ink">Fontes oficiais</h3>
              <p className="mt-2 text-sm leading-[22px] text-ms-muted">
                SINISA, SNIS Série Histórica 1995–2022 e malha municipal do IBGE, organizados pelo código IBGE.
              </p>
              <Link href="/metodologia#fontes" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ms-blue hover:underline">
                Ver fontes
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div>
              <h3 className="t-h3 text-ms-ink">Metodologia</h3>
              <p className="mt-2 text-sm leading-[22px] text-ms-muted">
                Como cada indicador é lido, o sentido (maior ou menor é melhor) e como a nota geral é composta.
              </p>
              <Link href="/metodologia" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ms-blue hover:underline">
                Ler a metodologia
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
            <div>
              <h3 className="t-h3 text-ms-ink">Dados abertos</h3>
              <p className="mt-2 text-sm leading-[22px] text-ms-muted">
                Exportação em CSV em cada ficha municipal e API documentada para consultas automatizadas.
              </p>
              <a
                href={`${apiUrl}/docs`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ms-blue hover:underline"
              >
                Documentação da API ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
