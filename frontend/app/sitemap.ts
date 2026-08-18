import type { MetadataRoute } from "next";
import { fetchApiSafe, type Municipio } from "@/lib/api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const municipios = await fetchApiSafe<Municipio[]>("/municipios", []);

  const paginasPrincipais: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/municipios`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/ranking`, changeFrequency: "monthly", priority: 0.9 }
  ];

  const paginasMunicipios: MetadataRoute.Sitemap = municipios.map((municipio) => ({
    url: `${SITE_URL}/municipios/${municipio.codigo_ibge}`,
    lastModified: municipio.updated_at,
    changeFrequency: "yearly",
    priority: 0.7
  }));

  return [...paginasPrincipais, ...paginasMunicipios];
}
