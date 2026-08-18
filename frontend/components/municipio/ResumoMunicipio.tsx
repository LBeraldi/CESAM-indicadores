import { CheckCircle2, Database, Droplets, ExternalLink, Globe2, MapPinned, MinusCircle, Navigation } from "lucide-react";

import { MiniMapaMunicipio } from "@/components/MiniMapaMunicipio";
import { calcularCobertura } from "@/components/municipio/fichaConfig";
import type { AtendimentoAgua, Municipio, ValorIndicador } from "@/lib/api";

type Props = {
  municipio: Municipio;
  atendimento: AtendimentoAgua | null;
  indicadores: ValorIndicador[];
  totalRegistros: number;
};

export function ResumoMunicipio({ municipio, atendimento, indicadores, totalRegistros }: Props) {
  const prestador = atendimento
    ? `${atendimento.prestador_nome}${atendimento.sigla ? ` (${atendimento.sigla})` : ""}`
    : "Não informado";
  const cobertura = calcularCobertura(indicadores);

  return (
    <section className="mt-6 border-b border-ms-line pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-ms-green">Município de {municipio.uf}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-normal text-ms-ink">{municipio.nome}</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-ms-muted sm:justify-end">
          <span className="inline-flex items-center rounded-full border border-ms-line bg-white px-3 py-1.5">
            Código IBGE&nbsp;<strong className="text-ms-ink">{municipio.codigo_ibge}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ms-sky px-3 py-1.5 text-ms-blue">
            <Database className="h-3.5 w-3.5" />
            <strong>{totalRegistros}</strong> registros disponíveis
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ms-muted">Cobertura oficial</span>
        {cobertura.map(({ tema, config, coberto }) => {
          const Icon = config.icon;
          return (
            <span
              key={tema}
              title={
                coberto
                  ? `${tema}: dado oficial (SINISA ou SNIS) disponível para este município.`
                  : `${tema}: nenhuma fonte oficial reportou dado para este município até o momento.`
              }
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                coberto ? config.panelClass : "bg-ms-bg text-ms-muted"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${coberto ? "" : "opacity-50"}`} />
              {tema}
              {coberto ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <MinusCircle className="h-3.5 w-3.5 opacity-50" />
              )}
            </span>
          );
        })}
      </div>

      <div className="mt-4 grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.75fr)]">
        <div className="h-full rounded-md border border-ms-line bg-white p-5 shadow-sm">
          <div className="flex h-full flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-ms-sky text-ms-blue">
                <Droplets className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ms-muted">Atendimento de água no município</p>
                <p className="mt-1 break-words text-base font-semibold text-ms-ink">{prestador}</p>
                <div className="mt-2 flex items-start gap-2 text-sm text-ms-muted">
                  <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-ms-green" />
                  <span>
                    {atendimento?.endereco
                      ? `${atendimento.endereco}, ${municipio.nome} - MS`
                      : "Endereço local não confirmado em fonte institucional."}
                  </span>
                </div>
                <p className="mt-2 text-xs text-ms-muted">
                  Prestador: {atendimento?.fonte ?? "Fonte não informada"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-72 xl:justify-end">
              {atendimento ? (
                <>
                  <a
                    href={atendimento.site_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-md border border-ms-line bg-white px-3 text-sm font-semibold text-ms-blue hover:border-ms-blue hover:bg-ms-sky"
                  >
                    <Globe2 className="h-4 w-4" />
                    Site do prestador
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <a
                    href={atendimento.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-ms-blue px-3 text-sm font-semibold text-white hover:bg-ms-navy"
                  >
                    <Navigation className="h-4 w-4" />
                    Abrir no Google Maps
                  </a>
                </>
              ) : null}
              {atendimento?.area_atuacao ? (
                <span className="w-full rounded-md bg-ms-bg px-3 py-2 text-xs font-medium leading-5 text-ms-muted xl:text-right">
                  {atendimento.area_atuacao}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <MiniMapaMunicipio codigoIbge={municipio.codigo_ibge} municipio={municipio.nome} />
      </div>
    </section>
  );
}
