"use client";

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
    return {
      paths: features.map((feature) => ({
        codigo: String(feature.properties.codarea ?? ""),
        d: geometryToPath(feature.geometry, project)
      })),
      possuiMunicipio: pontosSelecionados.length > 0
    };
  }, [codigoIbge, features]);

  const selecionado = desenho?.paths.find((path) => path.codigo === codigoIbge) ?? null;

  return (
    <div className="overflow-hidden rounded-md border border-ms-line bg-ms-surface">
      <div className="border-b border-ms-line px-4 py-3">
        <p className="t-label text-ms-muted">Localização no estado</p>
        <p className="mt-0.5 text-sm font-semibold text-ms-ink">{municipio}, Mato Grosso do Sul</p>
      </div>
      <div className="bg-ms-surface-muted p-2">
        {desenho ? (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mx-auto block h-36 w-full" role="img" aria-label={`Mapa de Mato Grosso do Sul com ${municipio} destacado`}>
            {desenho.paths.map((path) => (
              <path
                key={path.codigo}
                d={path.d}
                fill={path.codigo === codigoIbge ? "var(--seq-4)" : "var(--color-line)"}
                stroke="var(--color-surface)"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {selecionado ? (
              <path d={selecionado.d} fill="none" stroke="var(--color-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            ) : null}
          </svg>
        ) : (
          <div className="flex h-36 w-full items-center justify-center text-sm text-ms-muted" role="status">
            Carregando localização…
          </div>
        )}
      </div>
    </div>
  );
}
