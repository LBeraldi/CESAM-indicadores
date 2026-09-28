import { afterEach, describe, expect, it, vi } from "vitest";
import { CLIENT_API_BASE_URL, fetchApi, fetchApiResult, fetchApiSafe } from "@/lib/api";

describe("cliente da API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("usa a rota interna do Next para chamadas do navegador", () => {
    expect(CLIENT_API_BASE_URL).toBe("/api");
  });

  it("retorna JSON em uma resposta bem-sucedida", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchApi<{ ok: boolean }>("/health")).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/health"), expect.objectContaining({ next: { revalidate: 3600 } }));
  });

  it("preserva fallback e disponibilidade quando a API falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("erro", { status: 503 })));

    await expect(fetchApiSafe("/municipios", ["fallback"])).resolves.toEqual(["fallback"]);
    await expect(fetchApiResult("/indicadores", [])).resolves.toEqual({ data: [], disponivel: false });
  });
});
