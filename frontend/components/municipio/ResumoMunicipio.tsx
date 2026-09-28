import { CheckCircle2, ExternalLink, MinusCircle } from "lucide-react";

import { MiniMapaMunicipio } from "@/components/MiniMapaMunicipio";
import { calcularCobertura } from "@/components/municipio/fichaConfig";
import { Badge } from "@/components/ui/Badge";
import type { AtendimentoAgua, Municipio, ValorIndicador } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Cobertura oficial por dimensão: ícone e nome da dimensão + estado em texto. */
export function CoberturaOficial({ indicadores }: { indicadores: ValorIndicador[] }) {
  const cobertura = calcularCobertura(indicadores);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="t-label text-ms-muted">Cobertura oficial</span>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {cobertura.map(({ tema, config, coberto }) => {
          const Icon = config.icon;
          const Estado = coberto ? CheckCircle2 : MinusCircle;
          return (
            <li
              key={tema}
              title={
                coberto
                  ? `${tema}: dado oficial (SINISA ou SNIS) disponível para este município.`
                  : `${tema}: nenhuma fonte oficial reportou dado para este município até o momento.`
              }
              className={cn("inline-flex items-center gap-1.5 text-[13px]", coberto ? "text-ms-ink" : "text-ms-muted")}
            >
              <Icon className={cn("h-4 w-4", coberto ? config.textClass : "text-ms-muted")} strokeWidth={1.75} aria-hidden="true" />
              {config.nomeCurto}
              <Estado
                className={cn("h-3.5 w-3.5", coberto ? "text-sem-positive" : "text-ms-muted")}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="sr-only">{coberto ? "com dado oficial" : "sem dado oficial"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Props = {
  municipio: Municipio;
  atendimento: AtendimentoAgua | null;
};

/** Coluna lateral da ficha: prestador de água e mini mapa (PG-03.12). */
export function ResumoMunicipio({ municipio, atendimento }: Props) {
  const prestador = atendimento
    ? `${atendimento.prestador_nome}${atendimento.sigla ? ` (${atendimento.sigla})` : ""}`
    : "Não informado";
  const gestaoMunicipal = atendimento
    ? /autarquia|prefeitura|municipal|saae|servi[cç]o aut[oô]nomo/i.test(
        `${atendimento.prestador_nome} ${atendimento.sigla ?? ""} ${atendimento.natureza_juridica ?? ""}`,
      )
    : false;

  return (
    <aside className="grid content-start gap-4" aria-label="Prestador e localização">
      <div className="rounded-md border border-ms-line bg-ms-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="t-label text-ms-muted">{gestaoMunicipal ? "Serviço municipal de água" : "Prestador de água"}</p>
          {gestaoMunicipal ? <Badge variante="official">Gestão municipal</Badge> : null}
        </div>
        <p className="mt-2 text-sm font-semibold text-ms-ink [overflow-wrap:anywhere]">{prestador}</p>
        <p className="mt-1 text-[13px] text-ms-muted">
          {atendimento?.endereco
            ? `${atendimento.endereco}, ${municipio.nome} - MS`
            : "Endereço local não confirmado em fonte institucional."}
        </p>
        {atendimento?.area_atuacao ? <p className="mt-1 text-[13px] text-ms-muted">{atendimento.area_atuacao}</p> : null}
        <p className="mt-1 text-xs text-ms-muted">Fonte: {atendimento?.fonte ?? "não informada"}</p>
        {atendimento ? (
          <div className="no-print mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-ms-blue">
            <a href={atendimento.site_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              Site do prestador
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
            <a href={atendimento.maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              Ver no Google Maps
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
        ) : null}
      </div>
      <MiniMapaMunicipio codigoIbge={municipio.codigo_ibge} municipio={municipio.nome} />
    </aside>
  );
}
