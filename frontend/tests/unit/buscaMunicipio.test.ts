import { describe, expect, it } from "vitest";
import { filtrarMunicipios } from "@/lib/buscaMunicipio";

const municipios = [
  { codigo_ibge: "5003702", nome: "Dourados" },
  { codigo_ibge: "5004007", nome: "Glória de Dourados" },
  { codigo_ibge: "5002704", nome: "Campo Grande" },
  { codigo_ibge: "5000609", nome: "Amambai" },
  { codigo_ibge: "5000708", nome: "Anastácio" }
];

describe("busca de município (CP-15)", () => {
  it("encontra por nome sem diferenciar acento nem caixa, priorizando quem começa com o termo", () => {
    expect(filtrarMunicipios(municipios, "dourados").map((item) => item.nome)).toEqual(["Dourados", "Glória de Dourados"]);
    expect(filtrarMunicipios(municipios, "anastacio").map((item) => item.nome)).toEqual(["Anastácio"]);
  });

  it("encontra pelo código IBGE", () => {
    expect(filtrarMunicipios(municipios, "5003702").map((item) => item.nome)).toEqual(["Dourados"]);
    expect(filtrarMunicipios(municipios, "50007").map((item) => item.nome)).toEqual(["Anastácio"]);
  });

  it("não sugere nada sem termo", () => {
    expect(filtrarMunicipios(municipios, "  ")).toEqual([]);
  });
});
