import { expect, test, type Page } from "@playwright/test";

const consoleErrors: string[] = [];
const pageErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors.length = 0;
  pageErrors.length = 0;
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
});

test.afterEach(() => {
  expect(consoleErrors, "A página não deve emitir erros no console").toEqual([]);
  expect(pageErrors, "A página não deve emitir erros JavaScript").toEqual([]);
});

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function abrirPagina(page: Page, rota: string) {
  await page.goto(rota);
  await page.waitForLoadState("networkidle");
}

test("página inicial e navegação principal funcionam", async ({ page }) => {
  await abrirPagina(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Municípios" })).toBeVisible();
  await page.getByRole("link", { name: "Municípios" }).click();
  await expect(page).toHaveURL(/\/municipios$/);
  await expect(page.getByRole("heading", { name: "Municípios de Mato Grosso do Sul" })).toBeVisible();
});

test("consulta municipal pesquisa e abre a ficha correta", async ({ page }) => {
  await abrirPagina(page, "/municipios");
  const busca = page.getByPlaceholder("Buscar município");
  await busca.fill("Dourados");
  const linha = page.getByRole("row", { name: /^Dourados\b/ });
  await expect(linha).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Campo Grande" })).toHaveCount(0);
  await linha.getByRole("link").click();
  await expect(page).toHaveURL(/\/municipios\/5003702$/);
  await expect(page.getByRole("heading", { name: "Dourados", level: 1 })).toBeVisible();
});

test("formulários da ficha filtram, limpam e exportam CSV", async ({ page }) => {
  await abrirPagina(page, "/municipios/5003702");
  const ano = page.getByLabel("Ano de referência");
  const tema = page.getByLabel("Tema");
  await expect(ano).toBeVisible();
  await expect(tema).toBeVisible();

  const anoDisponivel = await ano.locator("option").nth(1).getAttribute("value");
  if (anoDisponivel) await ano.selectOption(anoDisponivel);
  const temaDisponivel = await tema.locator("option").nth(1).getAttribute("value");
  if (temaDisponivel) await tema.selectOption(temaDisponivel);
  await page.getByRole("button", { name: "Limpar" }).click();
  await expect(ano).toHaveValue(await ano.locator("option").nth(1).getAttribute("value") ?? "");
  await expect(tema).toHaveValue("todos");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/dourados.*\.csv/i);
});

test("ranking pode ser filtrado por município", async ({ page }) => {
  await abrirPagina(page, "/ranking");
  await expect(page.getByRole("heading", { name: "Ranking municipal de saneamento" })).toBeVisible();
  await page.getByPlaceholder("Nome do município").fill("Dourados");
  await expect(page.getByText(/2 municípios listados para "Dourados"/)).toBeVisible();
  await expect(page.getByText("Dourados", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "Campo Grande" })).toHaveCount(0);
});

test.describe("tablet", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("não corta ranking nem botões na lateral direita", async ({ page }) => {
    await abrirPagina(page, "/");
    await expect(page.getByRole("link", { name: /Ver líder do ranking/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await abrirPagina(page, "/ranking");
    await expectNoHorizontalOverflow(page);
  });
});

test.describe("celular com toque", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("modal histórico abre no primeiro toque e permanece aberto", async ({ page }) => {
    await abrirPagina(page, "/municipios/5003702");
    const cartao = page.locator('[title^="Mantenha o mouse sobre o indicador"]').first();
    await expect(cartao).toBeVisible();
    await cartao.tap();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await page.waitForTimeout(800);
    await expect(modal).toBeVisible();
  });

  test("ficha e lista não possuem rolagem horizontal", async ({ page }) => {
    await abrirPagina(page, "/municipios");
    await expectNoHorizontalOverflow(page);
    const apiLink = page.getByRole("link", { name: "API", exact: true });
    const apiBox = await apiLink.boundingBox();
    expect(apiBox?.x ?? 0).toBeGreaterThanOrEqual(0);
    expect((apiBox?.x ?? 0) + (apiBox?.width ?? 0)).toBeLessThanOrEqual(390);
    await abrirPagina(page, "/municipios/5003702");
    await expectNoHorizontalOverflow(page);
  });
});
