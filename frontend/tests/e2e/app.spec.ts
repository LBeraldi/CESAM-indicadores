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
  const municipiosLink = page.getByRole("link", { name: "Municípios", exact: true });
  await expect(municipiosLink).toBeVisible();
  await municipiosLink.click();
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
  // ADR-008: o select "Tema" foi substituído pelas abas de dimensão.
  await abrirPagina(page, "/municipios/5003702");
  const ano = page.getByLabel("Ano de referência");
  const fonte = page.getByLabel("Fonte");
  await expect(ano).toBeVisible();
  await expect(fonte).toBeVisible();
  await expect(page.getByLabel("Tema")).toHaveCount(0);

  const anoPadrao = await ano.inputValue();
  const outroAno = await ano.locator("option").nth(2).getAttribute("value");
  if (outroAno) await ano.selectOption(outroAno);
  await page.getByRole("button", { name: "Limpar" }).click();
  await expect(ano).toHaveValue(anoPadrao);

  const abas = page.getByRole("tablist", { name: "Dimensões" });
  await abas.getByRole("tab", { name: /^Esgoto/ }).click();
  await expect(abas.getByRole("tab", { name: /^Esgoto/ })).toHaveAttribute("aria-selected", "true");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/dourados.*\.csv/i);
});

test("ficha abre na primeira dimensão com os indicadores em destaque (ADR-007)", async ({ page }) => {
  await abrirPagina(page, "/municipios/5003702");
  const abas = page.getByRole("tablist", { name: "Dimensões" });
  await expect(abas.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
  const painel = page.getByRole("tabpanel");
  await expect(painel.getByRole("row", { name: /Índice de perdas na distribuição/ })).toBeVisible();
  const linhasDestaque = await painel.locator("tbody tr").count();
  expect(linhasDestaque).toBeLessThanOrEqual(6);

  await painel.getByRole("button", { name: /^Ver todos os \d+ indicadores de Água/ }).click();
  expect(await painel.locator("tbody tr").count()).toBeGreaterThan(linhasDestaque);
});

test.describe("celular com toque", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // CP-10: a série abre por clique/toque no botão "Série" (antes: cartão com hover de 800 ms).
  test("painel da série histórica abre no primeiro toque e permanece aberto", async ({ page }) => {
    await abrirPagina(page, "/municipios/5003702");
    const botao = page.getByRole("button", { name: /^Série histórica de / }).filter({ visible: true }).first();
    await expect(botao).toBeVisible();
    await botao.tap();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await page.waitForTimeout(800);
    await expect(modal).toBeVisible();
  });

  test("cabeçalho do celular tem no máximo 96 px e menu abre e fecha com Esc", async ({ page }) => {
    await abrirPagina(page, "/");
    const altura = await page.locator("header").first().evaluate((elemento) => elemento.getBoundingClientRect().height);
    expect(altura).toBeLessThanOrEqual(96);
    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#menu-celular").getByRole("link", { name: "Ranking" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
  });

  test("busca da página inicial fica visível sem rolar", async ({ page }) => {
    await abrirPagina(page, "/");
    const busca = page.getByRole("combobox", { name: "Buscar município" }).filter({ visible: true }).first();
    await expect(busca).toBeInViewport();
    await expectNoHorizontalOverflow(page);
  });

  test("ficha e lista não possuem rolagem horizontal", async ({ page }) => {
    await abrirPagina(page, "/municipios");
    await expectNoHorizontalOverflow(page);
    await abrirPagina(page, "/municipios/5003702");
    await expectNoHorizontalOverflow(page);
  });
});

test("primeiro Tab foca o atalho para o conteúdo e o menu marca a página atual", async ({ page }) => {
  await abrirPagina(page, "/ranking");
  await page.keyboard.press("Tab");
  const atalho = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(atalho).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Ranking" })).toHaveAttribute(
    "aria-current",
    "page"
  );
});

test("busca de município leva à ficha pelo nome (PG-01.2)", async ({ page }) => {
  await abrirPagina(page, "/");
  const busca = page.getByRole("combobox", { name: "Buscar município" }).filter({ visible: true }).first();
  await busca.fill("dourados");
  const sugestoes = page.getByRole("listbox", { name: "Municípios encontrados" }).filter({ visible: true });
  await sugestoes.getByRole("option", { name: /^Dourados/ }).click();
  await expect(page).toHaveURL(/\/municipios\/5003702$/);
});

test("busca de município leva à ficha pelo código IBGE (PG-01.3)", async ({ page }) => {
  await abrirPagina(page, "/");
  const busca = page.getByRole("combobox", { name: "Buscar município" }).filter({ visible: true }).first();
  await busca.fill("5003702");
  await busca.press("Enter");
  await expect(page).toHaveURL(/\/municipios\/5003702$/);
});

test("mapa fica fora da ordem de Tab e tem legenda com classes e ausência", async ({ page }) => {
  await abrirPagina(page, "/");
  const poligonos = page.locator("#mapa-ms svg path[data-codigo]");
  await expect(poligonos.first()).toHaveAttribute("tabindex", "-1");
  const legenda = page.locator("#mapa-ms");
  await expect(legenda.getByText("0–20", { exact: true })).toBeVisible();
  await expect(legenda.getByText("Sem dado oficial", { exact: true })).toBeVisible();
});

test("lista de municípios mostra estado vazio com ação para limpar", async ({ page }) => {
  await abrirPagina(page, "/municipios");
  await page.getByPlaceholder("Buscar município").fill("xyzw");
  await expect(page.getByText(/Nenhum município encontrado para/)).toBeVisible();
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(page.getByRole("row", { name: /^Dourados\b/ })).toBeVisible();
});

test("lista de municípios expõe a ordenação com aria-sort", async ({ page }) => {
  await abrirPagina(page, "/municipios");
  const cabecalho = page.getByRole("columnheader", { name: /Município/ });
  await expect(cabecalho).toHaveAttribute("aria-sort", "ascending");
  await cabecalho.getByRole("button").click();
  await expect(cabecalho).toHaveAttribute("aria-sort", "descending");
});

test("ficha usa abas de dimensão com teclado e mostra a barra de contexto ao rolar", async ({ page }) => {
  await abrirPagina(page, "/municipios/5003702");
  const abas = page.getByRole("tablist", { name: "Dimensões" });
  const primeiraAba = abas.getByRole("tab").first();
  await primeiraAba.click();
  await expect(primeiraAba).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(abas.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");

  await page.mouse.wheel(0, 2000);
  await expect(page.getByLabel("Ano de referência")).toBeInViewport();
});

test("painel da série fecha com Esc e devolve o foco ao botão", async ({ page }) => {
  await abrirPagina(page, "/municipios/5003702");
  const botao = page.getByRole("button", { name: /^Série histórica de / }).filter({ visible: true }).first();
  await botao.click();
  const painel = page.getByRole("dialog");
  await expect(painel).toBeVisible();
  await expect(painel.getByRole("table")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(painel).toHaveCount(0);
  await expect(botao).toBeFocused();
});

test("página de metodologia está no menu e preserva a explicação da nota", async ({ page }) => {
  await abrirPagina(page, "/");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Metodologia e fontes" }).click();
  await expect(page).toHaveURL(/\/metodologia$/);
  await expect(page.getByRole("heading", { name: "Metodologia e fontes", level: 1 })).toBeVisible();
  await expect(page.getByText(/não é uma classificação, nota, certificação/)).toBeVisible();
});
