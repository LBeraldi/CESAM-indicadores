"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { temaConfig } from "@/components/municipio/fichaConfig";
import { BadgeFonte } from "@/components/ui/Badge";
import { Delta } from "@/components/ui/Delta";
import { Valor } from "@/components/ui/Valor";
import type { Indicador } from "@/lib/api";
import { ehPercentual, formatarNumero, formatarValor, unidadeExibicao } from "@/lib/formatters";

export type PontoHistorico = { ano: number; valor: number; fonte: string | null };

function ehFonteSinisa(fonte: string | null): boolean {
  return (fonte ?? "").toLocaleLowerCase("pt-BR").includes("sinisa");
}

/** Primeiro ano em que a série muda de SNIS para SINISA (ou de uma fonte para outra). */
export function anoTrocaDeFonte(pontos: PontoHistorico[]): number | null {
  for (let indice = 1; indice < pontos.length; indice += 1) {
    if (ehFonteSinisa(pontos[indice].fonte) !== ehFonteSinisa(pontos[indice - 1].fonte)) {
      return pontos[indice].ano;
    }
  }
  return null;
}

function passoRedondo(amplitude: number): number {
  const bruto = amplitude / 4;
  const potencia = 10 ** Math.floor(Math.log10(bruto || 1));
  const normalizado = bruto / potencia;
  const fator = normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10;
  return fator * potencia;
}

/** CP-09.2: eixo Y com ticks redondos; para %, de 0 até o próximo múltiplo de 10 acima do máximo. */
export function escalaEixo(valores: number[], unidade: string | null | undefined): { min: number; max: number; ticks: number[] } {
  const maximo = Math.max(...valores);
  const minimo = Math.min(...valores);

  if (ehPercentual(unidade)) {
    const topo = Math.min(100, Math.max(10, Math.ceil(maximo / 10) * 10));
    const passo = passoRedondo(topo);
    const ticks = [];
    for (let tick = 0; tick <= topo + 1e-9; tick += passo) ticks.push(Number(tick.toFixed(6)));
    return { min: 0, max: topo, ticks };
  }

  const base = minimo >= 0 ? 0 : minimo;
  const passo = passoRedondo(maximo - base || Math.abs(maximo) || 1);
  const min = Math.floor(base / passo) * passo;
  const max = Math.ceil(maximo / passo) * passo || passo;
  const ticks = [];
  for (let tick = min; tick <= max + 1e-9; tick += passo) ticks.push(Number(tick.toFixed(6)));
  return { min, max, ticks };
}

function GraficoSerie({ pontos, indicador, cor }: { pontos: PontoHistorico[]; indicador: Indicador; cor: string }) {
  const largura = 380;
  const altura = 200;
  const margem = { top: 26, right: 12, bottom: 28, left: 44 };
  const areaL = largura - margem.left - margem.right;
  const areaA = altura - margem.top - margem.bottom;
  const { min, max, ticks } = escalaEixo(
    pontos.map((ponto) => ponto.valor),
    indicador.unidade
  );
  const x = (indice: number) => margem.left + (indice / Math.max(1, pontos.length - 1)) * areaL;
  const y = (valor: number) => margem.top + ((max - valor) / (max - min || 1)) * areaA;
  const linha = pontos.map((ponto, indice) => `${indice === 0 ? "M" : "L"}${x(indice).toFixed(1)} ${y(ponto.valor).toFixed(1)}`).join(" ");
  const intervaloAno = Math.max(1, Math.ceil(pontos.length / 6));
  const troca = anoTrocaDeFonte(pontos);
  const indiceTroca = troca === null ? -1 : pontos.findIndex((ponto) => ponto.ano === troca);
  const casas = ehPercentual(indicador.unidade) ? 0 : 1;
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const texto = (valor: number) => {
    const formatado = formatarValor(valor, indicador.unidade);
    return formatado.unidade ? `${formatado.numero} ${formatado.unidade}` : formatado.numero;
  };

  return (
    <svg
      viewBox={`0 0 ${largura} ${altura}`}
      className="h-auto w-full"
      role="img"
      aria-label={`${indicador.nome}: ${texto(primeiro.valor)} em ${primeiro.ano} e ${texto(ultimo.valor)} em ${ultimo.ano}.`}
    >
      <text x={4} y={10} className="fill-ms-muted text-[10px]">
        {indicador.unidade ?? ""}
      </text>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={margem.left} x2={largura - margem.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-line)" />
          <text x={margem.left - 6} y={y(tick) + 3.5} textAnchor="end" className="fill-ms-muted font-data text-[10px]">
            {formatarNumero(tick, casas, false)}
          </text>
        </g>
      ))}
      {indiceTroca > 0
        ? (() => {
            const xTroca = (x(indiceTroca) + x(indiceTroca - 1)) / 2;
            // Perto da borda direita, "SINISA" sobe uma linha e se alinha à borda para não ser cortado.
            const pertoDaBorda = xTroca + 36 > largura;
            return (
              <g>
                <line x1={xTroca} x2={xTroca} y1={margem.top - 6} y2={margem.top + areaA} stroke="var(--color-muted)" strokeDasharray="3 3" />
                <text x={xTroca - 4} y={margem.top - 8} textAnchor="end" className="fill-ms-muted text-[9px]">
                  SNIS
                </text>
                <text
                  x={pertoDaBorda ? largura - 1 : xTroca + 4}
                  y={pertoDaBorda ? margem.top - 18 : margem.top - 8}
                  textAnchor={pertoDaBorda ? "end" : "start"}
                  className="fill-ms-muted text-[9px]"
                >
                  SINISA
                </text>
              </g>
            );
          })()
        : null}
      <path d={linha} fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pontos.map((ponto, indice) => (
        <g key={ponto.ano}>
          <circle cx={x(indice)} cy={y(ponto.valor)} r={indice === pontos.length - 1 ? 3.5 : 2.5} fill={cor} />
          {indice % intervaloAno === 0 || indice === pontos.length - 1 ? (
            <text x={x(indice)} y={altura - 8} textAnchor="middle" className="fill-ms-muted font-data text-[10px]">
              {ponto.ano}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

type Props = {
  indicador: Indicador;
  municipio: string;
  pontos: PontoHistorico[];
  onFechar: () => void;
};

const CONSULTA_LADO_A_LADO = "(min-width: 1280px)";

/** Verdadeiro quando a série cabe ao lado da tabela (PG-03.11). */
function useLadoALado(): boolean {
  const [ladoALado, setLadoALado] = useState(() => typeof window !== "undefined" && window.matchMedia(CONSULTA_LADO_A_LADO).matches);
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_LADO_A_LADO);
    const aoMudar = () => setLadoALado(consulta.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);
  return ladoALado;
}

/**
 * CP-10 / PG-03.11: card ao lado da tabela no desktop largo (sem fundo escurecido, fixo ao rolar);
 * abaixo de 1280 px, painel modal (lateral no tablet, tela cheia no celular).
 */
export function SeriePainel({ indicador, municipio, pontos, onFechar }: Props) {
  const tituloId = useId();
  const painelRef = useRef<HTMLDivElement>(null);
  const ladoALado = useLadoALado();
  const config = temaConfig(indicador.tema);
  const Icone = config.icon;
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const troca = anoTrocaDeFonte(pontos);
  const unidade = unidadeExibicao(indicador.unidade);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    painelRef.current?.focus({ preventScroll: ladoALado });
    const overflowAnterior = document.body.style.overflow;
    if (!ladoALado) document.body.style.overflow = "hidden";

    function aoTeclar(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onFechar();
        return;
      }
      // Modal prende o foco; o card ao lado da tabela não (não é modal).
      if (ladoALado || event.key !== "Tab" || !painelRef.current) return;
      const focaveis = painelRef.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])");
      if (focaveis.length === 0) return;
      const primeiroFocavel = focaveis[0];
      const ultimoFocavel = focaveis[focaveis.length - 1];
      if (event.shiftKey && (document.activeElement === primeiroFocavel || document.activeElement === painelRef.current)) {
        event.preventDefault();
        ultimoFocavel.focus();
      } else if (!event.shiftKey && document.activeElement === ultimoFocavel) {
        event.preventDefault();
        primeiroFocavel.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus({ preventScroll: true });
    };
  }, [onFechar, ladoALado]);

  return (
    <>
      {!ladoALado ? <div className="no-print fixed inset-0 z-50 bg-ms-ink/30" aria-hidden="true" onClick={onFechar} /> : null}
      <div
        ref={painelRef}
        role="dialog"
        aria-modal={!ladoALado}
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={
          ladoALado
            ? "no-print sticky top-[calc(var(--header-h)+5.5rem)] flex max-h-[calc(100vh-var(--header-h)-7rem)] flex-col overflow-y-auto rounded-md border border-ms-line bg-ms-surface shadow-e2 outline-none"
            : "painel-lateral no-print fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ms-surface shadow-e2 outline-none sm:left-auto sm:w-[420px] sm:border-l sm:border-ms-line"
        }
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-ms-line bg-ms-surface px-4 py-3">
          <div className="min-w-0">
            <p className="eyebrow inline-flex items-center gap-1.5">
              <Icone className={`h-3.5 w-3.5 ${config.textClass}`} strokeWidth={1.75} aria-hidden="true" />
              Série histórica · {indicador.tema}
            </p>
            <h2 id={tituloId} className="mt-1 text-base font-semibold leading-snug text-ms-ink">
              {indicador.nome}
            </h2>
            <p className="mt-0.5 text-xs text-ms-muted">
              {municipio} · {primeiro.ano}–{ultimo.ano}
              {unidade ? ` · ${unidade}` : ""}
              {indicador.sentido === "menor_melhor" ? " · menor é melhor" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ms-line text-ms-ink hover:border-ms-blue hover:text-ms-blue"
          >
            <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">Fechar série histórica</span>
          </button>
        </div>

        <dl className="grid grid-cols-3 divide-x divide-ms-line border-b border-ms-line">
          <div className="grid gap-1 px-4 py-3">
            <dt className="text-xs text-ms-muted">{primeiro.ano}</dt>
            <dd>
              <Valor valor={primeiro.valor} unidade={indicador.unidade} numeroClassName="text-base font-medium" />
            </dd>
          </div>
          <div className="grid gap-1 px-4 py-3">
            <dt className="text-xs text-ms-muted">{ultimo.ano}</dt>
            <dd>
              <Valor valor={ultimo.valor} unidade={indicador.unidade} numeroClassName="text-base font-medium" />
            </dd>
          </div>
          <div className="grid gap-1 px-4 py-3">
            <dt className="text-xs text-ms-muted">Variação</dt>
            <dd>
              <Delta
                variacao={ultimo.valor - primeiro.valor}
                sentido={indicador.sentido}
                unidade={indicador.unidade}
                desde={primeiro.ano}
                mostrarAvaliacao
                className="flex-wrap whitespace-normal"
              />
            </dd>
          </div>
        </dl>

        <div className="grid gap-2 border-b border-ms-line px-4 py-3">
          <GraficoSerie pontos={pontos} indicador={indicador} cor={config.cor} />
          {troca ? (
            <p className="flex items-start gap-1.5 text-xs text-ms-muted">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-sem-info" strokeWidth={1.75} aria-hidden="true" />
              <span>
                SNIS até {troca - 1}, SINISA a partir de {troca}. A metodologia pode mudar entre as fontes.
              </span>
            </p>
          ) : null}
        </div>

        <table className="w-full text-sm">
          <caption className="sr-only">Valores por ano de {indicador.nome}</caption>
          <thead className="border-b border-ms-line bg-ms-surface-muted text-left">
            <tr>
              <th scope="col" className="t-label px-4 py-2 text-ms-muted">Ano</th>
              <th scope="col" className="t-label px-3 py-2 text-right text-ms-muted">Valor</th>
              <th scope="col" className="t-label px-4 py-2 text-ms-muted">Fonte</th>
            </tr>
          </thead>
          <tbody>
            {[...pontos].reverse().map((ponto) => (
              <tr key={ponto.ano} className="border-b border-ms-line last:border-b-0">
                <td className="font-data px-4 py-2 text-ms-ink">{ponto.ano}</td>
                <td className="px-3 py-2 text-right text-ms-ink">
                  <Valor valor={ponto.valor} unidade={indicador.unidade} />
                </td>
                <td className="px-4 py-2">
                  <BadgeFonte fonte={ponto.fonte} ano={ponto.ano} curto />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
