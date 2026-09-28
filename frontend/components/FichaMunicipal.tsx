"use client";

import { Download, LineChart, Printer, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Municipio, RecursoMunicipal, ValorIndicador } from "@/lib/api";
import { baixarCsvMunicipal } from "@/lib/exportarCsv";
import { ehUnidadeBinaria, formatarNota } from "@/lib/formatters";
import type { RankingSaneamentoItem } from "@/lib/rankingSaneamento";
import { cn } from "@/lib/utils";
import { RecursoGestao } from "@/components/municipio/RecursoGestao";
import { SeriePainel, type PontoHistorico } from "@/components/municipio/SeriePainel";
import { notaDoModulo, ordenarTexto, ordemTema, temaConfig } from "@/components/municipio/fichaConfig";
import { Badge, BadgeFonte, rotuloFonte } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Delta } from "@/components/ui/Delta";
import { EmptyState } from "@/components/ui/EmptyState";
import { campoClasses } from "@/components/ui/Field";
import { Sparkline } from "@/components/ui/Sparkline";
import { Valor } from "@/components/ui/Valor";

type Props = {
  municipio: Municipio;
  indicadores: ValorIndicador[];
  recursos?: RecursoMunicipal[];
  /** Nota do ranking para as abas de dimensão (ADR-001). */
  rankingItem?: RankingSaneamentoItem | null;
};

const TODOS = "todos";
const PAINEL_ID = "painel-indicadores";

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
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function FichaMunicipal({ municipio, indicadores, recursos = [], rankingItem = null }: Props) {
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
  const [tema, setTema] = useState(TODOS);
  const [fonte, setFonte] = useState(TODOS);
  const [somenteOficiais, setSomenteOficiais] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [serieAberta, setSerieAberta] = useState<ValorIndicador | null>(null);
  const [dataGeracao, setDataGeracao] = useState("");
  const abasRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setDataGeracao(new Date().toLocaleDateString("pt-BR"));
  }, []);

  const filtradosSemTema = useMemo(
    () =>
      indicadores
        .filter((valor) => ano === TODOS || String(valor.ano) === ano)
        .filter((valor) => fonte === TODOS || fonteDe(valor) === fonte)
        .filter((valor) => !somenteOficiais || valor.status_validacao.includes("oficial")),
    [ano, fonte, indicadores, somenteOficiais]
  );

  const filtrados = useMemo(
    () =>
      filtradosSemTema
        .filter((valor) => tema === TODOS || valor.indicador.tema === tema)
        .sort((a, b) => {
          const temaCompare = ordemTema(a.indicador.tema) - ordemTema(b.indicador.tema);
          if (temaCompare !== 0) return temaCompare;
          const nomeCompare = ordenarTexto(a.indicador.nome, b.indicador.nome);
          if (nomeCompare !== 0) return nomeCompare;
          return b.ano - a.ano;
        }),
    [filtradosSemTema, tema]
  );

  const temasDisponiveis = useMemo(
    () => temas.filter((item) => filtradosSemTema.some((valor) => valor.indicador.tema === item)),
    [filtradosSemTema, temas]
  );

  const historico = useMemo(
    () => construirHistorico(indicadores.filter((valor) => !somenteOficiais || valor.status_validacao.includes("oficial"))),
    [indicadores, somenteOficiais]
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, ValorIndicador[]>();
    for (const valor of filtrados) {
      const lista = mapa.get(valor.indicador.tema) ?? [];
      lista.push(valor);
      mapa.set(valor.indicador.tema, lista);
    }
    return Array.from(mapa.entries());
  }, [filtrados]);

  const totalDimensoes = new Set(filtrados.map((valor) => valor.indicador.tema)).size;
  const totalFontes = new Set(filtrados.map(fonteDe)).size;
  const filtrosAlterados = ano !== anoPadrao || tema !== TODOS || fonte !== TODOS || !somenteOficiais;
  const anoNumero = ano === TODOS ? null : Number(ano);
  const abas = [...temasDisponiveis, TODOS];
  const abaAtiva = abas.includes(tema) ? tema : TODOS;

  const resumoFiltros = `${filtrados.length} ${filtrados.length === 1 ? "registro" : "registros"} · ${totalDimensoes} ${
    totalDimensoes === 1 ? "dimensão" : "dimensões"
  } · ${totalFontes} ${totalFontes === 1 ? "fonte" : "fontes"}`;

  const fecharSerie = useCallback(() => setSerieAberta(null), []);

  function limparFiltros() {
    setAno(anoPadrao);
    setTema(TODOS);
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
    setTema(abas[destino]);
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

      {/* CP-11 Barra de contexto fixa */}
      <div className="no-print sticky top-[var(--header-h)] z-30 -mx-4 border-y border-ms-line bg-ms-surface px-4 shadow-e1 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3 py-2 lg:hidden">
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
          className={cn("flex-wrap items-end gap-x-4 gap-y-3 pb-3 lg:flex lg:py-3", filtrosAbertos ? "grid" : "hidden")}
        >
          <div className="hidden min-w-0 lg:grid lg:gap-0.5">
            <span className="truncate font-semibold text-ms-ink">{municipio.nome}</span>
            <span className="whitespace-nowrap text-xs text-ms-muted" aria-live="polite">
              {resumoFiltros}
            </span>
          </div>

          <div className="grid gap-1">
            <label htmlFor="ficha-ano" className="text-[13px] font-semibold text-ms-ink">
              Ano de referência
            </label>
            <select id="ficha-ano" value={ano} onChange={(event) => setAno(event.target.value)} className={cn(campoClasses, "lg:w-32")}>
              <option value={TODOS}>Todos os anos</option>
              {anos.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label htmlFor="ficha-tema" className="text-[13px] font-semibold text-ms-ink">
              Tema
            </label>
            <select id="ficha-tema" value={tema} onChange={(event) => setTema(event.target.value)} className={cn(campoClasses, "lg:w-40")}>
              <option value={TODOS}>Todos os temas</option>
              {temas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <label htmlFor="ficha-fonte" className="text-[13px] font-semibold text-ms-ink">
              Fonte
            </label>
            <select id="ficha-fonte" value={fonte} onChange={(event) => setFonte(event.target.value)} className={cn(campoClasses, "lg:w-40")}>
              <option value={TODOS}>Todas as fontes</option>
              {fontes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <label className="flex h-10 items-center gap-2 text-sm font-medium text-ms-ink">
            <input
              type="checkbox"
              checked={somenteOficiais}
              onChange={(event) => setSomenteOficiais(event.target.checked)}
              className="h-[18px] w-[18px] accent-ms-blue"
            />
            Somente oficiais
          </label>

          <p className="flex h-10 items-center text-[13px] text-ms-muted lg:hidden">{resumoFiltros}</p>

          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {filtrosAlterados ? (
              <Button variante="ghost" onClick={limparFiltros}>
                <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                Limpar filtros
              </Button>
            ) : null}
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
                onClick={() => setTema(item)}
                onKeyDown={(event) => aoTeclarAba(event, indice)}
                className={cn(
                  "-mb-px inline-flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-sm font-semibold",
                  selecionada ? "border-ms-ink text-ms-ink" : "border-transparent text-ms-muted hover:text-ms-ink"
                )}
              >
                {Icone ? <Icone className={cn("h-4 w-4", config?.textClass)} strokeWidth={1.75} aria-hidden="true" /> : null}
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

      <div
        id={PAINEL_ID}
        role="tabpanel"
        aria-labelledby={`aba-${slug(abaAtiva)}`}
        className="mt-4 overflow-hidden rounded-md border border-ms-line bg-ms-surface"
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
                  <th scope="col" className="t-label px-3 py-2.5 text-ms-muted print:hidden">
                    <span className="sr-only">Evolução</span>
                    <span aria-hidden="true">Série</span>
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
                      return (
                        <tr key={valor.id} className="border-b border-ms-line last:border-b-0 hover:bg-ms-sky/40">
                          <td className="px-4 py-3 align-top">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-ms-ink">{valor.indicador.nome}</span>
                              {valor.indicador.sentido === "menor_melhor" ? <Badge variante="inverse">menor é melhor</Badge> : null}
                            </span>
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
                            <BadgeFonte fonte={fonteDe(valor)} ano={valor.ano} status={valor.status_validacao} />
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
                            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ms-ink">
                              {valor.indicador.nome}
                              {valor.indicador.sentido === "menor_melhor" ? <Badge variante="inverse">menor é melhor</Badge> : null}
                            </p>
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
                                {rotuloFonte(fonteDe(valor), valor.ano)}
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
          </>
        )}
      </div>

      {serieAberta && pontosSerie.length >= 2 ? (
        <SeriePainel indicador={serieAberta.indicador} municipio={municipio.nome} pontos={pontosSerie} onFechar={fecharSerie} />
      ) : null}
    </section>
  );
}
