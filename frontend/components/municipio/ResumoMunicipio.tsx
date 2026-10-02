import Link from "next/link";
import { CheckCircle2, ExternalLink, MinusCircle } from "lucide-react";

import { MiniMapaMunicipio } from "@/components/MiniMapaMunicipio";
import { calcularCobertura } from "@/components/municipio/fichaConfig";
import { Badge } from "@/components/ui/Badge";
import type { AtendimentoAgua, Municipio, ValorIndicador } from "@/lib/api";
import { fonteCurta, resumoAtuacao } from "@/lib/prestador";
import { urlExternaSegura } from "@/lib/urls";
import { cn } from "@/lib/utils";

/**
 * Cobertura oficial por dimensão (PG-03.3.1): linha discreta no rodapé da faixa de notas,
 * com ícone e nome da dimensão + estado em texto acessível.
 */
export function CoberturaOficial({ indicadores }: { indicadores: ValorIndicador[] }) {
  const cobertura = calcularCobertura(indicadores);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-xs font-semibold text-ms-muted">Cobertura oficial</span>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {cobertura.map(({ tema, config, coberto }) => {
          const Estado = coberto ? CheckCircle2 : MinusCircle;
          return (
            <li
              key={tema}
              title={
                coberto
                  ? `${tema}: dado oficial (SINISA ou SNIS) disponível para este município.`
                  : `${tema}: nenhuma fonte oficial reportou dado para este município até o momento.`
              }
              className={cn("inline-flex items-center gap-1 text-xs", coberto ? "text-ms-ink" : "text-ms-muted")}
            >
              <Estado
                className={cn("h-3.5 w-3.5", coberto ? "text-sem-positive" : "text-ms-muted")}
                strokeWidth={1.75}
                aria-hidden="true"
              />
              {config.nomeCurto}
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
  institucionalDisponivel?: boolean;
  /** Nota geral por código IBGE, para colorir o minimapa. */
  notas?: Record<string, number>;
  anoNotas?: number;
};

/** Card lateral único da ficha: prestador de água + minimapa (PG-03.12). */
export function ResumoMunicipio({ municipio, atendimento, institucionalDisponivel = true, notas, anoNotas }: Props) {
  const prestador = !institucionalDisponivel
    ? "Dados institucionais indisponíveis"
    : atendimento
    ? `${atendimento.prestador_nome}${atendimento.sigla ? ` (${atendimento.sigla})` : ""}`
    : "Não informado";
  const gestaoMunicipal = atendimento
    ? /autarquia|prefeitura|municipal|saae|servi[cç]o aut[oô]nomo/i.test(
        `${atendimento.prestador_nome} ${atendimento.sigla ?? ""} ${atendimento.natureza_juridica ?? ""}`,
      )
    : false;
  const endereco = atendimento?.endereco ? `${atendimento.endereco}, ${municipio.nome} - MS` : null;
  const resumo = atendimento && institucionalDisponivel
    ? [...resumoAtuacao(atendimento.area_atuacao), fonteCurta(atendimento.fonte)].filter(Boolean)
    : [];
  const siteUrl = urlExternaSegura(atendimento?.site_url);
  const mapsUrl = urlExternaSegura(atendimento?.maps_url);

  return (
    <aside
      className="self-start overflow-hidden rounded-md border border-ms-line bg-ms-surface"
      aria-label="Prestador e localização"
    >
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="t-label text-ms-muted">{gestaoMunicipal ? "Serviço municipal de água" : "Prestador de água"}</p>
          {gestaoMunicipal ? <Badge variante="official">Gestão municipal</Badge> : null}
        </div>
        <p className="mt-1.5 text-sm font-semibold text-ms-ink [overflow-wrap:anywhere]">{prestador}</p>
        {resumo.length ? (
          <p className="mt-1 text-[13px] text-ms-muted" title={[atendimento?.area_atuacao, atendimento?.fonte].filter(Boolean).join(" · ")}>
            {resumo.join(" · ")}
          </p>
        ) : null}
        {/* PG-03.12: endereço e fonte por extenso ficam na impressão e no nome acessível dos links. */}
        <div className="print-only mt-1 text-xs text-ms-muted">
          <p>{endereco ?? "Endereço local não confirmado em fonte institucional."}</p>
          <p>Fonte: {atendimento?.fonte ?? "não informada"}</p>
        </div>
        {atendimento && (siteUrl || mapsUrl) ? (
          <div className="no-print mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-ms-blue">
            {siteUrl ? (
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">
                {atendimento.site_label || "Site do prestador"}
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            ) : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={endereco ?? undefined}
                className="inline-flex items-center gap-1 hover:underline"
              >
                Ver no mapa
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                <span className="sr-only">{endereco ? `: ${endereco}` : ""} (abre em nova aba)</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3 border-t border-ms-line px-3 py-3">
        <div className="w-[58%] shrink-0">
          <MiniMapaMunicipio codigoIbge={municipio.codigo_ibge} municipio={municipio.nome} notas={notas} className="block h-28 w-full" />
        </div>
        <div className="grid gap-1 text-[13px] leading-snug">
          <p className="text-ms-muted">Mato Grosso do Sul</p>
          <p className="text-ms-ink">
            <span className="font-semibold">{municipio.nome}</span> destacado
          </p>
          {notas && anoNotas ? (
            <p className="text-xs text-ms-muted">
              Cor pela{" "}
              <Link href="/metodologia" className="font-semibold text-ms-blue hover:underline">
                nota geral {anoNotas}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
