import { describe, expect, it } from "vitest";
import { urlExternaSegura } from "@/lib/urls";

describe("URLs externas", () => {
  it("aceita HTTP/HTTPS e rejeita protocolos perigosos ou inválidos", () => {
    expect(urlExternaSegura("https://example.com/pagina")).toBe("https://example.com/pagina");
    expect(urlExternaSegura("http://example.com")).toBe("http://example.com/");
    expect(urlExternaSegura("javascript:alert(1)")).toBeNull();
    expect(urlExternaSegura("não é uma URL")).toBeNull();
  });
});
