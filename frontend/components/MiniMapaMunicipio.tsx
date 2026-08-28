"use client";

import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createProjector,
  featureCoordinates,
  geometryToPath,
  getBounds,
  type GeoJsonCollection,
  type GeoJsonFeature,
} from "@/lib/geo";

const WIDTH = 360;
const HEIGHT = 270;
const PADDING = 16;

export function MiniMapaMunicipio({ codigoIbge, municipio }: { codigoIbge: string; municipio: string }) {
  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);

  useEffect(() => {
    let ativo = true;
    fetch("/data/ms-municipios.geojson")
      .then((response) => (response.ok ? (response.json() as Promise<GeoJsonCollection>) : Promise.reject()))
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
    const bounds = getBounds(features);
    if (!bounds) return null;
    const project = createProjector(bounds, WIDTH, HEIGHT, PADDING);
    const selecionada = features.find((feature) => String(feature.properties.codarea) === codigoIbge) ?? null;
    const pontosSelecionados = selecionada ? featureCoordinates(selecionada.geometry) : [];
    const boundsSelecionado = selecionada ? getBounds([selecionada]) : null;
    const centro = boundsSelecionado
      ? project([
          (boundsSelecionado.minLon + boundsSelecionado.maxLon) / 2,
          (boundsSelecionado.minLat + boundsSelecionado.maxLat) / 2
        ])
      : null;
    return {
      paths: features.map((feature) => ({
        codigo: String(feature.properties.codarea ?? ""),
        d: geometryToPath(feature.geometry, project)
      })),
      centro,
      possuiMunicipio: pontosSelecionados.length > 0
    };
  }, [codigoIbge, features]);

  return (
    <div className="flex h-full min-h-[17rem] flex-col overflow-hidden rounded-md border border-ms-line bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-ms-line px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ms-green">Localização no estado</p>
          <p className="mt-0.5 text-sm font-semibold text-ms-ink">{municipio}, Mato Grosso do Sul</p>
        </div>
        <MapPin className="h-5 w-5 text-ms-blue" />
      </div>
      <div className="relative flex min-h-0 flex-1 items-center bg-linear-to-br from-ms-sky to-white p-2">
        {desenho ? (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto block h-48 w-full" role="img" aria-label={`Mapa de Mato Grosso do Sul com ${municipio} destacado`}>
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
          <div className="flex h-48 w-full items-center justify-center text-sm text-ms-muted">Carregando localização...</div>
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-ms-line bg-white/95 px-2.5 py-1.5 text-xs font-medium text-ms-muted shadow-sm">
          <span className="h-3 w-3 rounded-sm bg-ms-green" />
          Município selecionado
        </div>
      </div>
    </div>
  );
}
