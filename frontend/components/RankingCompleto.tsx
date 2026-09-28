"use client";

import { ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizarBusca } from "@/lib/buscaMunicipio";
import { CoberturaRanking } from "@/components/CoberturaRanking";
import { TEMA_ORDEM, ordemTema, temaConfig } from "@/components/municipio/fichaConfig";
import { BadgeFonte } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field, campoClasses } from "@/components/ui/Field";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { SkeletonLinhas } from "@/components/ui/Skeleton";
import { Valor } from "@/components/ui/Valor";
import { CLIENT_API_BASE_URL, type Indicador, type Municipio, type RankingItem } from "@/lib/api";
import { formatarNota } from "@/lib/formatters";
import {
  ANO_RANKING_SANEAMENTO,
  PESOS_RANKING_SANEAMENTO,
  type RankingSaneamentoItem
} from "@/lib/rankingSaneamento";
import { cn } from "@/lib/utils";

type Props = {
  indicadores: Indicador[];
  rankingSaneamento: RankingSaneamentoItem[];
  municipios: Municipio[];
};

type LinhaIndicador = {
  posicao: number | null;
  codigo_ibge: string;
  municipio: string;
  valor: number | null;
  fonte: string | null;
};

const COMPOSTA = "nota_saneamento";

const DIMENSOES: { campo: "agua" | "esgoto" | "residuos" | "aguasPluviais" | "gestao"; tema: string }[] = [
  { campo: "agua", tema: "Água" },
  { campo: "esgoto", tema: "Esgoto" },
  { campo: "residuos", tema: "Resíduos sólidos" },
  { campo: "aguasPluviais", tema: "Águas pluviais" },
  { campo: "gestao", tema: "Gestão municipal" }
];

const pct = (valor: number) => Math.round(valor * 100);

export function RankingCompleto({ indicadores, rankingSaneamento, municipios }: Props) {
  const [metrica, setMetrica] = useState(COMPOSTA);
  const [ano, setAno] = useState(ANO_RANKING_SANEAMENTO);
  const [busca, setBusca] = useState("");
  const [itensIndicador, setItensIndicador] = useState<RankingItem[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[] | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  const indicadorSelecionado = indicadores.find((item) => item.codigo === metrica) ?? null;
  const menorMelhor = indicadorSelecionado?.sentido === "menor_melhor";
  const anoRanking = rankingSaneamento[0]?.ano ?? ANO_RANKING_SANEAMENTO;
  const ehComposta = metrica === COMPOSTA;

  // PG-04.4: grupos na ordem fixa das dimensões; indicadores categóricos (código) não são ranqueáveis.
  const temasAgrupados = useMemo(() => {
    const grupos = new Map<string, Indicador[]>();
    for (const indicador of indicadores) {
      if (indicador.unidade?.trim().toLocaleLowerCase("pt-BR") === "código") continue;
      const lista = grupos.get(indicador.tema) ?? [];
      lista.push(indicador);
      grupos.set(indicador.tema, lista);
    }
    return Array.from(grupos.entries()).sort((a, b) => ordemTema(a[0]) - ordemTema(b[0]) || a[0].localeCompare(b[0], "pt-BR"));
  }, [indicadores]);

  // Os anos oferecidos refletem o que o indicador realmente tem publicado.
  useEffect(() => {
    if (ehComposta) {
      setAnosDisponiveis(null);
      return;
    }

    let ativo = true;
    fetch(`${CLIENT_API_BASE_URL}/indicadores/${metrica}/anos`)
      .then((response) => (response.ok ? (response.json() as Promise<number[]>) : Promise.reject()))
      .then((anos) => {
        if (!ativo) return;
        setAnosDisponiveis(anos);
        if (anos.length > 0 && !anos.includes(ano)) setAno(anos[0]);
      })
      .catch(() => {
        if (ativo) setAnosDisponiveis([]);
      });

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrica]);

  useEffect(() => {
    if (ehComposta) {
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
        if (ativo) setItensIndicador(itens);
      })
      .catch(() => {
        if (ativo) {
          setItensIndicador([]);
          setFalhou(true);
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [metrica, ano, ehComposta, tentativa]);

  // PG-04.5: municípios sem valor aparecem no fim, sem posição.
  const linhasIndicador = useMemo<LinhaIndicador[]>(() => {
    if (ehComposta || !itensIndicador) return [];
    const comDado = itensIndicador
      .filter((item) => item.valor !== null)
      .map((item) => ({ posicao: item.posicao, codigo_ibge: item.codigo_ibge, municipio: item.municipio, valor: item.valor, fonte: item.fonte }));
    const codigosComDado = new Set(comDado.map((item) => item.codigo_ibge));
    const semDado = municipios
      .filter((municipio) => !codigosComDado.has(municipio.codigo_ibge))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .map((municipio) => ({ posicao: null, codigo_ibge: municipio.codigo_ibge, municipio: municipio.nome, valor: null, fonte: null }));
    return [...comDado, ...semDado];
  }, [ehComposta, itensIndicador, municipios]);

  const termo = normalizarBusca(busca);
  const combina = (nome: string) => !termo || normalizarBusca(nome).includes(termo);
  const compostaFiltrada = rankingSaneamento.filter((item) => combina(item.municipio));
  const indicadorFiltrado = linhasIndicador.filter((item) => combina(item.municipio));
  const totalListado = ehComposta ? compostaFiltrada.length : indicadorFiltrado.length;
  const totalComDado = linhasIndicador.filter((item) => item.valor !== null).length;

  return (
    <section className="space-y-6">
      <div>
        <nav aria-label="Trilha de navegação" className="text-sm text-ms-muted">
          <Link href="/" className="hover:text-ms-blue">
            Início
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ms-ink">Ranking</span>
        </nav>
        <p className="eyebrow mt-4">Referência PNQS/ABES</p>
        <h1 className="t-h1 mt-3 text-ms-ink">Ranking municipal de saneamento</h1>
        <p className="mt-2 max-w-3xl text-sm leading-[22px] text-ms-muted">
          Compare os municípios de MS pela nota do Observatório, inspirada no referencial de indicadores do PNQS/ABES,
          ou por qualquer indicador oficial isolado. São {totalListado} {totalListado === 1 ? "município listado" : "municípios listados"}
          {busca ? ` para "${busca}"` : ""}.
        </p>

        {ehComposta ? (
          <details className="mt-3 max-w-3xl text-sm text-ms-muted">
            <summary className="cursor-pointer font-semibold text-ms-blue">Como calculamos a nota composta</summary>
            <div className="mt-2 grid gap-2 rounded-md border border-ms-line bg-ms-surface p-4 leading-[22px]">
              <p>
                Água {pct(PESOS_RANKING_SANEAMENTO.agua)}% · Esgoto {pct(PESOS_RANKING_SANEAMENTO.esgoto)}% · Resíduos sólidos{" "}
                {pct(PESOS_RANKING_SANEAMENTO.residuos)}% · Águas pluviais {pct(PESOS_RANKING_SANEAMENTO.aguasPluviais)}% · Gestão
                municipal {pct(PESOS_RANKING_SANEAMENTO.gestao)}%.
              </p>
              <p>
                A nota usa os indicadores oficiais disponíveis em {anoRanking}. Perdas de água, domicílios em risco e população afetada
                são invertidos; nos demais, o maior resultado pontua melhor. Dado ausente vale zero no respectivo
                módulo e a cobertura é exibida em cada linha.
              </p>
              <p>
                Esta é uma adaptação analítica do Observatório. Não representa nota, certificação ou premiação oficial
                concedida pela ABES/PNQS, que avalia organizações por metodologia própria.
              </p>
              <p>
                <Link href="/metodologia" className="font-semibold text-ms-blue hover:underline">
                  Ver metodologia e fontes
                </Link>
              </p>
            </div>
          </details>
        ) : (
          <p className="mt-3 max-w-3xl text-sm text-ms-muted">
            Ranking direto do valor oficial do indicador <b className="text-ms-ink">{indicadorSelecionado?.nome ?? metrica}</b>, sem
            composição. {menorMelhor ? "Quanto menor o valor, melhor a posição." : "Quanto maior o valor, melhor a posição."}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1.25fr]">
        <Field label="Métrica" htmlFor="ranking-metrica">
          <select id="ranking-metrica" value={metrica} onChange={(event) => setMetrica(event.target.value)} className={campoClasses}>
            <option value={COMPOSTA}>Nota geral de saneamento (Observatório)</option>
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
        </Field>

        <Field
          label="Ano de referência"
          htmlFor="ranking-ano"
          hint={anosDisponiveis && anosDisponiveis.length > 0 ? `${anosDisponiveis.length} anos com dado oficial` : undefined}
        >
          <select
            id="ranking-ano"
            value={ehComposta ? anoRanking : ano}
            disabled={ehComposta || (anosDisponiveis?.length ?? 0) === 0}
            onChange={(event) => setAno(Number(event.target.value))}
            className={campoClasses}
          >
            {ehComposta ? (
              <option value={anoRanking}>{anoRanking} (fixo)</option>
            ) : anosDisponiveis === null ? (
              <option>Carregando anos…</option>
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
        </Field>

        <Field label="Buscar município" htmlFor="ranking-busca">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ms-muted" strokeWidth={1.75} aria-hidden="true" />
            <input
              id="ranking-busca"
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome do município"
              className={cn(campoClasses, "pl-9")}
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-col gap-1 text-sm text-ms-muted md:flex-row md:items-center md:justify-between">
        <p>
          {ehComposta
            ? `${rankingSaneamento.length} municípios · indicadores oficiais de ${anoRanking}`
            : itensIndicador
              ? `${totalComDado} com dado · ${linhasIndicador.length - totalComDado} sem dado · ${ano}`
              : null}
        </p>
        <p className="font-medium text-ms-ink">
          {ehComposta
            ? "Ordenado por nota geral, da maior para a menor"
            : menorMelhor
              ? "Ordenado pelo valor, do menor para o maior"
              : "Ordenado pelo valor, do maior para o menor"}
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-ms-line bg-ms-surface">
        {carregando ? (
          <SkeletonLinhas rotulo="Carregando ranking" />
        ) : falhou ? (
          <ErrorState
            titulo="Não foi possível carregar o ranking deste indicador"
            descricao="Verifique a conexão e tente de novo em instantes."
            onTentarNovamente={() => setTentativa((atual) => atual + 1)}
          />
        ) : totalListado === 0 ? (
          <EmptyState
            titulo={busca ? `Nenhum município encontrado para “${busca}”` : "Nenhum dado oficial para esse indicador e ano"}
            descricao={busca ? "Confira a grafia do nome." : "Tente outro ano ou outra métrica."}
            acao={busca ? <Button onClick={() => setBusca("")}>Limpar busca</Button> : undefined}
          />
        ) : ehComposta ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">Ranking pela nota geral de saneamento de {anoRanking}</caption>
                <thead className="border-b border-ms-line bg-ms-surface-muted text-left">
                  <tr>
                    <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Pos.</th>
                    <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Município</th>
                    <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">
                      Nota geral <span className="font-normal normal-case tracking-normal">0–100</span>
                    </th>
                    {DIMENSOES.map((dimensao) => (
                      <th key={dimensao.campo} scope="col" className="t-label px-3 py-2.5 text-right text-ms-muted">
                        {temaConfig(dimensao.tema).nomeCurto}
                      </th>
                    ))}
                    <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {compostaFiltrada.map((item) => (
                    <tr key={item.codigo_ibge} className="border-b border-ms-line last:border-b-0 hover:bg-ms-sky/60">
                      <td className="font-data px-4 py-2.5 text-ms-muted">{item.posicao}º</td>
                      <td className="px-4 py-2.5">
                        <Link href={`/municipios/${item.codigo_ibge}`} className="font-semibold text-ms-ink hover:text-ms-blue hover:underline">
                          {item.municipio}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-3">
                          <span className="font-data w-10 text-right font-medium text-ms-ink">{formatarNota(item.nota)}</span>
                          <ScoreBar valor={item.nota} />
                        </span>
                      </td>
                      {DIMENSOES.map((dimensao) => (
                        <td key={dimensao.campo} className="font-data px-3 py-2.5 text-right text-ms-ink">
                          {formatarNota(item[dimensao.campo])}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <CoberturaRanking item={item} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ol className="divide-y divide-ms-line md:hidden">
              {compostaFiltrada.map((item) => {
                const aberto = expandido === item.codigo_ibge;
                const idDetalhe = `ranking-detalhe-${item.codigo_ibge}`;
                return (
                  <li key={item.codigo_ibge}>
                    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
                      <span className="font-data w-8 shrink-0 text-sm text-ms-muted">{item.posicao}º</span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/municipios/${item.codigo_ibge}`} className="block truncate font-semibold text-ms-ink">
                          {item.municipio}
                        </Link>
                      </span>
                      <span className="font-data font-medium text-ms-ink">{formatarNota(item.nota)}</span>
                      <button
                        type="button"
                        aria-expanded={aberto}
                        aria-controls={idDetalhe}
                        onClick={() => setExpandido(aberto ? null : item.codigo_ibge)}
                        className="-mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ms-muted hover:bg-ms-sky hover:text-ms-ink"
                      >
                        <ChevronDown className={cn("h-4 w-4", aberto && "rotate-180")} strokeWidth={1.75} aria-hidden="true" />
                        <span className="sr-only">Notas por dimensão de {item.municipio}</span>
                      </button>
                    </div>
                    {aberto ? (
                      <dl id={idDetalhe} className="grid gap-1.5 bg-ms-surface-muted px-4 py-3 pl-15 text-sm">
                        {DIMENSOES.map((dimensao) => (
                          <div key={dimensao.campo} className="flex justify-between gap-3">
                            <dt className="text-ms-muted">{temaConfig(dimensao.tema).nomeCurto}</dt>
                            <dd className="font-data text-ms-ink">{formatarNota(item[dimensao.campo])}</dd>
                          </div>
                        ))}
                        <div className="flex justify-between gap-3">
                          <dt className="text-ms-muted">Cobertura</dt>
                          <dd>
                            <CoberturaRanking item={item} />
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">
              Ranking por {indicadorSelecionado?.nome ?? metrica} em {ano}
            </caption>
            <thead className="border-b border-ms-line bg-ms-surface-muted text-left">
              <tr>
                <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Pos.</th>
                <th scope="col" className="t-label px-4 py-2.5 text-ms-muted">Município</th>
                <th scope="col" className="t-label px-4 py-2.5 text-right text-ms-muted">Valor {ano}</th>
                <th scope="col" className="t-label hidden px-4 py-2.5 text-ms-muted sm:table-cell">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {indicadorFiltrado.map((linha) => (
                <tr key={linha.codigo_ibge} className="border-b border-ms-line last:border-b-0 hover:bg-ms-sky/60">
                  <td className="font-data px-4 py-2.5 text-ms-muted">{linha.posicao ? `${linha.posicao}º` : "—"}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/municipios/${linha.codigo_ibge}`} className="font-semibold text-ms-ink hover:text-ms-blue hover:underline">
                      {linha.municipio}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right text-ms-ink">
                    {linha.valor === null ? (
                      <span className="text-xs text-ms-muted">sem dado oficial em {ano}</span>
                    ) : (
                      <Valor valor={linha.valor} unidade={indicadorSelecionado?.unidade} numeroClassName="font-medium" />
                    )}
                  </td>
                  <td className="hidden px-4 py-2.5 sm:table-cell">
                    {linha.valor === null ? null : <BadgeFonte fonte={linha.fonte} ano={ano} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ehComposta ? (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ms-muted" aria-label="Dimensões e pesos">
          {TEMA_ORDEM.map((tema) => {
            const config = temaConfig(tema);
            const Icon = config.icon;
            const campo = DIMENSOES.find((dimensao) => dimensao.tema === tema)?.campo;
            return (
              <li key={tema} className="inline-flex items-center gap-1.5">
                <Icon className={cn("h-4 w-4", config.textClass)} strokeWidth={1.75} aria-hidden="true" />
                {tema} {campo ? `${pct(PESOS_RANKING_SANEAMENTO[campo])}%` : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
