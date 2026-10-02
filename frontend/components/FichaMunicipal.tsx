"use client";

import { ChevronDown, Download, LineChart, Printer, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Municipio, RecursoMunicipal, ValorIndicador } from "@/lib/api";
import { baixarCsvMunicipal } from "@/lib/exportarCsv";
import { ehUnidadeBinaria, formatarNota, rotuloFonteCurto } from "@/lib/formatters";
import { selecionarDestaques } from "@/lib/indicadoresDestaque";
import type { RankingSaneamentoItem } from "@/lib/rankingSaneamento";
import { ehStatusOficial } from "@/lib/statusValidacao";
import { cn } from "@/lib/utils";
import { RecursoGestao } from "@/components/municipio/RecursoGestao";
import { SeriePainel, type PontoHistorico } from "@/components/municipio/SeriePainel";
import { notaDoModulo, ordenarTexto, ordemTema, temaConfig } from "@/components/municipio/fichaConfig";
import { Badge, BadgeFonte } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Delta } from "@/components/ui/Delta";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sparkline } from "@/components/ui/Sparkline";
import { Valor } from "@/components/ui/Valor";

type Props = {
  municipio: Municipio;
  indicadores: ValorIndicador[];
  recursos?: RecursoMunicipal[];
  /** Nota do ranking para as abas de dimensão (ADR-001). */
  rankingItem?: RankingSaneamentoItem | null;
  /** PG-03.2: nome e metadados, renderizados no servidor. */
  cabecalho?: ReactNode;
  /** PG-03.3: faixa de notas. */
  faixaNotas?: ReactNode;
  /** PG-03.12: card do prestador e minimapa. */
  lateral?: ReactNode;
};

const TODOS = "todos";
const PAINEL_ID = "painel-indicadores";

// Selects compactos da barra de contexto no desktop; no celular ficam no tamanho de CP-02.
const selectClasses =
  "h-10 w-full appearance-none rounded-md border border-ms-line-strong bg-ms-surface pl-3 pr-8 text-base text-ms-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ms-blue md:text-sm lg:h-7 lg:w-auto lg:border-0 lg:bg-transparent lg:pl-0 lg:pr-6 lg:font-semibold";

const rotuloCampoClasses = "text-[13px] font-semibold text-ms-ink lg:text-[11px] lg:font-semibold lg:uppercase lg:tracking-[0.06em] lg:text-ms-muted";

function fonteDe(valor: ValorIndicador): string {
  return valor.fonte ?? valor.indicador.fonte ?? "Fonte não informada";
}

function construirHistorico(indicadores: ValorIndicador[]): Map<string, PontoHistorico[]> {
  const mapa = new Map<string, Map<number, PontoHistorico>>();

  for (const item of indicadores) {
    if (item.valor === null || ehUnidadeBinaria(item.indicador.unidade)) continue;
    const porAno = mapa.get(item.indicador.codigo) ?? new Map<number, PontoHistorico>();
    const existente = porAno.get(item.ano);
    const fonte = item.fonte ?? item.indicador.fonte;
    // Se dois registros cobrem o mesmo ano, o SINISA prevalece sobre o SNIS.
    if (!existente || (fonte ?? "").toLocaleLowerCase("pt-BR").includes("sinisa")) {
      porAno.set(item.ano, { ano: item.ano, valor: Number(item.valor), fonte });
    }
    mapa.set(item.indicador.codigo, porAno);
  }

  return new Map(
    Array.from(mapa.entries(), ([codigo, porAno]) => [codigo, Array.from(porAno.values()).sort((a, b) => a.ano - b.ano)])
  );
}

function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function ordenarPorNome(valores: ValorIndicador[]): ValorIndicador[] {
  return [...valores].sort((a, b) => ordenarTexto(a.indicador.nome, b.indicador.nome) || b.ano - a.ano);
}

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/** Nome do indicador com "menor é melhor" na linha de baixo (PG-03.9). */
function nomeIndicador(valor: ValorIndicador) {
  return (
    <>
      <span className="block font-medium text-ms-ink">{valor.indicador.nome}</span>
      {valor.indicador.sentido === "menor_melhor" ? (
        <Badge variante="inverse" className="mt-1">
          menor é melhor
        </Badge>
      ) : null}
    </>
  );
}

export function FichaMunicipal({
  municipio,
  indicadores,
  recursos = [],
  rankingItem = null,
  cabecalho,
  faixaNotas,
  lateral
}: Props) {
  const anos = useMemo(
    () => Array.from(new Set(indicadores.map((valor) => valor.ano))).sort((a, b) => b - a),
    [indicadores]
  );
  const temas = useMemo(
    () =>
      Array.from(new Set(indicadores.map((valor) => valor.indicador.tema))).sort((a, b) => {
        const ordem = ordemTema(a) - ordemTema(b);
        return ordem === 0 ? ordenarTexto(a, b) : ordem;
      }),
    [indicadores]
  );
  const fontes = useMemo(() => Array.from(new Set(indicadores.map(fonteDe))).sort(ordenarTexto), [indicadores]);

  const anoPadrao = anos[0] ? String(anos[0]) : TODOS;
  const [ano, setAno] = useState(anoPadrao);
  // PG-03.7: a ficha abre na primeira dimensão.
  const [tema, setTema] = useState(temas[0] ?? TODOS);
  const [verTodos, setVerTodos] = useState(false);
  const [fonte, setFonte] = useState(TODOS);
  const [somenteOficiais, setSomenteOficiais] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [serieAberta, setSerieAberta] = useState<ValorIndicador | null>(null);
  const [dataGeracao, setDataGeracao] = useState("");
  const abasRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setDataGeracao(new Date().toLocaleDateString("pt-BR"));
  }, []);

  const filtrados = useMemo(
    () =>
      indicadores
        .filter((valor) => ano === TODOS || String(valor.ano) === ano)
        .filter((valor) => fonte === TODOS || fonteDe(valor) === fonte)
        .filter((valor) => !somenteOficiais || ehStatusOficial(valor.status_validacao))
        .sort((a, b) => {
          const temaCompare = ordemTema(a.indicador.tema) - ordemTema(b.indicador.tema);
          if (temaCompare !== 0) return temaCompare;
          const nomeCompare = ordenarTexto(a.indicador.nome, b.indicador.nome);
          if (nomeCompare !== 0) return nomeCompare;
          return b.ano - a.ano;
        }),
    [ano, fonte, indicadores, somenteOficiais]
  );

  const temasDisponiveis = useMemo(
    () => temas.filter((item) => filtrados.some((valor) => valor.indicador.tema === item)),
    [filtrados, temas]
  );

  const historico = useMemo(
    () => construirHistorico(indicadores.filter((valor) => !somenteOficiais || ehStatusOficial(valor.status_validacao))),
    [indicadores, somenteOficiais]
  );

  /** ADR-007: por dimensão, os destaques; sem destaque com dado, todos os registros da dimensão. */
  const porTema = useMemo(() => {
    const mapa = new Map<string, { todos: ValorIndicador[]; destaques: ValorIndicador[] }>();
    const valoresPorTema = new Map<string, ValorIndicador[]>();

    // Agrupa uma única vez; evita percorrer todos os indicadores para cada dimensão.
    for (const valor of filtrados) {
      const valores = valoresPorTema.get(valor.indicador.tema) ?? [];
      valores.push(valor);
      valoresPorTema.set(valor.indicador.tema, valores);
    }

    for (const item of temasDisponiveis) {
      const todos = ordenarPorNome(valoresPorTema.get(item) ?? []);
      mapa.set(item, { todos, destaques: selecionarDestaques(todos, item) });
    }
    return mapa;
  }, [filtrados, temasDisponiveis]);

  const abas = [...temasDisponiveis, TODOS];
  const abaAtiva = abas.includes(tema) ? tema : abas[0];
  const daAba = abaAtiva === TODOS ? null : (porTema.get(abaAtiva) ?? null);
  const temDestaques = Boolean(daAba && daAba.destaques.length > 0);
  const mostrandoTodosDaAba = verTodos || !temDestaques;

  const grupos: Array<[string, ValorIndicador[]]> =
    abaAtiva === TODOS
      ? temasDisponiveis.map((item) => [item, porTema.get(item)?.todos ?? []])
      : daAba
        ? [[abaAtiva, mostrandoTodosDaAba ? daAba.todos : daAba.destaques]]
        : [];

  const linhasVisiveis = grupos.flatMap(([, valores]) => valores);

  // Resumo da ContextBar: o conjunto que as abas percorrem (principais ou lista completa).
  const conjuntoResumo =
    abaAtiva === TODOS || verTodos
      ? filtrados
      : temasDisponiveis.flatMap((item) => {
          const grupo = porTema.get(item);
          return grupo && grupo.destaques.length ? grupo.destaques : (grupo?.todos ?? []);
        });
  const totalDimensoes = new Set(conjuntoResumo.map((valor) => valor.indicador.tema)).size;
  const totalFontes = new Set(conjuntoResumo.map(fonteDe)).size;
  const resumoFiltros = `${plural(conjuntoResumo.length, "registro", "registros")} · ${plural(
    totalDimensoes,
    "dimensão",
    "dimensões"
  )} · ${plural(totalFontes, "fonte", "fontes")}`;

  const filtrosAlterados = ano !== anoPadrao || fonte !== TODOS || !somenteOficiais;
  const anoNumero = ano === TODOS ? null : Number(ano);

  const anosSerie = linhasVisiveis.flatMap((valor) => (historico.get(valor.indicador.codigo) ?? []).map((ponto) => ponto.ano));
  const periodoSerie = anosSerie.length ? `${Math.min(...anosSerie)}–${Math.max(...anosSerie)}` : "Série";

  const fecharSerie = useCallback(() => setSerieAberta(null), []);

  function selecionarAba(item: string) {
    setTema(item);
    setVerTodos(false);
  }

  function limparFiltros() {
    setAno(anoPadrao);
    setFonte(TODOS);
    setSomenteOficiais(true);
  }

  function aoTeclarAba(event: React.KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultimo = abas.length - 1;
    const destino =
      event.key === "ArrowRight" ? (indice === ultimo ? 0 : indice + 1)
      : event.key === "ArrowLeft" ? (indice === 0 ? ultimo : indice - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? ultimo
      : null;
    if (destino === null) return;
    event.preventDefault();
    selecionarAba(abas[destino]);
    abasRef.current[destino]?.focus();
  }

  function variacaoAnual(valor: ValorIndicador): { variacao: number; desde: number } | null {
    if (valor.valor === null || ehUnidadeBinaria(valor.indicador.unidade)) return null;
    const anterior = historico.get(valor.indicador.codigo)?.find((ponto) => ponto.ano === valor.ano - 1);
    return anterior ? { variacao: Number(valor.valor) - anterior.valor, desde: anterior.ano } : null;
  }

  function botaoSerie(valor: ValorIndicador) {
    const pontos = historico.get(valor.indicador.codigo) ?? [];
    if (pontos.length < 2) return null;
    return (
      <Button
        variante="ghost"
        tamanho="sm"
        onClick={() => setSerieAberta(valor)}
        aria-label={`Série histórica de ${valor.indicador.nome}`}
        aria-haspopup="dialog"
      >
        <LineChart className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        Série
      </Button>
    );
  }

  const pontosSerie = serieAberta ? (historico.get(serieAberta.indicador.codigo) ?? []) : [];
  const serieVisivel = serieAberta !== null && pontosSerie.length >= 2;

  return (
    <section className="pb-12" aria-label="Indicadores do município">
      <div className="print-only mb-6">
        <p className="eyebrow">Relatório municipal</p>
        <h2 className="t-h2 mt-2 text-ms-ink">{municipio.nome}</h2>
        <p className="mt-1 text-sm text-ms-muted">
          Código IBGE {municipio.codigo_ibge} · Ano {ano === TODOS ? "todos os anos" : ano} · Fonte{" "}
          {fonte === TODOS ? "todas as fontes" : fonte}
          {somenteOficiais ? " · somente oficiais" : ""}
          {dataGeracao ? ` · Gerado em ${dataGeracao}` : ""}
        </p>
      </div>

      {/* PG-03.2 / PG-03.3 / PG-03.12: cabeçalho com ações, faixa de notas e card lateral */}
      <div className="mt-4 grid gap-6 pb-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid content-start gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {cabecalho}
            <div className="no-print flex shrink-0 flex-wrap gap-2">
              <Button variante="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Imprimir
              </Button>
              <Button variante="primary" onClick={() => baixarCsvMunicipal(municipio, filtrados)} disabled={filtrados.length === 0}>
                <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Exportar CSV
              </Button>
            </div>
          </div>
          {faixaNotas}
        </div>
        {lateral}
      </div>

      {/* CP-11 Barra de contexto fixa, em uma linha (PG-03.6) */}
      <div className="no-print sticky top-[calc(var(--header-h)+0.5rem)] z-30 rounded-md border border-ms-line bg-ms-surface shadow-e1">
        <div className="flex items-center justify-between gap-3 px-4 py-2 lg:hidden">
          <p className="min-w-0 truncate text-sm">
            <span className="font-semibold text-ms-ink">{municipio.nome}</span>
            <span className="text-ms-muted">
              {" · "}
              {ano === TODOS ? "Todos os anos" : ano}
              {somenteOficiais ? " · Oficiais" : ""}
            </span>
          </p>
          <Button
            variante="secondary"
            tamanho="sm"
            aria-expanded={filtrosAbertos}
            aria-controls="filtros-ficha"
            onClick={() => setFiltrosAbertos((atual) => !atual)}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Filtros
          </Button>
        </div>

        <div
          id="filtros-ficha"
          className={cn(
            "gap-3 border-t border-ms-line p-4 lg:flex lg:items-center lg:gap-0 lg:border-t-0 lg:px-0 lg:py-2",
            filtrosAbertos ? "grid" : "hidden"
          )}
        >
          <div className="hidden min-w-0 gap-0.5 px-4 lg:grid">
            <span className={rotuloCampoClasses}>Município</span>
            <span className="truncate text-sm font-semibold text-ms-ink">{municipio.nome}</span>
          </div>

          <div className="grid gap-1 lg:gap-0.5 lg:border-l lg:border-ms-line lg:px-4">
            <label htmlFor="ficha-ano" className={rotuloCampoClasses}>
              Ano de referência
            </label>
            <div className="relative">
              <select id="ficha-ano" value={ano} onChange={(event) => setAno(event.target.value)} className={selectClasses}>
                <option value={TODOS}>Todos os anos</option>
                {anos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ms-muted lg:right-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="grid gap-1 lg:gap-0.5 lg:border-l lg:border-ms-line lg:px-4">
            <label htmlFor="ficha-fonte" className={rotuloCampoClasses}>
              Fonte
            </label>
            <div className="relative">
              <select id="ficha-fonte" value={fonte} onChange={(event) => setFonte(event.target.value)} className={selectClasses}>
                <option value={TODOS}>Todas as fontes</option>
                {fontes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ms-muted lg:right-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </div>
          </div>

          <label className="flex h-10 items-center gap-2 text-sm font-medium text-ms-ink lg:h-10 lg:border-l lg:border-ms-line lg:px-4">
            <input
              type="checkbox"
              checked={somenteOficiais}
              onChange={(event) => setSomenteOficiais(event.target.checked)}
              className="h-[18px] w-[18px] accent-ms-blue"
            />
            Somente oficiais
          </label>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:ml-auto lg:pr-4">
            {filtrosAlterados ? (
              <Button variante="ghost" tamanho="sm" onClick={limparFiltros}>
                <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Limpar filtros
              </Button>
            ) : null}
            <p className="whitespace-nowrap text-[13px] text-ms-muted" aria-live="polite">
              {resumoFiltros}
            </p>
          </div>
        </div>
      </div>

      {/* CP-12 Abas por dimensão */}
      <div className="no-print relative mt-6 overflow-x-auto scrollbar-none border-b border-ms-line">
        <div role="tablist" aria-label="Dimensões" className="flex min-w-max gap-1">
          {abas.map((item, indice) => {
            const selecionada = item === abaAtiva;
            const config = item === TODOS ? null : temaConfig(item);
            const Icone = config?.icon;
            const nota = item === TODOS ? null : notaDoModulo(rankingItem, item);
            return (
              <button
                key={item}
                ref={(elemento) => {
                  abasRef.current[indice] = elemento;
                }}
                type="button"
                role="tab"
                id={`aba-${slug(item)}`}
                aria-selected={selecionada}
                aria-controls={PAINEL_ID}
                tabIndex={selecionada ? 0 : -1}
                onClick={() => selecionarAba(item)}
                onKeyDown={(event) => aoTeclarAba(event, indice)}
                className={cn(
                  "-mb-px inline-flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold",
                  selecionada ? "border-ms-ink text-ms-ink" : "border-transparent text-ms-muted hover:text-ms-ink"
                )}
              >
                {Icone ? (
                  <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded text-white", config?.bgClass)}>
                    <Icone className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  </span>
                ) : null}
                {item === TODOS ? "Todos os indicadores" : item}
                {nota !== null ? (
                  <span className="font-data text-xs font-medium text-ms-muted">
                    {formatarNota(nota)}
                    <span className="sr-only"> de nota em {rankingItem?.ano}</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* PG-03.11: no desktop largo, a série fica ao lado da tabela */}
      <div className={cn("mt-4 grid items-start gap-4", serieVisivel && "xl:grid-cols-[minmax(0,1fr)_22rem]")}>
        <div
          id={PAINEL_ID}
          role="tabpanel"
          aria-labelledby={`aba-${slug(abaAtiva)}`}
          className="overflow-hidden rounded-md border border-ms-line bg-ms-surface"
        >
          {filtrados.length === 0 ? (
            <EmptyState
              titulo="Não há dados para os filtros selecionados"
              descricao="Mude o ano, a fonte ou desmarque “Somente oficiais”."
              acao={<Button onClick={limparFiltros}>Limpar filtros</Button>}
            />
          ) : (
            <>
              {/* CP-13 Tabela de indicadores (desktop e impressão) */}
              <table className="hidden w-full text-sm md:table print:table">
                <caption className="sr-only">
                  Indicadores de {municipio.nome}
                  {abaAtiva !== TODOS ? ` · ${abaAtiva}` : ""}
                  {anoNumero ? ` em ${anoNumero}` : ""}
                </caption>
                <thead className="border-b border-ms-line bg-ms-surface-muted text-left">
                  <tr>
                    <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Indicador</th>
                    {anoNumero === null ? <th scope="col" className="t-label px-3 py-2.5 text-ms-muted">Ano</th> : null}
                    <th scope="col" className="t-label px-3 py-2.5 text-right text-ms-muted">
                      Valor{anoNumero ? ` ${anoNumero}` : ""}
                    </th>
                    <th scope="col" className="t-label px-3 py-2.5 text-ms-muted">
                      {anoNumero ? `Desde ${anoNumero - 1}` : "Var. anual"}
                    </th>
                    <th scope="col" className="t-label whitespace-nowrap px-3 py-2.5 text-ms-muted print:hidden">
                      <span className="sr-only">Evolução </span>
                      {periodoSerie}
                    </th>
                    <th scope="col" className="t-label px-3 py-2.5 text-ms-muted">Fonte</th>
                    <th scope="col" className="px-3 py-2.5 print:hidden">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                {grupos.map(([nomeTema, valores]) => {
                  const config = temaConfig(nomeTema);
                  const Icone = config.icon;
                  return (
                    <tbody key={nomeTema}>
                      {abaAtiva === TODOS ? (
                        <tr className="border-b border-ms-line bg-ms-surface-muted">
                          <th scope="colgroup" colSpan={anoNumero === null ? 7 : 6} className="px-4 py-2 text-left">
                            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ms-ink">
                              <Icone className={cn("h-4 w-4", config.textClass)} strokeWidth={1.75} aria-hidden="true" />
                              {nomeTema}
                            </span>
                          </th>
                        </tr>
                      ) : null}
                      {valores.map((valor) => {
                        const pontos = historico.get(valor.indicador.codigo) ?? [];
                        const delta = variacaoAnual(valor);
                        const aberta = serieAberta?.id === valor.id;
                        return (
                          <tr
                            key={valor.id}
                            className={cn("border-b border-ms-line last:border-b-0 hover:bg-ms-sky/40", aberta && "bg-ms-sky/40")}
                          >
                            <td className="px-4 py-3 align-top">
                              {nomeIndicador(valor)}
                              <RecursoGestao valor={valor} municipio={municipio} recursos={recursos} />
                            </td>
                            {anoNumero === null ? <td className="font-data px-3 py-3 align-top text-ms-muted">{valor.ano}</td> : null}
                            <td className="px-3 py-3 text-right align-top text-ms-ink">
                              <Valor valor={valor.valor} unidade={valor.indicador.unidade} numeroClassName="font-medium" />
                            </td>
                            <td className="px-3 py-3 align-top">
                              {delta ? (
                                <Delta variacao={delta.variacao} sentido={valor.indicador.sentido} unidade={valor.indicador.unidade} desde={delta.desde} />
                              ) : (
                                <span className="text-ms-muted">
                                  <span aria-hidden="true">—</span>
                                  <span className="sr-only">sem comparação com o ano anterior</span>
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3 align-top print:hidden">
                              <Sparkline pontos={pontos} cor={config.cor} />
                            </td>
                            <td className="px-3 py-3 align-top">
                              <BadgeFonte fonte={fonteDe(valor)} ano={valor.ano} status={valor.status_validacao} curto />
                            </td>
                            <td className="px-3 py-2 text-right align-top print:hidden">{botaoSerie(valor)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>

              {/* CP-13.3 Celular: cada indicador vira um bloco */}
              <div className="md:hidden print:hidden">
                {grupos.map(([nomeTema, valores]) => {
                  const config = temaConfig(nomeTema);
                  const Icone = config.icon;
                  return (
                    <section key={nomeTema} aria-label={nomeTema}>
                      {abaAtiva === TODOS ? (
                        <h3 className="flex items-center gap-2 border-b border-ms-line bg-ms-surface-muted px-4 py-2 font-sans text-[13px] font-semibold text-ms-ink">
                          <Icone className={cn("h-4 w-4", config.textClass)} strokeWidth={1.75} aria-hidden="true" />
                          {nomeTema}
                        </h3>
                      ) : null}
                      <ul className="divide-y divide-ms-line">
                        {valores.map((valor) => {
                          const pontos = historico.get(valor.indicador.codigo) ?? [];
                          const delta = variacaoAnual(valor);
                          return (
                            <li key={valor.id} className="grid gap-1.5 px-4 py-3">
                              <p className="text-sm">{nomeIndicador(valor)}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <Valor valor={valor.valor} unidade={valor.indicador.unidade} numeroClassName="text-base font-medium" />
                                {delta ? (
                                  <Delta
                                    variacao={delta.variacao}
                                    sentido={valor.indicador.sentido}
                                    unidade={valor.indicador.unidade}
                                    desde={delta.desde}
                                  />
                                ) : null}
                                <span className="ml-auto">
                                  <Sparkline pontos={pontos} cor={config.cor} />
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs text-ms-muted">
                                  {anoNumero === null ? `${valor.ano} · ` : ""}
                                  {rotuloFonteCurto(fonteDe(valor), valor.ano)}
                                </span>
                                {botaoSerie(valor)}
                              </div>
                              <RecursoGestao valor={valor} municipio={municipio} recursos={recursos} />
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>

              {/* ADR-007: acesso à lista completa da dimensão */}
              {daAba && temDestaques && daAba.todos.length > daAba.destaques.length ? (
                <div className="no-print border-t border-ms-line bg-ms-surface-muted px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setVerTodos((atual) => !atual)}
                    aria-expanded={verTodos}
                    className="inline-flex min-h-8 items-center text-[13px] font-semibold text-ms-blue hover:underline"
                  >
                    {verTodos
                      ? `Mostrar só os ${daAba.destaques.length} principais`
                      : `Ver todos os ${daAba.todos.length} indicadores de ${abaAtiva}`}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        {serieAberta && serieVisivel ? (
          <SeriePainel indicador={serieAberta.indicador} municipio={municipio.nome} pontos={pontosSerie} onFechar={fecharSerie} />
        ) : null}
      </div>
    </section>
  );
}
