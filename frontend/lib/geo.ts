export type Position = [number, number];
export type LinearRing = Position[];
export type PolygonCoordinates = LinearRing[];
export type MultiPolygonCoordinates = PolygonCoordinates[];

export type GeoJsonGeometry =
  | { type: "Polygon"; coordinates: PolygonCoordinates }
  | { type: "MultiPolygon"; coordinates: MultiPolygonCoordinates };

export type GeoJsonFeature = {
  type?: "Feature";
  properties: { codarea?: string };
  geometry: GeoJsonGeometry;
};

export type GeoJsonCollection = {
  type?: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type Bounds = { minLon: number; maxLon: number; minLat: number; maxLat: number };
export type Projector = (position: Position) => readonly [number, number];

export function featureCoordinates(geometry: GeoJsonGeometry): Position[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.flatMap((ring) => ring));
}

export function getBounds(features: GeoJsonFeature[]): Bounds | null {
  const coordinates = features.flatMap((feature) => featureCoordinates(feature.geometry));
  if (coordinates.length === 0) return null;
  return coordinates.reduce<Bounds>(
    (bounds, [lon, lat]) => ({
      minLon: Math.min(bounds.minLon, lon),
      maxLon: Math.max(bounds.maxLon, lon),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity },
  );
}

export function createProjector(bounds: Bounds, width: number, height: number, padding: number): Projector {
  const lonSpan = Math.max(bounds.maxLon - bounds.minLon, 0.000001);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.000001);
  const scale = Math.min((width - padding * 2) / lonSpan, (height - padding * 2) / latSpan);
  const offsetX = (width - lonSpan * scale) / 2;
  const offsetY = (height - latSpan * scale) / 2;
  return ([lon, lat]) => [
    offsetX + (lon - bounds.minLon) * scale,
    offsetY + (bounds.maxLat - lat) * scale,
  ];
}

export function geometryToPath(geometry: GeoJsonGeometry, project: Projector): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .flatMap((polygon) =>
      polygon.map((ring) => {
        const points = ring.map(project);
        const [first, ...rest] = points;
        if (!first) return "";
        const start = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
        return `${start} ${rest.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")} Z`;
      }),
    )
    .join(" ");
}
