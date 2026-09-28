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
    // PG-01.8: o destaque "Líder atual" duplicava a primeira linha e saiu; o atalho é o ranking completo.
    await expect(page.getByRole("link", { name: /Ver ranking completo/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await abrirPagina(page, "/ranking");
    await expectNoHorizontalOverflow(page);
  });
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
