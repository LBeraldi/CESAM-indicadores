"use client";

import { ArrowUpDown, Gauge, Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_API_BASE_URL, type Indicador, type RankingItem } from "@/lib/api";
import {
  ANO_RANKING_SANEAMENTO,
  PESOS_RANKING_SANEAMENTO,
  type RankingSaneamentoItem
} from "@/lib/rankingSaneamento";

type Props = {
  indicadores: Indicador[];
  rankingSaneamento: RankingSaneamentoItem[];
};

type LinhaRanking = {
  posicao: number;
  codigo_ibge: string;
  municipio: string;
  uf: string;
  valorTexto: string;
  detalhe: string;
};

const COMPOSTA = "nota_saneamento";

function formatNumero(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function RankingCompleto({ indicadores, rankingSaneamento }: Props) {
  const [metrica, setMetrica] = useState(COMPOSTA);
  const [ano, setAno] = useState(ANO_RANKING_SANEAMENTO);
  const [busca, setBusca] = useState("");
  const [itensIndicador, setItensIndicador] = useState<RankingItem[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[] | null>(null);

  const indicadorSelecionado = indicadores.find((item) => item.codigo === metrica) ?? null;
  const menorMelhor = indicadorSelecionado?.sentido === "menor_melhor";

  const temasAgrupados = useMemo(() => {
    const grupos = new Map<string, Indicador[]>();
    for (const indicador of indicadores) {
      const lista = grupos.get(indicador.tema) ?? [];
      lista.push(indicador);
      grupos.set(indicador.tema, lista);
    }
    return Array.from(grupos.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [indicadores]);

  // Os anos oferecidos refletem o que o indicador realmente tem publicado
  // (via /indicadores/{codigo}/anos), em vez de uma lista fixa que na
  // prática caía em "sem dado" na maioria das combinações.
  useEffect(() => {
    if (metrica === COMPOSTA) {
      setAnosDisponiveis(null);
      return;
    }

    let ativo = true;
    fetch(`${CLIENT_API_BASE_URL}/indicadores/${metrica}/anos`)
      .then((response) => (response.ok ? (response.json() as Promise<number[]>) : Promise.reject()))
      .then((anos) => {
        if (!ativo) {
          return;
        }
        setAnosDisponiveis(anos);
        if (anos.length > 0 && !anos.includes(ano)) {
          setAno(anos[0]);
        }
      })
      .catch(() => {
        if (ativo) {
          setAnosDisponiveis([]);
        }
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrica]);

  useEffect(() => {
    if (metrica === COMPOSTA) {
      setItensIndicador(null);
      setFalhou(false);
      return;
    }

    let ativo = true;
    setCarregando(true);
    setFalhou(false);

    fetch(`${CLIENT_API_BASE_URL}/ranking?indicador=${metrica}&ano=${ano}&limit=200`)
      .then((response) => (response.ok ? (response.json() as Promise<RankingItem[]>) : Promise.reject()))
      .then((itens) => {
        if (ativo) {
          setItensIndicador(itens);
        }
      })
      .catch(() => {
        if (ativo) {
          setItensIndicador([]);
          setFalhou(true);
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [metrica, ano]);

  const linhas = useMemo<LinhaRanking[]>(() => {
    if (metrica === COMPOSTA) {
      return rankingSaneamento.map((item) => ({
        posicao: item.posicao,
        codigo_ibge: item.codigo_ibge,
        municipio: item.municipio,
        uf: item.uf,
        valorTexto: formatNumero(item.nota),
        detalhe: `Água ${formatNumero(item.agua)} · Esgoto ${formatNumero(item.esgoto)} · Resíduos ${formatNumero(item.residuos)} · Pluviais ${formatNumero(item.aguasPluviais)} · Dados ${formatNumero(item.cobertura)}%`
      }));
    }

    const unidade = indicadorSelecionado?.unidade ?? "";
    return (itensIndicador ?? [])
      .filter((item) => item.valor !== null)
      .map((item) => ({
        posicao: item.posicao,
        codigo_ibge: item.codigo_ibge,
        municipio: item.municipio,
        uf: item.uf,
        valorTexto: `${formatNumero(item.valor as number)}${unidade === "%" ? "%" : unidade ? ` ${unidade}` : ""}`,
        detalhe: item.fonte ?? "Fonte não informada"
      }));
  }, [metrica, rankingSaneamento, itensIndicador, indicadorSelecionado]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) {
      return linhas;
    }
    return linhas.filter((linha) => linha.municipio.toLocaleLowerCase("pt-BR").includes(termo));
  }, [busca, linhas]);

  return (
    <section className="space-y-5">
      <div className="rounded-md border border-ms-line bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ms-green">
          <Trophy className="h-4 w-4" />
          Ranking PNQS/ABES
        </div>
        <h1 className="mt-1 text-3xl font-semibold text-ms-ink">Ranking municipal de saneamento</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ms-muted">
          Compare os municípios de MS pela nota do Observatório, inspirada no referencial de indicadores do PNQS/ABES,
          ou por qualquer indicador oficial isolado. São {filtradas.length} {filtradas.length === 1 ? "município listado" : "municípios listados"}
          {busca ? ` para "${busca}"` : ""}.
        </p>

        {metrica === COMPOSTA ? (
          <details className="mt-3 max-w-3xl text-sm text-ms-muted">
            <summary className="cursor-pointer font-medium text-ms-blue">Como calculamos a nota composta</summary>
            <div className="mt-2 grid gap-1 rounded-md bg-ms-bg p-3 leading-6">
              <p>
                Água {Math.round(PESOS_RANKING_SANEAMENTO.agua * 100)}% · Esgoto{" "}
                {Math.round(PESOS_RANKING_SANEAMENTO.esgoto * 100)}% · Resíduos sólidos{" "}
                {Math.round(PESOS_RANKING_SANEAMENTO.residuos * 100)}% · Águas pluviais{" "}
                {Math.round(PESOS_RANKING_SANEAMENTO.aguasPluviais * 100)}% · Gestão municipal{" "}
                {Math.round(PESOS_RANKING_SANEAMENTO.gestao * 100)}%.
              </p>
              <p>
                A nota usa 16 indicadores oficiais de 2023. Perdas de água, domicílios em risco e população afetada
                são invertidos; nos demais, o maior resultado pontua melhor. Dado ausente vale zero no respectivo
                módulo e a cobertura é exibida em cada linha.
              </p>
              <p>
                Esta é uma adaptação analítica do Observatório. Não representa nota, certificação ou premiação oficial
                concedida pela ABES/PNQS, que avalia organizações por metodologia própria.
              </p>
            </div>
          </details>
        ) : (
          <p className="mt-3 max-w-3xl text-sm text-ms-muted">
            Ranking direto do valor oficial do indicador <b>{indicadorSelecionado?.nome ?? metrica}</b>, sem
            composição. {menorMelhor ? "Quanto menor o valor, melhor a posição." : "Quanto maior o valor, melhor a posição."}
          </p>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-ms-muted">Métrica</span>
            <select
              value={metrica}
              onChange={(event) => setMetrica(event.target.value)}
              className="h-11 w-full rounded-md border border-ms-line bg-ms-bg px-3 text-base outline-none ring-ms-blue/20 focus:border-ms-blue focus:bg-white focus:ring-4 md:text-sm"
            >
              <option value={COMPOSTA}>Nota PNQS/ABES adaptada (Observatório)</option>
              {temasAgrupados.map(([temaNome, itens]) => (
                <optgroup key={temaNome} label={temaNome}>
                  {itens.map((item) => (
                    <option key={item.codigo} value={item.codigo}>
                      {item.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-ms-muted">Ano de referência</span>
            <select
              value={ano}
              disabled={metrica === COMPOSTA || (anosDisponiveis?.length ?? 0) === 0}
              onChange={(event) => setAno(Number(event.target.value))}
              className="h-11 w-full rounded-md border border-ms-line bg-ms-bg px-3 text-base outline-none ring-ms-blue/20 focus:border-ms-blue focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
            >
              {metrica === COMPOSTA ? (
                <option value={ANO_RANKING_SANEAMENTO}>{ANO_RANKING_SANEAMENTO} (fixo)</option>
              ) : anosDisponiveis === null ? (
                <option>Carregando anos...</option>
              ) : anosDisponiveis.length === 0 ? (
                <option>Sem ano com dado oficial</option>
              ) : (
                anosDisponiveis.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              )}
            </select>
            {anosDisponiveis && anosDisponiveis.length > 0 ? (
              <span className="mt-1 block text-xs text-ms-muted">{anosDisponiveis.length} anos com dado oficial</span>
            ) : null}
          </label>

          <label className="relative block text-sm">
            <span className="mb-1 block font-medium text-ms-muted">Buscar município</span>
            <Search className="pointer-events-none absolute left-3 top-[2.6rem] h-4 w-4 -translate-y-1/2 text-ms-muted" />
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome do município"
              className="h-11 w-full rounded-md border border-ms-line bg-ms-bg pl-9 pr-3 text-base outline-none ring-ms-blue/20 focus:border-ms-blue focus:bg-white focus:ring-4 md:text-sm"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-ms-line bg-white shadow-sm">
        {carregando ? (
          <div className="p-8 text-center text-sm text-ms-muted">Carregando ranking...</div>
        ) : falhou || filtradas.length === 0 ? (
          <div className="p-8 text-center text-sm text-ms-muted">
            {falhou
              ? "Não foi possível carregar esse indicador agora. Tente novamente em instantes."
              : "Nenhum dado oficial para esse indicador e ano. Tente outro ano ou outra métrica."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ms-line text-sm">
              <thead className="bg-ms-bg text-left text-xs font-semibold uppercase tracking-wide text-ms-muted">
                <tr>
                  <th className="px-5 py-4">
                    <span className="inline-flex items-center gap-1">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      Posição
                    </span>
                  </th>
                  <th className="px-5 py-4">Município</th>
                  <th className="px-5 py-4">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      Valor
                    </span>
                  </th>
                  <th className="px-5 py-4">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ms-line">
                {filtradas.map((linha) => (
                  <tr key={linha.codigo_ibge} className="hover:bg-ms-sky/50">
                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-ms-sky text-sm font-semibold text-ms-blue">
                        {linha.posicao}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <Link href={`/municipios/${linha.codigo_ibge}`} className="font-semibold text-ms-ink hover:text-ms-blue">
                        {linha.municipio}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-lg font-semibold text-ms-ink">{linha.valorTexto}</td>
                    <td className="px-5 py-4 text-xs text-ms-muted">{linha.detalhe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
