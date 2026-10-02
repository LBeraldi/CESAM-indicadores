"use client";

import { useEffect, useMemo, useState } from "react";
import { COR_CLASSE, classeDaNota } from "@/lib/escalaMapa";
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

type Props = {
  codigoIbge: string;
  municipio: string;
  /** Nota geral por código IBGE: pinta os municípios pela classe DS-05 (PG-03.12). */
  notas?: Record<string, number>;
  className?: string;
};

type EstadoMapa = "loading" | "ready" | "error";

function corDoMunicipio(codigo: string, notas: Record<string, number> | undefined): string {
  if (!notas) return "var(--color-line)";
  const classe = classeDaNota(notas[codigo]);
  return classe ? COR_CLASSE[classe] : "var(--seq-nodata-bg)";
}

export function MiniMapaMunicipio({ codigoIbge, municipio, notas, className }: Props) {
  const [features, setFeatures] = useState<GeoJsonFeature[]>([]);
  const [estado, setEstado] = useState<EstadoMapa>("loading");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/data/ms-municipios.geojson", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Falha ao carregar mapa: ${response.status}`);
        return response.json() as Promise<GeoJsonCollection>;
      })
      .then((collection) => {
        setFeatures(collection.features);
        setEstado("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEstado("error");
      });

    return () => controller.abort();
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

  if (estado === "error") {
    return (
      <div className={className ?? "flex h-28 w-full items-center justify-center text-sm text-ms-muted"} role="status">
        <span className="text-xs text-ms-muted">Mapa indisponível.</span>
      </div>
    );
  }

  return desenho ? (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className ?? "block h-28 w-full"}
      role="img"
      aria-label={`Mapa de Mato Grosso do Sul com ${municipio} destacado`}
    >
      {desenho.paths.map((path) => (
        <path
          key={path.codigo}
          d={path.d}
          fill={notas ? corDoMunicipio(path.codigo, notas) : path.codigo === codigoIbge ? "var(--seq-4)" : "var(--color-line)"}
          stroke="var(--color-surface)"
          strokeWidth={0.6}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {selecionado ? (
        <path d={selecionado.d} fill="none" stroke="var(--color-ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ) : null}
    </svg>
  ) : (
    <div className={className ?? "flex h-28 w-full items-center justify-center text-sm text-ms-muted"} role="status">
      <span className="text-xs text-ms-muted">Carregando mapa…</span>
    </div>
  );
}
