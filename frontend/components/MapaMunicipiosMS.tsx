"use client";

import { ArrowRight, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Field, campoClasses } from "@/components/ui/Field";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { TEMA_ORDEM, notaDoModulo, temaConfig } from "@/components/municipio/fichaConfig";
import { CLIENT_API_BASE_URL, type Municipio, type RankingItem, type SentidoIndicador } from "@/lib/api";
import { COR_CLASSE, LIMITES_NOTA, classeDaNota, classePorQuebras, quebrasPorQuintil, type ClasseEscala } from "@/lib/escalaMapa";
import { ehUnidadeBinaria, formatarNota, formatarNumero, formatarPopulacao, formatarValor } from "@/lib/formatters";
import { createProjector, geometryToPath, getBounds, type GeoJsonCollection } from "@/lib/geo";
import type { RankingSaneamentoItem } from "@/lib/rankingSaneamento";

type Props = {
  municipios: Municipio[];
  notaSaneamento: RankingSaneamentoItem[];
};

type Metrica = {
  codigo: string;
  nome: string;
  unidade: string;
};

type DadoMunicipio = { valor: number; posicao: number | null };

type MapPath = {
  codigo: string;
  nome: string;
  path: string;
  classe: ClasseEscala | null;
};

const SVG_WIDTH = 860;
const SVG_HEIGHT = 620;
const MAP_PADDING = 24;
const FALLBACK_CODE = "5002704";
const ANO_METRICA_PREFERIDO = 2024;
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 1.5;
const NOTA = "nota_saneamento";

const METRICAS: Metrica[] = [
  { codigo: NOTA, nome: "Nota geral de saneamento", unidade: "0–100" },
  { codigo: "agua_atendimento_total", nome: "Água — atendimento total", unidade: "%" },
  { codigo: "agua_perdas_distribuicao", nome: "Água — perdas na distribuição", unidade: "%" },
  { codigo: "agua_extensao_rede", nome: "Água — extensão da rede", unidade: "km" },
  { codigo: "esgoto_atendimento_total", nome: "Esgoto — atendimento total", unidade: "%" },
  { codigo: "esgoto_coleta", nome: "Esgoto — coleta", unidade: "%" },
  { codigo: "esgoto_tratamento", nome: "Esgoto — tratamento", unidade: "%" },
  { codigo: "esgoto_extensao_rede", nome: "Esgoto — extensão da rede", unidade: "km" },
  { codigo: "residuos_cobertura_coleta_domiciliar", nome: "Resíduos — coleta domiciliar", unidade: "%" },
  { codigo: "residuos_cobertura_coleta_seletiva", nome: "Resíduos — coleta seletiva", unidade: "%" },
  { codigo: "residuos_massa_coletada_per_capita", nome: "Resíduos — massa coletada per capita", unidade: "kg/hab.dia" },
  { codigo: "residuos_massa_recuperada_per_capita", nome: "Resíduos — massa recuperada per capita", unidade: "kg/hab.ano" },
  { codigo: "aguas_pluviais_vias_pavimentadas", nome: "Pluviais — vias pavimentadas", unidade: "%" },
  { codigo: "aguas_pluviais_rede_subterranea", nome: "Pluviais — rede subterrânea", unidade: "%" },
  { codigo: "aguas_pluviais_domicilios_risco_inundacao", nome: "Pluviais — domicílios em risco", unidade: "%" },
  { codigo: "aguas_pluviais_populacao_impactada", nome: "Pluviais — população impactada", unidade: "%" },
  { codigo: "gestao_plano_municipal_saneamento", nome: "Gestão — plano municipal", unidade: "sim/não" },
  { codigo: "gestao_conselho_municipal", nome: "Gestão — conselho municipal", unidade: "sim/não" },
  { codigo: "gestao_agencia_reguladora", nome: "Gestão — agência reguladora", unidade: "sim/não" }
];

function textoValor(valor: number, metrica: Metrica): string {
  if (metrica.codigo === NOTA) return formatarNota(valor);
  const { numero, unidade } = formatarValor(valor, metrica.unidade);
  return unidade ? `${numero} ${unidade}` : numero;
}

type TipoEscala = "nota" | "binaria" | "quintil";

function tipoEscala(codigoMetrica: string): TipoEscala {
  if (codigoMetrica === NOTA) return "nota";
  const unidade = METRICAS.find((item) => item.codigo === codigoMetrica)?.unidade;
  return ehUnidadeBinaria(unidade) ? "binaria" : "quintil";
}

function classeDoValor(valor: number | null, tipo: TipoEscala, quebras: number[], menorMelhor: boolean): ClasseEscala | null {
  if (valor === null) return null;
  if (tipo === "nota") return classeDaNota(valor);
  if (tipo === "binaria") return valor >= 1 ? 4 : 1;
  return classePorQuebras(valor, quebras, menorMelhor);
}

function formatarLimite(valor: number, unidade: string): string {
  const casas = unidade === "km" ? 0 : unidade === "kg/hab.dia" ? 2 : 1;
  return formatarNumero(valor, casas);
}

export function MapaMunicipiosMS({ municipios, notaSaneamento }: Props) {
  const [geoJson, setGeoJson] = useState<GeoJsonCollection | null>(null);
  const [mapError, setMapError] = useState(false);

  const [metrica, setMetrica] = useState<string>(NOTA);
  const [dadosIndicador, setDadosIndicador] = useState<Map<string, DadoMunicipio> | null>(null);
  const [sentidoIndicador, setSentidoIndicador] = useState<SentidoIndicador>("maior_melhor");
  const [anoIndicador, setAnoIndicador] = useState(ANO_METRICA_PREFERIDO);
  const [carregandoMetrica, setCarregandoMetrica] = useState(false);

  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ codigo: string; x: number; y: number } | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null>(null);

  const anoNota = notaSaneamento[0]?.ano ?? ANO_METRICA_PREFERIDO;

  useEffect(() => {
    let isMounted = true;
    fetch("/data/ms-municipios.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("map-load-failed");
        return response.json() as Promise<GeoJsonCollection>;
      })
      .then((data) => {
        if (isMounted) setGeoJson(data);
      })
      .catch(() => {
        if (isMounted) setMapError(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (metrica === NOTA) {
      setDadosIndicador(null);
      setSentidoIndicador("maior_melhor");
      return;
    }

    let ativo = true;
    setCarregandoMetrica(true);

    fetch(`${CLIENT_API_BASE_URL}/indicadores/${metrica}/anos`)
      .then((response) => (response.ok ? (response.json() as Promise<number[]>) : Promise.reject()))
      .then((anos) => {
        const ano = anos.includes(ANO_METRICA_PREFERIDO) ? ANO_METRICA_PREFERIDO : (anos[0] ?? null);
        if (ano === null) return [] as RankingItem[];
        setAnoIndicador(ano);
        return fetch(`${CLIENT_API_BASE_URL}/ranking?indicador=${metrica}&ano=${ano}&limit=200`).then((response) =>
          response.ok ? (response.json() as Promise<RankingItem[]>) : Promise.reject()
        );
      })
      .then((itens) => {
        if (!ativo) return;
        const mapa = new Map<string, DadoMunicipio>();
        for (const item of itens) {
          if (item.valor !== null) mapa.set(item.codigo_ibge, { valor: item.valor, posicao: item.posicao });
        }
        setDadosIndicador(mapa);
        // O sentido vem da própria API (Indicador.sentido), fonte única da direção.
        setSentidoIndicador(itens[0]?.sentido ?? "maior_melhor");
      })
      .catch(() => {
        if (ativo) setDadosIndicador(new Map());
      })
      .finally(() => {
        if (ativo) setCarregandoMetrica(false);
      });

    return () => {
      ativo = false;
    };
  }, [metrica]);

  const municipiosByCode = useMemo(() => new Map(municipios.map((municipio) => [municipio.codigo_ibge, municipio])), [municipios]);
  const municipiosOrdenados = useMemo(() => [...municipios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [municipios]);
  const notaPorCodigo = useMemo(() => new Map(notaSaneamento.map((item) => [item.codigo_ibge, item])), [notaSaneamento]);

  const metricaAtual = METRICAS.find((item) => item.codigo === metrica) ?? METRICAS[0];
  const ehNota = metrica === NOTA;
  const ehBinaria = ehUnidadeBinaria(metricaAtual.unidade);
  const menorMelhor = sentidoIndicador === "menor_melhor";
  const anoMetrica = ehNota ? anoNota : anoIndicador;

  const dados = useMemo<Map<string, DadoMunicipio>>(() => {
    if (ehNota) {
      return new Map(notaSaneamento.map((item) => [item.codigo_ibge, { valor: item.nota, posicao: item.posicao }]));
    }
    return dadosIndicador ?? new Map();
  }, [ehNota, notaSaneamento, dadosIndicador]);

  const quebras = useMemo(() => {
    const tipo = tipoEscala(metrica);
    return tipo === "quintil" ? quebrasPorQuintil(Array.from(dados.values(), (item) => item.valor)) : [];
  }, [dados, metrica]);

  const selectedCode =
    chosenCode ?? municipiosByCode.get(FALLBACK_CODE)?.codigo_ibge ?? municipiosOrdenados[0]?.codigo_ibge ?? null;
  const selectedMunicipio = selectedCode ? municipiosByCode.get(selectedCode) : null;
  const selectedNota = selectedCode ? notaPorCodigo.get(selectedCode) : undefined;
  const selectedDado = selectedCode ? dados.get(selectedCode) : undefined;

  const paths = useMemo<MapPath[]>(() => {
    if (!geoJson) return [];
    const bounds = getBounds(geoJson.features);
    if (!bounds) return [];
    const project = createProjector(bounds, SVG_WIDTH, SVG_HEIGHT, MAP_PADDING);

    return geoJson.features
      .map((feature) => {
        const codigo = feature.properties.codarea ?? "";
        return {
          codigo,
          nome: municipiosByCode.get(codigo)?.nome ?? codigo,
          path: geometryToPath(feature.geometry, project),
          classe: classeDoValor(dados.get(codigo)?.valor ?? null, tipoEscala(metrica), quebras, sentidoIndicador === "menor_melhor")
        };
      })
      .filter((feature) => feature.codigo && feature.path);
  }, [geoJson, municipiosByCode, dados, quebras, metrica, sentidoIndicador]);

  const selectedPath = paths.find((item) => item.codigo === selectedCode) ?? null;

  function ajustarZoom(fator: number) {
    setScale((atual) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, atual * fator)));
  }

  function resetarZoom() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  const vbW = SVG_WIDTH / scale;
  const vbH = SVG_HEIGHT / scale;
  const maxPanX = Math.max(0, (SVG_WIDTH - vbW) / 2);
  const maxPanY = Math.max(0, (SVG_HEIGHT - vbH) / 2);
  const panX = Math.min(maxPanX, Math.max(-maxPanX, pan.x));
  const panY = Math.min(maxPanY, Math.max(-maxPanY, pan.y));
  const vbX = (SVG_WIDTH - vbW) / 2 + panX;
  const vbY = (SVG_HEIGHT - vbH) / 2 + panY;

  function codigoDoAlvo(target: EventTarget | null): string | null {
    return target instanceof SVGPathElement ? (target.dataset.codigo ?? null) : null;
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    dragState.current = { startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragState.current;
    const rect = event.currentTarget.getBoundingClientRect();

    // Em zoom 1x não há para onde arrastar: tremores de mão não podem cancelar o clique.
    const podeArrastar = maxPanX > 0 || maxPanY > 0;

    if (drag && event.buttons === 1 && podeArrastar) {
      const deltaXpx = event.clientX - drag.lastX;
      const deltaYpx = event.clientY - drag.lastY;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) {
        drag.moved = true;
        setPan((atual) => ({ x: atual.x - deltaXpx * (vbW / rect.width), y: atual.y - deltaYpx * (vbH / rect.height) }));
      }
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }

    const codigo = codigoDoAlvo(event.target);
    setTooltip(codigo ? { codigo, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragState.current;
    if (drag && !drag.moved) {
      const codigo = codigoDoAlvo(event.target);
      if (codigo) setChosenCode(codigo);
    }
    dragState.current = null;
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    ajustarZoom(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  }

  const tooltipPath = tooltip ? paths.find((item) => item.codigo === tooltip.codigo) : null;
  const tooltipDado = tooltip ? dados.get(tooltip.codigo) : undefined;

  const legenda: { rotulo: string; classe: ClasseEscala }[] = ehNota
    ? [
        { rotulo: `0–${LIMITES_NOTA[0]}`, classe: 1 },
        { rotulo: `${LIMITES_NOTA[0]}–${LIMITES_NOTA[1]}`, classe: 2 },
        { rotulo: `${LIMITES_NOTA[1]}–${LIMITES_NOTA[2]}`, classe: 3 },
        { rotulo: `${LIMITES_NOTA[2]}–${LIMITES_NOTA[3]}`, classe: 4 },
        { rotulo: `${LIMITES_NOTA[3]}–100`, classe: 5 }
      ]
    : ehBinaria
      ? [
          { rotulo: "Não", classe: 1 },
          { rotulo: "Sim", classe: 4 }
        ]
      : quebras.length === 4
        ? [0, 1, 2, 3, 4].map((indice) => {
            const inicio = indice === 0 ? "até" : formatarLimite(quebras[indice - 1], metricaAtual.unidade);
            const fim = indice === 4 ? "ou mais" : formatarLimite(quebras[indice], metricaAtual.unidade);
            const rotulo = indice === 0 ? `${inicio} ${fim}` : indice === 4 ? `${inicio} ${fim}` : `${inicio}–${fim}`;
            const classe = (menorMelhor ? 5 - indice : indice + 1) as ClasseEscala;
            return { rotulo, classe };
          })
        : [];

  if (municipios.length === 0) {
    return <div className="rounded-md border border-ms-line bg-ms-surface p-5 text-sm text-ms-muted">Nenhum município encontrado na API.</div>;
  }

  return (
    <div className="overflow-hidden rounded-md border border-ms-line bg-ms-surface">
      <div className="grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="grid content-start gap-5 border-b border-ms-line p-5 lg:border-b-0 lg:border-r">
          <Field label="Colorir mapa por" htmlFor="metrica-mapa-select" hint={`Referência ${anoMetrica}${menorMelhor && !ehNota ? " · menor é melhor" : ""}`}>
            <select id="metrica-mapa-select" value={metrica} onChange={(event) => setMetrica(event.target.value)} className={campoClasses}>
              {METRICAS.map((item) => (
                <option key={item.codigo} value={item.codigo}>
                  {item.nome}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Município" htmlFor="municipio-map-select">
            <select
              id="municipio-map-select"
              value={selectedCode ?? ""}
              onChange={(event) => setChosenCode(event.target.value)}
              className={campoClasses}
            >
              {municipiosOrdenados.map((municipio) => (
                <option key={municipio.codigo_ibge} value={municipio.codigo_ibge}>
                  {municipio.nome}
                </option>
              ))}
            </select>
          </Field>

          {selectedMunicipio ? (
            <div className="grid gap-4 border-t border-ms-line pt-5" aria-live="polite">
              <div>
                <p className="t-h3 text-ms-ink">{selectedMunicipio.nome}</p>
                <p className="mt-0.5 text-sm text-ms-muted">
                  Código IBGE <span className="font-data">{selectedMunicipio.codigo_ibge}</span>
                  {selectedMunicipio.populacao ? (
                    <>
                      {" · "}
                      <span className="font-data">{formatarPopulacao(selectedMunicipio.populacao)}</span> hab.
                    </>
                  ) : null}
                </p>
              </div>

              {selectedNota ? (
                <div>
                  <p className="flex items-baseline gap-2">
                    <span className="t-data-lg text-ms-ink">{formatarNota(selectedNota.nota)}</span>
                    <span className="text-sm text-ms-muted">
                      nota geral {selectedNota.ano} · {selectedNota.posicao}º de {notaSaneamento.length}
                    </span>
                  </p>
                  <ul className="mt-3 grid gap-2">
                    {TEMA_ORDEM.map((tema) => {
                      const config = temaConfig(tema);
                      const Icon = config.icon;
                      const nota = notaDoModulo(selectedNota, tema);
                      return (
                        <li key={tema} className="grid grid-cols-[1.25rem_5.5rem_1fr_2.75rem] items-center gap-2 text-sm">
                          <Icon className={`h-4 w-4 ${config.textClass}`} strokeWidth={1.75} aria-hidden="true" />
                          <span className="text-ms-ink">{config.nomeCurto}</span>
                          <ScoreBar valor={nota} cor={config.cor} className="w-full" />
                          <span className="font-data text-right text-ms-ink">{formatarNota(nota)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-ms-muted">Sem nota geral oficial em {anoNota}.</p>
              )}

              {!ehNota ? (
                <p className="text-sm text-ms-muted">
                  {metricaAtual.nome} ({anoMetrica}):{" "}
                  <span className="font-semibold text-ms-ink">
                    {selectedDado ? textoValor(selectedDado.valor, metricaAtual) : "sem dado oficial"}
                  </span>
                </p>
              ) : null}

              <ButtonLink href={`/municipios/${selectedMunicipio.codigo_ibge}`} variante="primary" className="w-full">
                Abrir ficha de {selectedMunicipio.nome}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </ButtonLink>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 bg-ms-surface-muted p-4 md:p-5">
          <div className="relative overflow-hidden rounded-md">
            {mapError ? (
              <p className="flex min-h-[20rem] items-center justify-center px-4 text-sm text-ms-muted">Não foi possível carregar o mapa.</p>
            ) : paths.length === 0 ? (
              <p className="flex min-h-[20rem] items-center justify-center px-4 text-sm text-ms-muted" role="status">
                Carregando mapa de MS…
              </p>
            ) : (
              <>
                <svg
                  role="img"
                  aria-label={`Mapa dos municípios de Mato Grosso do Sul colorido por ${metricaAtual.nome.toLocaleLowerCase("pt-BR")}, ${anoMetrica}. Use o seletor de município para escolher pelo teclado.`}
                  viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                  className="block h-auto max-h-[34rem] w-full touch-none"
                  preserveAspectRatio="xMidYMid meet"
                  onWheel={handleWheel}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={() => {
                    setTooltip(null);
                    dragState.current = null;
                  }}
                >
                  <defs>
                    <pattern id="mapa-hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="6" height="6" fill="var(--seq-nodata-bg)" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="var(--seq-nodata-line)" strokeWidth="1.6" />
                    </pattern>
                  </defs>
                  {paths.map((mapPath) => (
                    <path
                      key={mapPath.codigo}
                      data-codigo={mapPath.codigo}
                      d={mapPath.path}
                      fill={mapPath.classe ? COR_CLASSE[mapPath.classe] : "url(#mapa-hachura)"}
                      stroke="var(--color-surface)"
                      strokeWidth={0.8}
                      strokeLinejoin="round"
                      tabIndex={-1}
                      className="cursor-pointer"
                    />
                  ))}
                  {selectedPath ? (
                    <path
                      d={selectedPath.path}
                      fill="none"
                      stroke="var(--color-ink)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  ) : null}
                </svg>

                {tooltip && tooltipPath ? (
                  <div
                    className="pointer-events-none absolute z-10 min-w-44 -translate-x-1/2 -translate-y-full rounded-md border border-ms-line-strong bg-ms-surface px-3 py-2 text-xs text-ms-ink shadow-e2"
                    style={{ left: tooltip.x, top: tooltip.y - 12 }}
                  >
                    <p className="text-[13px] font-semibold">{tooltipPath.nome}</p>
                    <p className="mt-0.5 text-ms-muted">
                      {metricaAtual.nome} · {anoMetrica}
                    </p>
                    {tooltipDado ? (
                      <p className="mt-1">
                        <span className="font-data text-sm font-medium">{textoValor(tooltipDado.valor, metricaAtual)}</span>
                        {tooltipDado.posicao ? <span className="ml-2 text-ms-muted">{tooltipDado.posicao}º de {dados.size}</span> : null}
                      </p>
                    ) : (
                      <p className="mt-1 text-ms-muted">Sem dado oficial</p>
                    )}
                  </div>
                ) : null}

                <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                  <button type="button" onClick={() => ajustarZoom(ZOOM_STEP)} aria-label="Aumentar zoom" className="flex h-10 w-10 items-center justify-center rounded-md border border-ms-line-strong bg-ms-surface text-ms-ink hover:border-ms-blue hover:text-ms-blue">
                    <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => ajustarZoom(1 / ZOOM_STEP)} aria-label="Diminuir zoom" className="flex h-10 w-10 items-center justify-center rounded-md border border-ms-line-strong bg-ms-surface text-ms-ink hover:border-ms-blue hover:text-ms-blue">
                    <Minus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={resetarZoom} aria-label="Redefinir zoom" className="flex h-10 w-10 items-center justify-center rounded-md border border-ms-line-strong bg-ms-surface text-ms-ink hover:border-ms-blue hover:text-ms-blue">
                    <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>

                {carregandoMetrica ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-ms-surface-muted/70 text-sm text-ms-ink" role="status">
                    Carregando indicador…
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-4 grid gap-2">
            <p className="text-xs font-semibold text-ms-ink">
              {metricaAtual.nome} {anoMetrica}
              {ehNota ? " (0–100)" : metricaAtual.unidade && !ehBinaria ? ` (${metricaAtual.unidade})` : ""}
              {!ehNota && !ehBinaria && legenda.length > 0 ? " · classes por quintis" : ""}
            </p>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-xs text-ms-muted">
              {legenda.length > 0 ? (
                <ul className="flex" aria-label="Legenda das classes">
                  {legenda.map((item) => (
                    <li key={item.rotulo} className="grid min-w-14 gap-1 text-center">
                      <span className="block h-3" style={{ background: COR_CLASSE[item.classe] }} aria-hidden="true" />
                      <span className="font-data whitespace-nowrap px-1 text-[11px]">{item.rotulo}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <svg width="14" height="14" aria-hidden="true">
                  <rect width="14" height="14" fill="url(#mapa-hachura)" stroke="var(--seq-nodata-line)" strokeWidth="1" />
                </svg>
                Sem dado oficial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="block h-3.5 w-3.5 border-2 border-ms-ink" aria-hidden="true" />
                Selecionado
              </span>
            </div>
            {menorMelhor && !ehNota && !ehBinaria ? (
              <p className="text-xs text-ms-muted">Escala invertida: a classe mais escura corresponde aos menores valores (melhor desempenho).</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
