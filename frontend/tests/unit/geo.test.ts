import { describe, expect, it } from "vitest";
import { createProjector, featureCoordinates, geometryToPath, getBounds, type GeoJsonFeature } from "@/lib/geo";

describe("geometria do mapa", () => {
  it("calcula limites para Polygon e MultiPolygon", () => {
    const features: GeoJsonFeature[] = [
      { properties: { codarea: "1" }, geometry: { type: "Polygon", coordinates: [[[1, 2], [3, 4], [1, 2]]] } },
      { properties: { codarea: "2" }, geometry: { type: "MultiPolygon", coordinates: [[[[5, 6], [7, 8], [5, 6]]]] } },
    ];
    expect(featureCoordinates(features[0].geometry)).toHaveLength(3);
    expect(getBounds(features)).toEqual({ minLon: 1, maxLon: 7, minLat: 2, maxLat: 8 });
  });

  it("projeta coordenadas e gera path SVG fechado", () => {
    const project = createProjector({ minLon: 0, maxLon: 10, minLat: 0, maxLat: 10 }, 100, 100, 10);
    expect(project([0, 10])).toEqual([10, 10]);
    expect(geometryToPath({ type: "Polygon", coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] }, project)).toMatch(/^M .* Z$/);
  });

  it("retorna null para uma coleção sem coordenadas", () => {
    expect(getBounds([])).toBeNull();
  });
});
