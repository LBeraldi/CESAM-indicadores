"use client";

import { ArrowRight, ChevronDown, MapPinned, Minus, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLIENT_API_BASE_URL, type Municipio, type RankingItem, type SentidoIndicador } from "@/lib/api";
import type { RankingSaneamentoItem } from "@/lib/rankingSaneamento";

type Props = {
  municipios: Municipio[];
  notaSaneamento: RankingSaneamentoItem[];
};

type Position = [number, number];
type LinearRing = Position[];
type PolygonCoordinates = LinearRing[];
type MultiPolygonCoordinates = PolygonCoordinates[];

type GeoJsonGeometry =
  | {
      type: "Polygon";
      coordinates: PolygonCoordinates;
    }
  | {
      type: "MultiPolygon";
      coordinates: MultiPolygonCoordinates;
    };

type GeoJsonFeature = {
  type: "Feature";
  properties: {
    codarea?: string;
  };
  geometry: GeoJsonGeometry;
};

type GeoJsonCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type Bounds = {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

type MapPath = {
  codigo: string;
  nome: string;
  path: string;
  valor: number | null;
  fill: string;
};

type Metrica = {
  codigo: string;
  nome: string;
  unidade: string;
  composta?: boolean;
};

const SVG_WIDTH = 860;
const SVG_HEIGHT = 620;
const MAP_PADDING = 34;
const FALLBACK_CODE = "5002704";
const ANO_METRICA = 2023;
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 1.5;
const COR_SEM_DADO = "#3a4a55";

const METRICAS: Metrica[] = [
  { codigo: "nota_saneamento", nome: "Nota geral de saneamento", unidade: "pontos de 0 a 100", composta: true },
  { codigo: "agua_atendimento_total", nome: "Água — atendimento total", unidade: "%" },
  { codigo: "agua_perdas_distribuicao", nome: "Água — perdas na distribuição", unidade: "%" },
  { codigo: "esgoto_atendimento_total", nome: "Esgoto — atendimento total", unidade: "%" },
  { codigo: "esgoto_coleta", nome: "Esgoto — coleta", unidade: "%" },
  { codigo: "esgoto_tratamento", nome: "Esgoto — tratamento", unidade: "%" }
];

const TEXT = {
  title: "Selecione um município para analisar",
  select: "Selecionar município",
  selected: "Município selecionado",
  code: "Código IBGE",
  open: "Abrir ficha",
  listed: "municípios",
  loading: "Carregando mapa de MS...",
  error: "Não foi possível carregar o mapa.",
  noData: "Nenhum município encontrado na API."
};

function featureCoordinates(geometry: GeoJsonGeometry): Position[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons.flatMap((polygon) => polygon.flatMap((ring) => ring));
}

function getBounds(features: GeoJsonFeature[]): Bounds | null {
  const coordinates = features.flatMap((feature) => featureCoordinates(feature.geometry));

  if (coordinates.length === 0) {
    return null;
  }

  return coordinates.reduce<Bounds>(
    (bounds, [lon, lat]) => ({
      minLon: Math.min(bounds.minLon, lon),
      maxLon: Math.max(bounds.maxLon, lon),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat)
    }),
    {
      minLon: Number.POSITIVE_INFINITY,
      maxLon: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY
    }
  );
}

function createProjector(bounds: Bounds) {
  const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.000001);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.000001);
  const scale = Math.min((SVG_WIDTH - MAP_PADDING * 2) / lonSpan, (SVG_HEIGHT - MAP_PADDING * 2) / latSpan);
  const mapWidth = lonSpan * scale;
  const mapHeight = latSpan * scale;
  const offsetX = (SVG_WIDTH - mapWidth) / 2;
  const offsetY = (SVG_HEIGHT - mapHeight) / 2;

  return ([lon, lat]: Position) => {
    const x = offsetX + (lon - bounds.minLon) * scale;
    const y = offsetY + (bounds.maxLat - lat) * scale;

    return [x, y] as const;
  };
}

function formatCoordinate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "0";
}

function ringToPath(ring: LinearRing, project: ReturnType<typeof createProjector>): string {
  const points = ring.map(project);
  const [firstPoint, ...nextPoints] = points;

  if (!firstPoint) {
    return "";
  }

  const start = `M ${formatCoordinate(firstPoint[0])} ${formatCoordinate(firstPoint[1])}`;
  const lines = nextPoints.map(([x, y]) => `L ${formatCoordinate(x)} ${formatCoordinate(y)}`);

  return `${start} ${lines.join(" ")} Z`;
}

function geometryToPath(geometry: GeoJsonGeometry, project: ReturnType<typeof createProjector>): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons.flatMap((polygon) => polygon.map((ring) => ringToPath(ring, project))).join(" ");
}

function hexParaRgb(hex: string): [number, number, number] {
  const valor = hex.replace("#", "");
  return [
    Number.parseInt(valor.slice(0, 2), 16),
    Number.parseInt(valor.slice(2, 4), 16),
    Number.parseInt(valor.slice(4, 6), 16)
  ];
}

function misturarCores(corA: string, corB: string, fracao: number): string {
  const [r1, g1, b1] = hexParaRgb(corA);
  const [r2, g2, b2] = hexParaRgb(corB);
  const r = Math.round(r1 + (r2 - r1) * fracao);
  const g = Math.round(g1 + (g2 - g1) * fracao);
  const b = Math.round(b1 + (b2 - b1) * fracao);
  return `rgb(${r}, ${g}, ${b})`;
}

// Rampa sequencial de matiz único (claro -> escuro), como recomendado para
// representar magnitude: nunca um arco-íris arbitrário.
const RAMPA_SEQUENCIAL = ["#eaf6f2", "#7fc4ae", "#0b4a3c"];

function corSequencial(t: number): string {
  const posicao = Math.min(0.999, Math.max(0, t)) * (RAMPA_SEQUENCIAL.length - 1);
  const indice = Math.floor(posicao);
  const fracao = posicao - indice;
  return misturarCores(RAMPA_SEQUENCIAL[indice], RAMPA_SEQUENCIAL[indice + 1], fracao);
}

function formatarValor(valor: number, unidade: string): string {
  const numero = valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return unidade.startsWith("%") ? `${numero}%` : `${numero} ${unidade}`;
}

export function MapaMunicipiosMS({ municipios, notaSaneamento }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [geoJson, setGeoJson] = useState<GeoJsonCollection | null>(null);
  const [mapError, setMapError] = useState(false);

  const [metrica, setMetrica] = useState<string>("nota_saneamento");
  const [valoresIndicador, setValoresIndicador] = useState<Map<string, number> | null>(null);
  const [sentidoIndicador, setSentidoIndicador] = useState<SentidoIndicador>("maior_melhor");
  const [carregandoMetrica, setCarregandoMetrica] = useState(false);

  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const [hoverCode, setHoverCode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ codigo: string; x: number; y: number } | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    fetch("/data/ms-municipios.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("map-load-failed");
        }

        return response.json() as Promise<GeoJsonCollection>;
      })
      .then((data) => {
        if (isMounted) {
          setGeoJson(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setMapError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (metrica === "nota_saneamento") {
      setValoresIndicador(null);
      setSentidoIndicador("maior_melhor");
      return;
    }

    let ativo = true;
    setCarregandoMetrica(true);

    fetch(`${CLIENT_API_BASE_URL}/ranking?indicador=${metrica}&ano=${ANO_METRICA}&limit=200`)
      .then((response) => (response.ok ? (response.json() as Promise<RankingItem[]>) : Promise.reject()))
      .then((itens) => {
        if (!ativo) {
          return;
        }
        const mapa = new Map<string, number>();
        for (const item of itens) {
          if (item.valor !== null) {
            mapa.set(item.codigo_ibge, item.valor);
          }
        }
        setValoresIndicador(mapa);
        // O sentido vem da própria API (Indicador.sentido), não de uma lista
        // fixa no frontend — assim um indicador novo nunca fica com a
        // direção errada por falta de atualização em dois lugares.
        setSentidoIndicador(itens[0]?.sentido ?? "maior_melhor");
      })
      .catch(() => {
        if (ativo) {
          setValoresIndicador(new Map());
        }
      })
      .finally(() => {
        if (ativo) {
          setCarregandoMetrica(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [metrica]);

  const municipiosByCode = useMemo(
    () => new Map(municipios.map((municipio) => [municipio.codigo_ibge, municipio])),
    [municipios]
  );

  const municipiosOrdenados = useMemo(
    () => [...municipios].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [municipios]
  );

  const metricaAtual = METRICAS.find((item) => item.codigo === metrica) ?? METRICAS[0];
  const menorMelhor = sentidoIndicador === "menor_melhor";

  const valoresPorCodigo = useMemo(() => {
    if (metrica === "nota_saneamento") {
      return new Map(notaSaneamento.map((item) => [item.codigo_ibge, item.nota]));
    }
    return valoresIndicador ?? new Map<string, number>();
  }, [metrica, notaSaneamento, valoresIndicador]);

  const { min, max } = useMemo(() => {
    const valores = Array.from(valoresPorCodigo.values());
    if (valores.length === 0) {
      return { min: 0, max: 100 };
    }
    return { min: Math.min(...valores), max: Math.max(...valores) };
  }, [valoresPorCodigo]);

  const selectedCode = chosenCode ?? municipiosByCode.get(FALLBACK_CODE)?.codigo_ibge ?? municipiosOrdenados[0]?.codigo_ibge ?? null;
  const selectedMunicipio = selectedCode ? municipiosByCode.get(selectedCode) : null;
  const highlightCode = hoverCode ?? selectedCode;

  const paths = useMemo<MapPath[]>(() => {
    if (!geoJson) {
      return [];
    }

    const bounds = getBounds(geoJson.features);
    if (!bounds) {
      return [];
    }

    const project = createProjector(bounds);

    return geoJson.features
      .map((feature) => {
        const codigo = feature.properties.codarea ?? "";
        const municipio = municipiosByCode.get(codigo);
        const valor = valoresPorCodigo.get(codigo) ?? null;
        const t = valor === null ? null : max === min ? 0.5 : (valor - min) / (max - min);

        return {
          codigo,
          nome: municipio?.nome ?? codigo,
          path: geometryToPath(feature.geometry, project),
          valor,
          fill: t === null ? COR_SEM_DADO : corSequencial(t)
        };
      })
      .filter((feature) => feature.codigo && feature.path);
  }, [geoJson, municipiosByCode, valoresPorCodigo, min, max]);

  function navigateToMunicipio(code: string) {
    if (code) {
      router.push(`/municipios/${code}`);
    }
  }

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
    if (target instanceof SVGPathElement) {
      return target.dataset.codigo ?? null;
    }
    return null;
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    dragState.current = { startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false };
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragState.current;
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();

    // Em zoom 1x não há para onde arrastar (maxPanX/Y = 0): tratar qualquer
    // deslocamento pequeno como pan cancelava cliques por tremor de mão ou
    // trackpad, mesmo sem nenhum movimento visível no mapa. Só engata o
    // gesto de arraste quando o zoom realmente permite mover a viewBox.
    const podeArrastar = maxPanX > 0 || maxPanY > 0;

    if (drag && event.buttons === 1 && podeArrastar) {
      const deltaXpx = event.clientX - drag.lastX;
      const deltaYpx = event.clientY - drag.lastY;
      const distFromStart = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distFromStart > 4) {
        drag.moved = true;
        setPan((atual) => ({
          x: atual.x - deltaXpx * (vbW / rect.width),
          y: atual.y - deltaYpx * (vbH / rect.height)
        }));
      }
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      return;
    }

    const codigo = codigoDoAlvo(event.target);
    if (codigo) {
      setHoverCode(codigo);
      setTooltip({ codigo, x: event.clientX - rect.left, y: event.clientY - rect.top });
    } else {
      setHoverCode(null);
      setTooltip(null);
    }
  }

  function handlePointerUp(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragState.current;
    if (drag && !drag.moved) {
      const codigo = codigoDoAlvo(event.target);
      if (codigo) {
        navigateToMunicipio(codigo);
      }
    }
    dragState.current = null;
  }

  function handlePointerLeave() {
    setHoverCode(null);
    setTooltip(null);
    dragState.current = null;
  }

  function handleWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    ajustarZoom(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  }

  const tooltipMunicipio = tooltip ? paths.find((item) => item.codigo === tooltip.codigo) : null;

  if (municipios.length === 0) {
    return (
      <div className="mt-8 rounded-md border border-ms-line bg-white p-5 text-sm text-slate-600">
        {TEXT.noData}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-ms-line bg-white shadow-soft">
      <div className="grid lg:grid-cols-[20rem_1fr]">
        <aside className="border-b border-white/15 bg-ms-navy p-5 text-white lg:border-b-0 lg:border-r">
          <label className="block text-sm font-semibold" htmlFor="municipio-map-select">
            {TEXT.select}
          </label>
          <div className="relative mt-3">
            <select
              id="municipio-map-select"
              value={selectedCode ?? ""}
              onChange={(event) => setChosenCode(event.target.value)}
              className="h-11 w-full appearance-none rounded-md border border-white/20 bg-white px-3 pr-10 text-base font-medium text-ms-ink outline-none ring-white/20 focus:ring-4 md:text-sm"
            >
              {municipiosOrdenados.map((municipio) => (
                <option key={municipio.codigo_ibge} value={municipio.codigo_ibge}>
                  {municipio.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>

          <div className="mt-5 rounded-md border border-white/15 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <MapPinned className="h-4 w-4" />
              <span>{TEXT.selected}</span>
            </div>
            <p className="mt-3 text-xl font-semibold">{selectedMunicipio?.nome ?? "-"}</p>
            <p className="mt-1 text-sm text-white/75">
              {TEXT.code}: {selectedMunicipio?.codigo_ibge ?? "-"}
            </p>
            {selectedCode && valoresPorCodigo.has(selectedCode) ? (
              <p className="mt-2 text-sm text-white/90">
                {metricaAtual.nome}:{" "}
                <span className="font-semibold">
                  {formatarValor(valoresPorCodigo.get(selectedCode) as number, metricaAtual.unidade)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-white/60">Sem dado para {metricaAtual.nome.toLowerCase()}.</p>
            )}
          </div>

          {selectedMunicipio ? (
            <Link
              href={`/municipios/${selectedMunicipio.codigo_ibge}`}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ms-green px-4 text-sm font-semibold text-white hover:bg-[#125f48]"
            >
              {TEXT.open}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}

          <div className="mt-6 border-t border-white/15 pt-5">
            <label className="block text-sm font-semibold" htmlFor="metrica-mapa-select">
              Colorir mapa por
            </label>
            <select
              id="metrica-mapa-select"
              value={metrica}
              onChange={(event) => setMetrica(event.target.value)}
              className="mt-3 h-11 w-full appearance-none rounded-md border border-white/20 bg-white px-3 text-base font-medium text-ms-ink outline-none ring-white/20 focus:ring-4 md:text-sm"
            >
              {METRICAS.map((item) => (
                <option key={item.codigo} value={item.codigo}>
                  {item.nome}
                </option>
              ))}
            </select>
            {menorMelhor ? <p className="mt-2 text-xs text-white/60">Quanto menor, melhor.</p> : null}
          </div>
        </aside>

        <div className="bg-[#0d3769] p-4 text-white md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold md:text-lg">{TEXT.title}</h3>
            <span className="text-sm text-white/75">
              {municipios.length} {TEXT.listed}
            </span>
          </div>

          <div
            ref={containerRef}
            className="relative mt-4 min-h-[27rem] overflow-hidden rounded-md border border-white/15 bg-[#082d59]"
          >
            {mapError ? (
              <p className="flex min-h-[26rem] items-center justify-center px-4 text-sm text-white/80">{TEXT.error}</p>
            ) : paths.length === 0 ? (
              <p className="flex min-h-[26rem] items-center justify-center px-4 text-sm text-white/80">{TEXT.loading}</p>
            ) : (
              <>
                <svg
                  aria-label="Mapa interativo dos municípios de Mato Grosso do Sul, colorido pela métrica selecionada"
                  viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                  className="h-full min-h-[26rem] w-full touch-none"
                  preserveAspectRatio="xMidYMid meet"
                  onWheel={handleWheel}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                >
                  {paths.map((mapPath) => {
                    const isActive = highlightCode === mapPath.codigo;

                    return (
                      <path
                        key={mapPath.codigo}
                        data-codigo={mapPath.codigo}
                        d={mapPath.path}
                        fill={mapPath.fill}
                        stroke={isActive ? "#7dd3fc" : "#ffffff"}
                        strokeLinejoin="round"
                        strokeWidth={isActive ? 2.6 : 1.05}
                        role="button"
                        tabIndex={0}
                        aria-label={`${mapPath.nome}${
                          mapPath.valor !== null ? `, ${formatarValor(mapPath.valor, metricaAtual.unidade)}` : ", sem dado"
                        }`}
                        onFocus={() => setHoverCode(mapPath.codigo)}
                        onBlur={() => setHoverCode(null)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigateToMunicipio(mapPath.codigo);
                          }
                        }}
                        className="cursor-pointer transition-colors duration-150 focus-visible:outline-none"
                      />
                    );
                  })}
                </svg>

                {tooltip && tooltipMunicipio ? (
                  <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-white px-3 py-2 text-xs text-ms-ink shadow-soft"
                    style={{ left: tooltip.x, top: tooltip.y - 10 }}
                  >
                    <p className="font-semibold">{tooltipMunicipio.nome}</p>
                    <p className="mt-0.5 text-ms-muted">
                      {tooltipMunicipio.valor !== null
                        ? `${metricaAtual.nome}: ${formatarValor(tooltipMunicipio.valor, metricaAtual.unidade)}`
                        : "Sem dado disponível"}
                    </p>
                  </div>
                ) : null}

                <div className="absolute right-3 top-3 flex flex-col gap-2 sm:gap-1.5">
                  <button
                    type="button"
                    onClick={() => ajustarZoom(ZOOM_STEP)}
                    aria-label="Aumentar zoom"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:h-8 sm:w-8"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => ajustarZoom(1 / ZOOM_STEP)}
                    aria-label="Diminuir zoom"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:h-8 sm:w-8"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={resetarZoom}
                    aria-label="Redefinir zoom"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white hover:bg-white/20 sm:h-8 sm:w-8"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {carregandoMetrica ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#082d59]/60 text-sm text-white">
                    Carregando indicador...
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 sm:justify-start">
              <span className="shrink-0 text-xs text-white/75">{formatarValor(min, metricaAtual.unidade)}</span>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <div
                  className="h-2.5 w-28 rounded-full sm:w-40"
                  style={{ background: `linear-gradient(90deg, ${RAMPA_SEQUENCIAL.join(", ")})` }}
                  aria-hidden="true"
                />
                <span className="max-w-[9rem] text-center text-[0.65rem] font-semibold uppercase tracking-wide text-white/70 sm:max-w-none">
                  {menorMelhor ? "Claro = melhor · Escuro = pior" : "Claro = pior · Escuro = melhor"}
                </span>
              </div>
              <span className="shrink-0 text-xs text-white/75">{formatarValor(max, metricaAtual.unidade)}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-white/60">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COR_SEM_DADO }} aria-hidden="true" />
              Sem dado disponível
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
