"use client";

import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Position = [number, number];
type Polygon = Position[][];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };
type Feature = {
  properties: { codarea?: string };
  geometry: Geometry;
};
type Collection = { features: Feature[] };
type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };

const WIDTH = 360;
const HEIGHT = 270;
const PADDING = 16;

function posicoes(feature: Feature): Position[] {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.flatMap((ring) => ring));
}

function limites(features: Feature[]): Bounds | null {
  const pontos = features.flatMap(posicoes);
  if (!pontos.length) return null;
  return pontos.reduce<Bounds>(
    (acc, [lon, lat]) => ({
      minLon: Math.min(acc.minLon, lon),
      maxLon: Math.max(acc.maxLon, lon),
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat)
    }),
    { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }
  );
}

function projetor(bounds: Bounds) {
  const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.000001);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.000001);
  const scale = Math.min((WIDTH - PADDING * 2) / lonSpan, (HEIGHT - PADDING * 2) / latSpan);
  const offsetX = (WIDTH - lonSpan * scale) / 2;
  const offsetY = (HEIGHT - latSpan * scale) / 2;
  return ([lon, lat]: Position): Position => [
    offsetX + (lon - bounds.minLon) * scale,
    offsetY + (bounds.maxLat - lat) * scale
  ];
}

function caminho(feature: Feature, project: (position: Position) => Position): string {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return polygons
    .flatMap((polygon) =>
      polygon.map((ring) =>
        ring.map((position, index) => {
          const [x, y] = project(position);
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(" ") + " Z"
      )
    )
    .join(" ");
}

export function MiniMapaMunicipio({ codigoIbge, municipio }: { codigoIbge: string; municipio: string }) {
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    let ativo = true;
    fetch("/data/ms-municipios.geojson")
      .then((response) => (response.ok ? (response.json() as Promise<Collection>) : Promise.reject()))
      .then((collection) => {
        if (ativo) setFeatures(collection.features);
      })
      .catch(() => {
        if (ativo) setFeatures([]);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const desenho = useMemo(() => {
    const bounds = limites(features);
    if (!bounds) return null;
    const project = projetor(bounds);
    const selecionada = features.find((feature) => String(feature.properties.codarea) === codigoIbge) ?? null;
    const pontosSelecionados = selecionada ? posicoes(selecionada) : [];
    const boundsSelecionado = selecionada ? limites([selecionada]) : null;
    const centro = boundsSelecionado
      ? project([
          (boundsSelecionado.minLon + boundsSelecionado.maxLon) / 2,
          (boundsSelecionado.minLat + boundsSelecionado.maxLat) / 2
        ])
      : null;
    return {
      paths: features.map((feature) => ({
        codigo: String(feature.properties.codarea ?? ""),
        d: caminho(feature, project)
      })),
      centro,
      possuiMunicipio: pontosSelecionados.length > 0
    };
  }, [codigoIbge, features]);

  return (
    <div className="overflow-hidden rounded-md border border-ms-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ms-line px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ms-green">Localização no estado</p>
          <p className="mt-0.5 text-sm font-semibold text-ms-ink">{municipio}, Mato Grosso do Sul</p>
        </div>
        <MapPin className="h-5 w-5 text-ms-blue" />
      </div>
      <div className="relative bg-gradient-to-br from-ms-sky to-white p-2">
        {desenho ? (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto block h-52 w-full" role="img" aria-label={`Mapa de Mato Grosso do Sul com ${municipio} destacado`}>
            {desenho.paths.map((path) => {
              const selecionado = path.codigo === codigoIbge;
              return (
                <path
                  key={path.codigo}
                  d={path.d}
                  fill={selecionado ? "#18765a" : "#d8e6f1"}
                  stroke={selecionado ? "#0c2d57" : "#ffffff"}
                  strokeWidth={selecionado ? 2.2 : 0.8}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
            {desenho.centro ? (
              <g transform={`translate(${desenho.centro[0]} ${desenho.centro[1]})`}>
                <circle r="8" fill="#ffffff" stroke="#0c2d57" strokeWidth="2" />
                <circle r="3.5" fill="#1f5f9f" />
              </g>
            ) : null}
          </svg>
        ) : (
          <div className="flex h-52 items-center justify-center text-sm text-ms-muted">Carregando localização...</div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-ms-line bg-white/95 px-2.5 py-1.5 text-xs font-medium text-ms-muted shadow-sm">
          <span className="h-3 w-3 rounded-sm bg-ms-green" />
          Município selecionado
        </div>
      </div>
    </div>
  );
}
