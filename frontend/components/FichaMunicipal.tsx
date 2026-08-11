"use client";

import {
  ChevronDown,
  CloudRain,
  Download,
  Droplets,
  ExternalLink,
  FileDown,
  Filter,
  Leaf,
  Printer,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trash2,
  Waves
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Municipio, ValorIndicador } from "@/lib/api";
import { getRecursosGestaoMunicipal } from "@/lib/documentosGestaoMunicipal";
import { formatValorIndicador, valorParaPlanilha } from "@/lib/formatters";

type Props = {
  municipio: Municipio;
  indicadores: ValorIndicador[];
};

type Dimensao = {
  tema: string;
  valores: ValorIndicador[];
  score: number | null;
  config: TemaConfig;
};

type TemaConfig = {
  icon: LucideIcon;
  bgClass: string;
  accentClass: string;
  panelClass: string;
};

const TODOS = "todos";

const TEMA_ORDEM = ["Água", "Esgoto", "Resíduos sólidos", "Águas pluviais", "Gestão municipal"];

// Paleta das dimensões derivada dos mesmos tokens institucionais do resto do
// site, com marrom terroso para resíduos sólidos, variando por matiz e não
// por saturação para não destoar do header, mapa e ranking.
const TEMA_CONFIG: Record<string, TemaConfig> = {
  Água: {
    icon: Droplets,
    bgClass: "bg-[#0f766e]",
    accentClass: "bg-[#0f766e]",
    panelClass: "bg-[#e5f4f1] text-[#0f6f62]"
  },
  Esgoto: {
    icon: Waves,
    bgClass: "bg-[#0c2d57]",
    accentClass: "bg-[#0c2d57]",
    panelClass: "bg-[#e7edf5] text-[#0c2d57]"
  },
  "Resíduos sólidos": {
    icon: Trash2,
    bgClass: "bg-[#7a4e2d]",
    accentClass: "bg-[#7a4e2d]",
    panelClass: "bg-[#f3e9df] text-[#6b3f24]"
  },
  "Águas pluviais": {
    icon: CloudRain,
    bgClass: "bg-[#1f5f9f]",
    accentClass: "bg-[#1f5f9f]",
    panelClass: "bg-[#e7f0f8] text-[#1f5f9f]"
  },
  "Gestão municipal": {
    icon: ShieldCheck,
    bgClass: "bg-[#b7791f]",
    accentClass: "bg-[#b7791f]",
    panelClass: "bg-[#fbf1de] text-[#8f5f0d]"
  }
};

const TEMA_FALLBACK: TemaConfig = {
  icon: Leaf,
  bgClass: "bg-ms-navy",
  accentClass: "bg-ms-navy",
  panelClass: "bg-ms-sky text-ms-navy"
};

function ordenarTexto(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

function csvEscape(value: string | number | null | undefined): string {
  const texto = value === null || value === undefined ? "" : String(value);
  return `"${texto.replaceAll('"', '""')}"`;
}

function baixarCsv(municipio: Municipio, valores: ValorIndicador[]) {
  const linhas = [
    [
      "codigo_ibge",
      "municipio",
      "uf",
      "ano_referencia",
      "tema",
      "indicador_codigo",
      "indicador_nome",
      "valor",
      "unidade",
      "fonte",
      "status_validacao",
      "observacoes"
    ],
    ...valores.map((valor) => [
      municipio.codigo_ibge,
      municipio.nome,
      municipio.uf,
      valor.ano,
      valor.indicador.tema,
      valor.indicador.codigo,
      valor.indicador.nome,
      valorParaPlanilha(valor),
      valor.indicador.unidade ?? "",
      valor.fonte ?? valor.indicador.fonte ?? "",
      valor.status_validacao,
      valor.observacoes ?? ""
    ])
  ];

  const csv = linhas.map((linha) => linha.map(csvEscape).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `observatorio-saneamento_${municipio.codigo_ibge}_${municipio.nome.replaceAll(" ", "_")}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function temaConfig(tema: string): TemaConfig {
  return TEMA_CONFIG[tema] ?? TEMA_FALLBACK;
}

function ordemTema(tema: string): number {
  const index = TEMA_ORDEM.indexOf(tema);
  return index === -1 ? TEMA_ORDEM.length : index;
}

function unidadePercentual(valor: ValorIndicador): boolean {
  return valor.indicador.unidade?.trim() === "%";
}

function valorNormalizadoPercentual(valor: ValorIndicador): number {
  const numero = Number(valor.valor);
  return valor.indicador.sentido === "menor_melhor" ? 100 - numero : numero;
}

function calcularScore(valores: ValorIndicador[]): number | null {
  const percentuais = valores
    .filter((valor) => valor.valor !== null && unidadePercentual(valor) && valor.indicador.sentido !== "neutro")
    .map(valorNormalizadoPercentual);

  if (percentuais.length === 0) {
    return null;
  }

  return percentuais.reduce((soma, valor) => soma + valor, 0) / percentuais.length;
}

type PontoHistorico = { ano: number; valor: number };

function ehBinario(valor: ValorIndicador): boolean {
  const unidade = valor.indicador.unidade?.trim().toLocaleLowerCase("pt-BR");
  return unidade === "sim/não" || unidade === "sim/nao";
}

function construirHistorico(indicadores: ValorIndicador[]): Map<string, PontoHistorico[]> {
  const mapa = new Map<string, PontoHistorico[]>();

  for (const item of indicadores) {
    if (item.valor === null || ehBinario(item)) {
      continue;
    }

    const lista = mapa.get(item.indicador.codigo) ?? [];
    lista.push({ ano: item.ano, valor: Number(item.valor) });
    mapa.set(item.indicador.codigo, lista);
  }

  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.ano - b.ano);
  }

  return mapa;
}

function Sparkline({ pontos }: { pontos: PontoHistorico[] }) {
  if (pontos.length < 2) {
    return null;
  }

  const width = 96;
  const height = 28;
  const valores = pontos.map((ponto) => ponto.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min || 1;
  const passo = width / (pontos.length - 1);

  const coordenadas = pontos.map((ponto, indice) => {
    const x = indice * passo;
    const y = height - ((ponto.valor - min) / amplitude) * (height - 6) - 3;
    return [x, y] as const;
  });

  const linha = coordenadas.map(([x, y], indice) => `${indice === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [ultimoX, ultimoY] = coordenadas[coordenadas.length - 1];
  const area = `${linha} L ${ultimoX.toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <path d={area} fill="currentColor" opacity={0.14} />
      <path d={linha} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ultimoX} cy={ultimoY} r={2.4} fill="currentColor" />
    </svg>
  );
}

function formatNumeroHistorico(valor: number, unidade?: string | null): string {
  const numero = valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  if (!unidade) return numero;
  return unidade === "%" ? `${numero}%` : `${numero} ${unidade}`;
}

function GraficoHistoricoDetalhado({ pontos, unidade }: { pontos: PontoHistorico[]; unidade?: string | null }) {
  const width = 600;
  const height = 230;
  const margem = { top: 18, right: 18, bottom: 38, left: 58 };
  const areaWidth = width - margem.left - margem.right;
  const areaHeight = height - margem.top - margem.bottom;
  const valores = pontos.map((ponto) => ponto.valor);
  const minOriginal = Math.min(...valores);
  const maxOriginal = Math.max(...valores);
  const folga = (maxOriginal - minOriginal || Math.max(Math.abs(maxOriginal), 1)) * 0.12;
  const min = minOriginal - folga;
  const max = maxOriginal + folga;
  const amplitude = max - min || 1;
  const x = (indice: number) => margem.left + (indice / Math.max(1, pontos.length - 1)) * areaWidth;
  const y = (valor: number) => margem.top + ((max - valor) / amplitude) * areaHeight;
  const linha = pontos.map((ponto, indice) => `${indice === 0 ? "M" : "L"} ${x(indice)} ${y(ponto.valor)}`).join(" ");
  const area = `${linha} L ${x(pontos.length - 1)} ${margem.top + areaHeight} L ${margem.left} ${margem.top + areaHeight} Z`;
  const ticksY = Array.from({ length: 5 }, (_, indice) => max - (indice / 4) * amplitude);
  const intervaloAno = Math.max(1, Math.ceil(pontos.length / 7));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Gráfico detalhado da série histórica">
      {ticksY.map((tick) => (
        <g key={tick}>
          <line x1={margem.left} x2={width - margem.right} y1={y(tick)} y2={y(tick)} stroke="#d8e1eb" strokeDasharray="4 4" />
          <text x={margem.left - 9} y={y(tick) + 4} textAnchor="end" className="fill-ms-muted text-[10px]">
            {tick.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          </text>
        </g>
      ))}
      <path d={area} fill="#1f5f9f" opacity={0.1} />
      <path d={linha} fill="none" stroke="#1f5f9f" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pontos.map((ponto, indice) => (
        <g key={`${ponto.ano}-${ponto.valor}`}>
          <circle cx={x(indice)} cy={y(ponto.valor)} r={4} fill="white" stroke="#1f5f9f" strokeWidth={2.5} />
          <title>{`${ponto.ano}: ${formatNumeroHistorico(ponto.valor, unidade)}`}</title>
          {(indice % intervaloAno === 0 || indice === pontos.length - 1) && (
            <text x={x(indice)} y={height - 13} textAnchor="middle" className="fill-ms-muted text-[10px]">
              {ponto.ano}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

type PosicaoFlutuante = { left: number; top: number; width: number };

function HistoricoFlutuante({
  valor,
  pontos,
  className,
  children
}: {
  valor: ValorIndicador;
  pontos: PontoHistorico[];
  className: string;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [renderizado, setRenderizado] = useState(false);
  const [posicao, setPosicao] = useState<PosicaoFlutuante | null>(null);
  const gatilhoRef = useRef<HTMLSpanElement>(null);
  const abrirRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fecharRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desmontarRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const variacao = ultimo.valor - primeiro.valor;
  const variacaoPercentual = primeiro.valor === 0 ? null : (variacao / Math.abs(primeiro.valor)) * 100;
  const minimo = pontos.reduce((menor, ponto) => (ponto.valor < menor.valor ? ponto : menor), primeiro);
  const maximo = pontos.reduce((maior, ponto) => (ponto.valor > maior.valor ? ponto : maior), primeiro);
  const TrendIcon = variacao >= 0 ? TrendingUp : TrendingDown;

  function atualizarPosicao() {
    const elemento = gatilhoRef.current;
    if (!elemento) return;
    const rect = elemento.getBoundingClientRect();
    const width = Math.min(660, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const alturaEstimada = Math.min(620, window.innerHeight - 24);
    const abaixo = rect.bottom + 10;
    const top = abaixo + alturaEstimada <= window.innerHeight ? abaixo : Math.max(12, rect.top - alturaEstimada - 10);
    setPosicao({ left, top, width });
  }

  function abrir() {
    if (abrirRef.current) clearTimeout(abrirRef.current);
    if (fecharRef.current) clearTimeout(fecharRef.current);
    if (desmontarRef.current) clearTimeout(desmontarRef.current);
    atualizarPosicao();
    setRenderizado(true);
    setAberto(true);
  }

  function agendarAbertura() {
    if (abrirRef.current) clearTimeout(abrirRef.current);
    if (fecharRef.current) clearTimeout(fecharRef.current);
    abrirRef.current = setTimeout(abrir, 800);
  }

  function fechar() {
    setAberto(false);
    if (desmontarRef.current) clearTimeout(desmontarRef.current);
    desmontarRef.current = setTimeout(() => setRenderizado(false), 200);
  }

  function agendarFechamento() {
    if (abrirRef.current) clearTimeout(abrirRef.current);
    if (fecharRef.current) clearTimeout(fecharRef.current);
    if (renderizado) fecharRef.current = setTimeout(fechar, 140);
  }

  useEffect(() => {
    if (!renderizado) return;
    const reposicionar = () => atualizarPosicao();
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
    };
  }, [renderizado]);

  useEffect(() => () => {
    if (abrirRef.current) clearTimeout(abrirRef.current);
    if (fecharRef.current) clearTimeout(fecharRef.current);
    if (desmontarRef.current) clearTimeout(desmontarRef.current);
  }, []);

  const painel = renderizado && posicao ? (
    <span
      role="dialog"
      aria-label={`Série histórica detalhada de ${valor.indicador.nome}`}
      onMouseEnter={abrir}
      onMouseLeave={agendarFechamento}
      onClick={(event) => event.stopPropagation()}
      className={`historico-popover ${aberto ? "is-open" : "is-closing"} fixed z-[100] block max-h-[calc(100vh-24px)] overflow-y-auto rounded-lg border border-ms-line bg-white p-5 text-left text-ms-ink shadow-2xl`}
      style={posicao}
    >
      <span className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-xs font-semibold uppercase tracking-wide text-ms-blue">Série histórica detalhada</span>
          <span className="mt-1 block text-lg font-semibold leading-snug">{valor.indicador.nome}</span>
          <span className="mt-1 block text-xs text-ms-muted">
            {primeiro.ano}–{ultimo.ano} · {pontos.length} anos com dados · {valor.fonte ?? valor.indicador.fonte ?? "Fonte não informada"}
          </span>
        </span>
        <span className="rounded-md bg-ms-sky px-2.5 py-1 text-xs font-semibold text-ms-blue">{valor.indicador.unidade || "valor"}</span>
      </span>

      <span className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <span className="rounded-md bg-ms-bg p-3">
          <span className="block text-[0.68rem] uppercase tracking-wide text-ms-muted">Primeiro valor</span>
          <span className="mt-1 block font-semibold">{formatNumeroHistorico(primeiro.valor, valor.indicador.unidade)}</span>
          <span className="block text-xs text-ms-muted">{primeiro.ano}</span>
        </span>
        <span className="rounded-md bg-ms-bg p-3">
          <span className="block text-[0.68rem] uppercase tracking-wide text-ms-muted">Último valor</span>
          <span className="mt-1 block font-semibold">{formatNumeroHistorico(ultimo.valor, valor.indicador.unidade)}</span>
          <span className="block text-xs text-ms-muted">{ultimo.ano}</span>
        </span>
        <span className="rounded-md bg-ms-bg p-3">
          <span className="block text-[0.68rem] uppercase tracking-wide text-ms-muted">Variação</span>
          <span className={`mt-1 flex items-center gap-1 font-semibold ${variacao >= 0 ? "text-ms-green" : "text-red-700"}`}>
            <TrendIcon className="h-4 w-4" />
            {variacao >= 0 ? "+" : ""}{formatNumeroHistorico(variacao, valor.indicador.unidade)}
          </span>
          <span className="block text-xs text-ms-muted">
            {variacaoPercentual === null ? "base inicial zero" : `${variacaoPercentual >= 0 ? "+" : ""}${variacaoPercentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          </span>
        </span>
        <span className="rounded-md bg-ms-bg p-3">
          <span className="block text-[0.68rem] uppercase tracking-wide text-ms-muted">Amplitude</span>
          <span className="mt-1 block font-semibold">{formatNumeroHistorico(maximo.valor - minimo.valor, valor.indicador.unidade)}</span>
          <span className="block text-xs text-ms-muted">mín. a máx.</span>
        </span>
      </span>

      <span className="mt-4 block rounded-md border border-ms-line bg-white p-2">
        <GraficoHistoricoDetalhado pontos={pontos} unidade={valor.indicador.unidade} />
      </span>

      <span className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.35fr]">
        <span className="grid grid-cols-2 gap-2 text-xs">
          <span className="rounded-md border border-ms-line p-3">
            <span className="block text-ms-muted">Menor registro</span>
            <span className="mt-1 block font-semibold text-ms-ink">{formatNumeroHistorico(minimo.valor, valor.indicador.unidade)}</span>
            <span className="text-ms-muted">em {minimo.ano}</span>
          </span>
          <span className="rounded-md border border-ms-line p-3">
            <span className="block text-ms-muted">Maior registro</span>
            <span className="mt-1 block font-semibold text-ms-ink">{formatNumeroHistorico(maximo.valor, valor.indicador.unidade)}</span>
            <span className="text-ms-muted">em {maximo.ano}</span>
          </span>
        </span>
        <span className="max-h-32 overflow-y-auto rounded-md border border-ms-line">
          <span className="grid grid-cols-2 bg-ms-bg px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-wide text-ms-muted">
            <span>Ano</span><span className="text-right">Valor</span>
          </span>
          {[...pontos].reverse().map((ponto) => (
            <span key={`tabela-${ponto.ano}`} className="grid grid-cols-2 border-t border-ms-line px-3 py-1.5 text-xs">
              <span>{ponto.ano}</span>
              <span className="text-right font-semibold">{formatNumeroHistorico(ponto.valor, valor.indicador.unidade)}</span>
            </span>
          ))}
        </span>
      </span>
      {valor.indicador.sentido === "menor_melhor" ? (
        <span className="mt-3 block rounded-md bg-[#fbf1de] px-3 py-2 text-xs text-[#8f5f0d]">
          Neste indicador, valores menores representam melhor desempenho.
        </span>
      ) : null}
    </span>
  ) : null;

  return (
    <span
      ref={gatilhoRef}
      role="button"
      tabIndex={0}
      aria-expanded={aberto}
      onMouseEnter={agendarAbertura}
      onMouseLeave={agendarFechamento}
      onFocus={abrir}
      onBlur={agendarFechamento}
      onClick={(event) => {
        event.stopPropagation();
        aberto ? fechar() : abrir();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          aberto ? fechar() : abrir();
        }
        if (event.key === "Escape") fechar();
      }}
      className={`${className} cursor-pointer outline-none ring-inset ring-ms-blue/30 transition-shadow hover:ring-2 focus-visible:ring-2`}
      title="Mantenha o mouse sobre o indicador para ver a série histórica detalhada"
    >
      {children}
      {typeof document !== "undefined" && painel ? createPortal(painel, document.body) : null}
    </span>
  );
}

function CartaoIndicador({
  valor,
  pontos,
  className,
  children
}: {
  valor: ValorIndicador;
  pontos: PontoHistorico[];
  className: string;
  children: ReactNode;
}) {
  if (pontos.length < 2) {
    return <span className={className}>{children}</span>;
  }

  return (
    <HistoricoFlutuante valor={valor} pontos={pontos} className={className}>
      {children}
    </HistoricoFlutuante>
  );
}

function formatScore(score: number | null, quantidade: number): string {
  if (score === null) {
    return `${quantidade}`;
  }

  return score.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function RecursoGestao({ valor, municipio }: { valor: ValorIndicador; municipio: Municipio }) {
  if (valor.valor === null || Number(valor.valor) <= 0) return null;

  const recursos = getRecursosGestaoMunicipal(municipio.codigo_ibge, municipio.nome);
  const ehConselho = valor.indicador.codigo === "gestao_conselho_municipal";
  const ehPlano = valor.indicador.codigo === "gestao_plano_municipal_saneamento";
  if (!ehConselho && !ehPlano) return null;

  const recurso = ehConselho ? recursos.conselho : recursos.plano;
  const Icon = ehPlano && recurso.direto ? FileDown : ExternalLink;
  const rotulo = ehConselho
    ? recurso.direto
      ? "Acessar conselho"
      : "Consultar controle social"
    : recurso.direto
      ? "Baixar plano municipal"
      : "Buscar documento oficial";

  return (
    <a
      href={recurso.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-current/25 bg-white/65 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-current/30"
      aria-label={`${rotulo} de ${municipio.nome}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {rotulo}
    </a>
  );
}

export function FichaMunicipal({ municipio, indicadores }: Props) {
  const anos = useMemo(
    () => Array.from(new Set(indicadores.map((valor) => valor.ano))).sort((a, b) => b - a),
    [indicadores]
  );
  const temas = useMemo(
    () => Array.from(new Set(indicadores.map((valor) => valor.indicador.tema))).sort((a, b) => {
      const ordem = ordemTema(a) - ordemTema(b);
      return ordem === 0 ? ordenarTexto(a, b) : ordem;
    }),
    [indicadores]
  );
  const fontes = useMemo(
    () =>
      Array.from(new Set(indicadores.map((valor) => valor.fonte ?? valor.indicador.fonte ?? "Fonte não informada"))).sort(
        ordenarTexto
      ),
    [indicadores]
  );

  const [ano, setAno] = useState(anos[0] ? String(anos[0]) : TODOS);
  const [tema, setTema] = useState(TODOS);
  const [fonte, setFonte] = useState(TODOS);
  const [somenteOficiais, setSomenteOficiais] = useState(true);
  const [temaAberto, setTemaAberto] = useState<string | null>(temas[0] ?? null);

  const filtrados = useMemo(() => {
    return indicadores
      .filter((valor) => ano === TODOS || String(valor.ano) === ano)
      .filter((valor) => tema === TODOS || valor.indicador.tema === tema)
      .filter((valor) => fonte === TODOS || (valor.fonte ?? valor.indicador.fonte ?? "Fonte não informada") === fonte)
      .filter((valor) => !somenteOficiais || valor.status_validacao.includes("oficial"))
      .sort((a, b) => {
        const temaCompare = ordemTema(a.indicador.tema) - ordemTema(b.indicador.tema);
        if (temaCompare !== 0) {
          return temaCompare;
        }

        const nomeCompare = ordenarTexto(a.indicador.nome, b.indicador.nome);
        if (nomeCompare !== 0) {
          return nomeCompare;
        }

        return b.ano - a.ano;
      });
  }, [ano, fonte, indicadores, somenteOficiais, tema]);

  const dimensoes = useMemo<Dimensao[]>(() => {
    const grupos = new Map<string, ValorIndicador[]>();

    for (const valor of filtrados) {
      const grupo = grupos.get(valor.indicador.tema) ?? [];
      grupo.push(valor);
      grupos.set(valor.indicador.tema, grupo);
    }

    return Array.from(grupos.entries())
      .map(([nomeTema, valores]) => ({
        tema: nomeTema,
        valores,
        score: calcularScore(valores),
        config: temaConfig(nomeTema)
      }))
      .sort((a, b) => {
        const ordem = ordemTema(a.tema) - ordemTema(b.tema);
        return ordem === 0 ? ordenarTexto(a.tema, b.tema) : ordem;
      });
  }, [filtrados]);

  const historico = useMemo(() => {
    const base = indicadores.filter((valor) => !somenteOficiais || valor.status_validacao.includes("oficial"));
    return construirHistorico(base);
  }, [indicadores, somenteOficiais]);

  const temasSelecionados = dimensoes.map((dimensao) => dimensao.tema);
  const fontesSelecionadas = Array.from(new Set(filtrados.map((valor) => valor.fonte ?? valor.indicador.fonte ?? "")));
  const temaAbertoValido = dimensoes.some((dimensao) => dimensao.tema === temaAberto);
  const temaExpandido = temaAbertoValido ? temaAberto : dimensoes[0]?.tema ?? null;

  function limparFiltros() {
    setAno(anos[0] ? String(anos[0]) : TODOS);
    setTema(TODOS);
    setFonte(TODOS);
    setSomenteOficiais(true);
    setTemaAberto(temas[0] ?? null);
  }

  return (
    <section className="py-8">
      <div className="print-only mb-6">
        <p className="text-sm font-medium uppercase text-ms-green">Relatório municipal</p>
        <h2 className="mt-1 text-2xl font-semibold text-ms-ink">{municipio.nome}</h2>
        <p className="mt-1 text-sm text-ms-muted">
          Código IBGE {municipio.codigo_ibge} · UF {municipio.uf}
        </p>
      </div>

      <div className="no-print rounded-md border border-ms-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ms-green">
              <Filter className="h-4 w-4" />
              Filtros da ficha
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-ms-ink">Indicadores disponíveis</h2>
            <p className="mt-1 text-sm text-ms-muted">
              {filtrados.length} de {indicadores.length} registros exibidos
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-ms-line bg-white px-3 text-sm font-medium text-ms-ink hover:border-ms-blue hover:text-ms-blue"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-ms-line bg-white px-3 text-sm font-medium text-ms-ink hover:border-ms-blue hover:text-ms-blue"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button
              type="button"
              onClick={() => baixarCsv(municipio, filtrados)}
              disabled={filtrados.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-ms-blue px-3 text-sm font-medium text-white hover:bg-ms-navy disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ms-muted">Ano de referência</span>
            <select
              value={ano}
              onChange={(event) => setAno(event.target.value)}
              className="h-11 w-full rounded-md border border-ms-line bg-ms-bg px-3 text-base outline-none ring-ms-blue/20 focus:border-ms-blue focus:bg-white focus:ring-4 md:text-sm"
            >
              <option value={TODOS}>Todos os anos</option>
              {anos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-ms-muted">Tema</span>
            <select
              value={tema}
              onChange={(event) => setTema(event.target.value)}
              className="h-11 w-full rounded-md border border-ms-line bg-ms-bg px-3 text-base outline-none ring-ms-blue/20 focus:border-ms-blue focus:bg-white focus:ring-4 md:text-sm"
            >
              <option value={TODOS}>Todos os temas</option>
              {temas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-ms-muted">Fonte</span>
            <select
              value={fonte}
              onChange={(event) => setFonte(event.target.value)}
              className="h-11 w-full rounded-md border border-ms-line bg-ms-bg px-3 text-base outline-none ring-ms-blue/20 focus:border-ms-blue focus:bg-white focus:ring-4 md:text-sm"
            >
              <option value={TODOS}>Todas as fontes</option>
              {fontes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-11 items-center gap-2 self-end rounded-md border border-ms-line bg-ms-bg px-3 text-sm font-medium text-ms-muted">
            <input
              type="checkbox"
              checked={somenteOficiais}
              onChange={(event) => setSomenteOficiais(event.target.checked)}
              className="h-4 w-4 rounded border-ms-line text-ms-blue"
            />
            Somente oficiais
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-4">
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <p className="text-ms-muted">Ano selecionado</p>
          <p className="mt-1 text-lg font-semibold text-ms-ink">{ano === TODOS ? "Todos" : ano}</p>
        </div>
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <p className="text-ms-muted">Dimensões</p>
          <p className="mt-1 text-lg font-semibold text-ms-ink">{temasSelecionados.length}</p>
        </div>
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <p className="text-ms-muted">Fontes</p>
          <p className="mt-1 text-lg font-semibold text-ms-ink">{fontesSelecionadas.length}</p>
        </div>
        <div className="rounded-md border border-ms-line bg-white p-4 shadow-sm">
          <p className="text-ms-muted">Registros</p>
          <p className="mt-1 text-lg font-semibold text-ms-ink">{filtrados.length}</p>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-ms-line bg-white p-6 text-sm text-ms-muted">
          Não há dados para os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="no-print mt-6 grid gap-6 lg:grid-cols-[13rem_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ms-muted">Ir para dimensão</h3>
              <nav className="mt-3 grid gap-1" aria-label="Navegação entre dimensões">
                {dimensoes.map((dimensao) => {
                  const ativa = temaExpandido === dimensao.tema;
                  const Icon = dimensao.config.icon;

                  return (
                    <button
                      key={dimensao.tema}
                      type="button"
                      onClick={() => setTemaAberto(dimensao.tema)}
                      aria-current={ativa}
                      className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm font-medium transition ${
                        ativa
                          ? "border-ms-blue bg-white text-ms-ink shadow-sm"
                          : "border-transparent text-ms-muted hover:bg-white hover:text-ms-ink"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white ${dimensao.config.accentClass}`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </span>
                      {dimensao.tema}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <div className="dimension-card-grid">
              {dimensoes.map((dimensao) => {
                const aberta = temaExpandido === dimensao.tema;
                const Icon = dimensao.config.icon;
                const valoresExibidos = dimensao.valores.slice(0, 8);

                return (
                  <div
                    key={dimensao.tema}
                    role="button"
                    tabIndex={0}
                    onClick={() => setTemaAberto(dimensao.tema)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setTemaAberto(dimensao.tema);
                      }
                    }}
                    className={`dimension-card ${aberta ? "is-open" : "is-closed"} group relative overflow-hidden rounded-md p-5 text-left text-white shadow-sm hover:-translate-y-0.5 hover:shadow-soft ${
                      dimensao.config.bgClass
                    }`}
                  >
                    <span className="absolute right-4 top-4 rounded-md border border-white/25 bg-white/10 p-1.5">
                      <ChevronDown className={`h-4 w-4 transition-transform duration-500 ${aberta ? "rotate-180" : ""}`} />
                    </span>

                    <span className="relative z-10 flex items-center gap-2.5 pr-10">
                      <span className="dimension-card-icon flex items-center justify-center rounded-md bg-white/15">
                        <Icon className="h-4 w-4 text-white" strokeWidth={2} />
                      </span>
                      <span className="text-sm font-semibold">{dimensao.tema}</span>
                    </span>

                    <span className="relative z-10 mt-5 flex flex-wrap items-end justify-between gap-3">
                      <span>
                        <span className="block text-xs font-medium text-white/75">Resumo da dimensão</span>
                        <span className="mt-1 block text-4xl font-semibold tracking-normal">
                          {formatScore(dimensao.score, dimensao.valores.length)}
                        </span>
                        <span className="mt-1 block text-xs text-white/75">
                          {dimensao.score === null ? "quantidade de registros" : "média % (normalizada)"}
                        </span>
                      </span>
                      <span className="rounded-md border border-white/25 bg-white/10 px-3 py-2 text-xs font-medium">
                        {dimensao.valores.length} registros
                      </span>
                    </span>

                    <span
                      aria-hidden={!aberta}
                      className="dimension-card-content relative z-10 block overflow-hidden rounded-md bg-white text-ms-ink"
                    >
                        <span className="grid gap-3 md:grid-cols-2">
                          {valoresExibidos.map((valor, indice) => {
                            const pontos = historico.get(valor.indicador.codigo) ?? [];
                            const invertido = valor.indicador.sentido === "menor_melhor";
                            const ultimoImpar = valoresExibidos.length % 2 === 1 && indice === valoresExibidos.length - 1;

                            return (
                              <CartaoIndicador
                                key={valor.id}
                                valor={valor}
                                pontos={pontos}
                                className={`block rounded-md p-3 ${ultimoImpar ? "md:col-span-2" : ""} ${dimensao.config.panelClass}`}
                              >
                                <span className="flex items-start justify-between gap-2">
                                  <span className="block text-xs font-semibold uppercase tracking-wide">{valor.ano}</span>
                                  {invertido ? (
                                    <span className="rounded-full bg-white/60 px-2 py-0.5 text-[0.65rem] font-semibold">
                                      menor é melhor
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-1 block text-sm font-semibold text-ms-ink">{valor.indicador.nome}</span>
                                <span className="mt-2 flex items-end justify-between gap-3">
                                  <span className="block text-2xl font-semibold tracking-normal">
                                    {formatValorIndicador(valor)}
                                  </span>
                                  {pontos.length > 1 ? (
                                    <span className="inline-flex flex-col items-end px-1 py-0.5">
                                      <Sparkline pontos={pontos} />
                                      <span className="mt-0.5 text-[0.62rem] font-semibold opacity-70">ver detalhes</span>
                                    </span>
                                  ) : null}
                                </span>
                                {pontos.length > 1 ? (
                                  <span className="mt-1 block text-[0.7rem] opacity-70">
                                    Evolução {pontos[0].ano}–{pontos[pontos.length - 1].ano}
                                  </span>
                                ) : null}
                                <span className="mt-2 block text-xs opacity-80">
                                  {valor.fonte ?? valor.indicador.fonte ?? "Fonte não informada"}
                                </span>
                                <RecursoGestao valor={valor} municipio={municipio} />
                              </CartaoIndicador>
                            );
                          })}
                        </span>
                        {dimensao.valores.length > 8 ? (
                          <span className="mt-3 block text-xs text-ms-muted">
                            Mais {dimensao.valores.length - 8} registros aparecem na tabela detalhada.
                          </span>
                        ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-md border border-ms-line bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ms-line text-sm">
                <thead className="bg-ms-bg text-left text-xs font-semibold uppercase tracking-wide text-ms-muted">
                  <tr>
                    <th className="px-5 py-4">Ano</th>
                    <th className="px-5 py-4">Dimensão</th>
                    <th className="px-5 py-4">Indicador</th>
                    <th className="px-5 py-4">Valor</th>
                    <th className="px-5 py-4">Fonte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ms-line">
                  {filtrados.map((valor) => (
                    <tr key={`linha-${valor.id}`} className="hover:bg-ms-sky/50">
                      <td className="whitespace-nowrap px-5 py-4 text-ms-muted">{valor.ano}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-ms-muted">{valor.indicador.tema}</td>
                      <td className="px-5 py-4 font-medium text-ms-ink">
                        {valor.indicador.nome}
                        {valor.indicador.sentido === "menor_melhor" ? (
                          <span className="ml-2 rounded-full bg-ms-bg px-2 py-0.5 text-[0.65rem] font-semibold text-ms-muted">
                            menor é melhor
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-ms-green">{formatValorIndicador(valor)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-ms-muted">
                        {valor.fonte ?? valor.indicador.fonte ?? "Fonte não informada"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
