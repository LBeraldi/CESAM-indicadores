import { describe, expect, it } from "vitest";
import { fonteCurta, resumoAtuacao } from "@/lib/prestador";

describe("resumo do prestador (PG-03.12)", () => {
  it("resume a área de atuação do SINISA sem inventar informação", () => {
    expect(resumoAtuacao("Com delegação atendendo Sede e Localidades - DSL")).toEqual(["Delegação", "Sede e localidades"]);
    expect(resumoAtuacao("Sem delegação atendendo Sede - SDS")).toEqual(["Sem delegação", "Sede"]);
  });

  it("mantém o texto original quando não reconhece o formato", () => {
    expect(resumoAtuacao("Atendimento regional")).toEqual(["Atendimento regional"]);
    expect(resumoAtuacao(null)).toEqual([]);
  });

  it("encurta a fonte para sistema + ano", () => {
    expect(fonteCurta("SINISA 2024 - Abastecimento de Agua, base municipal (ano de referencia 2023)")).toBe("SINISA 2024");
    expect(fonteCurta("Cadastro próprio")).toBe("Cadastro próprio");
  });
});
