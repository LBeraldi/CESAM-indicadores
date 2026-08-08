"use client";

import {
  ChevronDown,
  CloudRain,
  Download,
  Droplets,
  Filter,
  Leaf,
  Printer,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Waves
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { Municipio, ValorIndicador } from "@/lib/api";
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
// site (ms-teal/navy/green/blue/amber em tailwind.config.ts), variando por
// matiz e não por saturação, para não destoar do header, mapa e ranking.
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
    bgClass: "bg-[#18765a]",
    accentClass: "bg-[#18765a]",
    panelClass: "bg-[#e5f3ec] text-[#125f48]"
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

function formatScore(score: number | null, quantidade: number): string {
  if (score === null) {
    return `${quantidade}`;
  }

  return score.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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

                return (
                  <button
                    key={dimensao.tema}
                    type="button"
                    onClick={() => setTemaAberto(dimensao.tema)}
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
                          {dimensao.valores.slice(0, 8).map((valor) => {
                            const pontos = historico.get(valor.indicador.codigo) ?? [];
                            const invertido = valor.indicador.sentido === "menor_melhor";

                            return (
                              <span key={valor.id} className={`block rounded-md p-3 ${dimensao.config.panelClass}`}>
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
                                  {pontos.length > 1 ? <Sparkline pontos={pontos} /> : null}
                                </span>
                                {pontos.length > 1 ? (
                                  <span className="mt-1 block text-[0.7rem] opacity-70">
                                    Evolução {pontos[0].ano}–{pontos[pontos.length - 1].ano}
                                  </span>
                                ) : null}
                                <span className="mt-2 block text-xs opacity-80">
                                  {valor.fonte ?? valor.indicador.fonte ?? "Fonte não informada"}
                                </span>
                              </span>
                            );
                          })}
                        </span>
                        {dimensao.valores.length > 8 ? (
                          <span className="mt-3 block text-xs text-ms-muted">
                            Mais {dimensao.valores.length - 8} registros aparecem na tabela detalhada.
                          </span>
                        ) : null}
                    </span>
                  </button>
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
