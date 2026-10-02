import { describe, expect, it } from "vitest";
import { ehStatusOficial } from "@/lib/statusValidacao";

describe("status de validação", () => {
  it("aceita status oficiais e rejeita status parecidos", () => {
    expect(ehStatusOficial("oficial_sinisa")).toBe(true);
    expect(ehStatusOficial("oficial_teste")).toBe(true);
    expect(ehStatusOficial("nao_oficial")).toBe(false);
    expect(ehStatusOficial("pendente")).toBe(false);
  });
});
