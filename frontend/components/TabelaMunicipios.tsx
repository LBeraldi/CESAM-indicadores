"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { normalizarBusca } from "@/lib/buscaMunicipio";
import { CoberturaRanking, TOTAL_INDICADORES_RANKING, indicadoresInformados } from "@/components/CoberturaRanking";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { campoClasses } from "@/components/ui/Field";
import { ScoreBar } from "@/components/ui/ScoreBar";
import type { Municipio } from "@/lib/api";
import { formatarArea, formatarNota, formatarPopulacao } from "@/lib/formatters";
import type { RankingSaneamentoItem } from "@/lib/rankingSaneamento";
import { cn } from "@/lib/utils";

type Props = {
  municipios: Municipio[];
  ranking: RankingSaneamentoItem[];
  anoRanking: number;
};

type Coluna = "nome" | "populacao" | "area_km2" | "nota";
type Direcao = "asc" | "desc";
type FiltroCobertura = "todos" | "completos" | "incompletos";

export function TabelaMunicipios({ municipios, ranking, anoRanking }: Props) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [cobertura, setCobertura] = useState<FiltroCobertura>("todos");
  const [ordenarPor, setOrdenarPor] = useState<Coluna>("nome");
  const [direcao, setDirecao] = useState<Direcao>("asc");

  const rankingPorCodigo = useMemo(() => new Map(ranking.map((item) => [item.codigo_ibge, item])), [ranking]);

  function completo(codigo: string): boolean {
    const item = rankingPorCodigo.get(codigo);
    return item ? indicadoresInformados(item) >= TOTAL_INDICADORES_RANKING : false;
  }

  const totalCompletos = municipios.filter((municipio) => completo(municipio.codigo_ibge)).length;

  function alternarOrdenacao(coluna: Coluna) {
    if (coluna === ordenarPor) {
      setDirecao((atual) => (atual === "asc" ? "desc" : "asc"));
      return;
    }
    setOrdenarPor(coluna);
    setDirecao(coluna === "nome" ? "asc" : "desc");
  }

  const filtrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    const porTermo = termo
      ? municipios.filter((municipio) =>
          /^\d+$/.test(termo) ? municipio.codigo_ibge.startsWith(termo) : normalizarBusca(municipio.nome).includes(termo)
        )
      : municipios;
    const lista =
      cobertura === "todos"
        ? porTermo
        : porTermo.filter((municipio) => (cobertura === "completos") === completo(municipio.codigo_ibge));

    const sinal = direcao === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      if (ordenarPor === "nome") return sinal * a.nome.localeCompare(b.nome, "pt-BR");
      const valorA = ordenarPor === "nota" ? (rankingPorCodigo.get(a.codigo_ibge)?.nota ?? -1) : (a[ordenarPor] ?? -1);
      const valorB = ordenarPor === "nota" ? (rankingPorCodigo.get(b.codigo_ibge)?.nota ?? -1) : (b[ordenarPor] ?? -1);
      return sinal * (valorA - valorB);
    });
    // completo depende só de rankingPorCodigo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, cobertura, municipios, ordenarPor, direcao, rankingPorCodigo]);

  function cabecalhoOrdenavel(coluna: Coluna, rotulo: React.ReactNode, className?: string, alinharDireita = false) {
    const ativa = ordenarPor === coluna;
    const Icone = !ativa ? ArrowUpDown : direcao === "asc" ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={ativa ? (direcao === "asc" ? "ascending" : "descending") : "none"}
        className={cn("px-4 py-2.5", alinharDireita && "text-right", className)}
      >
        <button
          type="button"
          onClick={() => alternarOrdenacao(coluna)}
          className={cn("t-label inline-flex items-center gap-1 hover:text-ms-blue", ativa ? "text-ms-ink" : "text-ms-muted")}
        >
          {rotulo}
          <Icone className={cn("h-3.5 w-3.5", !ativa && "opacity-50")} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </th>
    );
  }

  const filtrosCobertura: { valor: FiltroCobertura; rotulo: string; total: number }[] = [
    { valor: "todos", rotulo: "Todos", total: municipios.length },
    { valor: "completos", rotulo: "Dados completos", total: totalCompletos },
    { valor: "incompletos", rotulo: "Dados incompletos", total: municipios.length - totalCompletos }
  ];

  return (
    <section className="space-y-6">
      <div>
        <nav aria-label="Trilha de navegação" className="text-sm text-ms-muted">
          <Link href="/" className="hover:text-ms-blue">
            Início
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ms-ink">Municípios</span>
        </nav>
        <h1 className="t-h1 mt-3 text-ms-ink">Municípios de Mato Grosso do Sul</h1>
        <p className="mt-2 text-sm text-ms-muted">
          {municipios.length} municípios · nota geral e cobertura com base nos indicadores oficiais de {anoRanking}
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full lg:w-96">
          <label htmlFor="busca-lista-municipios" className="mb-1.5 block text-[13px] font-semibold text-ms-ink">
            Buscar município
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ms-muted" strokeWidth={1.75} aria-hidden="true" />
            <input
              id="busca-lista-municipios"
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar município ou código IBGE"
              className={cn(campoClasses, "pl-9")}
            />
          </div>
        </div>

        <div role="group" aria-label="Filtrar por cobertura de dados" className="flex flex-wrap gap-2">
          {filtrosCobertura.map((filtro) => (
            <button
              key={filtro.valor}
              type="button"
              aria-pressed={cobertura === filtro.valor}
              onClick={() => setCobertura(filtro.valor)}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold",
                cobertura === filtro.valor
                  ? "border-ms-ink bg-ms-ink text-white"
                  : "border-ms-line-strong bg-ms-surface text-ms-ink hover:border-ms-blue"
              )}
            >
              {filtro.rotulo}
              <span className="font-data font-medium opacity-75">{filtro.total}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-ms-line bg-ms-surface">
        {filtrados.length === 0 ? (
          <EmptyState
            titulo={busca ? `Nenhum município encontrado para “${busca}”` : "Nenhum município neste filtro"}
            descricao="Confira a grafia ou busque pelo código IBGE de 7 dígitos."
            acao={
              <Button
                onClick={() => {
                  setBusca("");
                  setCobertura("todos");
                }}
              >
                Limpar busca
              </Button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">
              Municípios de Mato Grosso do Sul com população, área, nota geral de {anoRanking} e cobertura de dados
            </caption>
            <thead className="border-b border-ms-line bg-ms-surface-muted text-left">
              <tr>
                {cabecalhoOrdenavel("nome", "Município")}
                <th scope="col" className="t-label hidden px-4 py-2.5 text-ms-muted md:table-cell">
                  Código IBGE
                </th>
                {cabecalhoOrdenavel(
                  "populacao",
                  <>
                    População <span className="font-normal normal-case tracking-normal">hab.</span>
                  </>,
                  "hidden md:table-cell",
                  true
                )}
                {cabecalhoOrdenavel(
                  "area_km2",
                  <>
                    Área <span className="font-normal normal-case tracking-normal">km²</span>
                  </>,
                  "hidden lg:table-cell",
                  true
                )}
                {cabecalhoOrdenavel("nota", `Nota ${anoRanking}`)}
                <th scope="col" className="t-label hidden px-4 py-2.5 text-ms-muted md:table-cell">
                  Cobertura
                </th>
                <th scope="col" className="w-10 px-2 py-2.5">
                  <span className="sr-only">Abrir ficha</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((municipio) => {
                const item = rankingPorCodigo.get(municipio.codigo_ibge);
                const incompleto = !item || indicadoresInformados(item) < TOTAL_INDICADORES_RANKING;

                return (
                  <tr
                    key={municipio.codigo_ibge}
                    onClick={() => router.push(`/municipios/${municipio.codigo_ibge}`)}
                    className="cursor-pointer border-b border-ms-line last:border-b-0 hover:bg-ms-sky/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/municipios/${municipio.codigo_ibge}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-semibold text-ms-ink hover:text-ms-blue hover:underline"
                      >
                        {municipio.nome}
                      </Link>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ms-muted md:hidden">
                        {municipio.populacao ? (
                          <span>
                            <span className="font-data">{formatarPopulacao(municipio.populacao)}</span> hab.
                          </span>
                        ) : null}
                        {incompleto ? <CoberturaRanking item={item} ano={anoRanking} /> : null}
                      </span>
                    </td>
                    <td className="font-data hidden px-4 py-3 text-ms-muted md:table-cell">{municipio.codigo_ibge}</td>
                    <td className="font-data hidden px-4 py-3 text-right text-ms-ink md:table-cell">
                      {formatarPopulacao(municipio.populacao)}
                    </td>
                    <td className="font-data hidden px-4 py-3 text-right text-ms-ink lg:table-cell">
                      {formatarArea(municipio.area_km2)}
                    </td>
                    <td className="px-4 py-3">
                      {item ? (
                        <span className="flex items-center gap-3">
                          <span className="font-data w-10 text-right font-medium text-ms-ink">{formatarNota(item.nota)}</span>
                          <ScoreBar valor={item.nota} className="hidden sm:inline-block" />
                        </span>
                      ) : (
                        <span className="text-ms-muted">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">sem dado</span>
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <CoberturaRanking item={item} ano={anoRanking} />
                    </td>
                    <td className="px-2 py-3 text-ms-muted">
                      <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-ms-muted">
        {filtrados.length} de {municipios.length} municípios listados. População: estimativa IBGE. Área: malha municipal IBGE.
      </p>
    </section>
  );
}
