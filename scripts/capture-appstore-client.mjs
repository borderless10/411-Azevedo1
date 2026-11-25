/**
 * Captura telas reais do app (fluxo cliente) no tamanho App Store 1206x2622.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const OUT = path.join(ROOT, "distribution/app-store-screenshots");
const APP = process.env.APP_URL || "http://127.0.0.1:8081";
const EMAIL = process.env.CLIENT_EMAIL || "usuario@gmail.com";
const PASS = process.env.CLIENT_PASS || "123456";

const W = 402;
const H = 874;
const SCALE = 3; // 1206 x 2622

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady(page) {
  // wait loading spinner circles to go away
  for (let i = 0; i < 40; i++) {
    const spinning = await page.locator("circle[stroke-width='4']").count();
    const body = (await page.locator("body").innerText().catch(() => "")) || "";
    if (spinning === 0 && !/Carregando/i.test(body)) break;
    await sleep(500);
  }
  await sleep(800);
}

async function dismissOverlays(page) {
  for (const label of ["Agora não", "Não", "Fechar", "OK", "Entendi", "Cancelar"]) {
    const btn = page.getByText(label, { exact: true }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
      await sleep(400);
    }
  }
}

async function openMenu(page) {
  // Prefer visible hamburger in header (not "Fechar menu")
  const close = page.getByLabel(/fechar menu/i);
  if (await close.isVisible().catch(() => false)) {
    return true; // already open
  }

  // Click top-left menu button by position
  await page.mouse.click(28, 48);
  await sleep(900);

  if (await page.getByText("Contas a Pagar", { exact: true }).first().isVisible().catch(() => false)) {
    return true;
  }

  // Fallback: first button-like near left edge
  const clicked = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[role="button"],button'));
    for (const el of nodes) {
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      if (label.includes("fechar")) continue;
      if (r.x < 56 && r.y < 90 && r.width > 10 && r.width < 70 && r.height < 70) {
        el.click();
        return true;
      }
    }
    return false;
  });
  await sleep(900);
  return clicked;
}

async function goSidebar(page, label) {
  await openMenu(page);
  await sleep(400);
  const item = page.getByText(label, { exact: true }).first();
  if ((await item.count()) === 0) {
    console.log("menu item not found:", label);
    await page.getByLabel(/fechar menu/i).click({ force: true }).catch(() => {});
    return false;
  }
  await item.evaluate((el) => {
    el.scrollIntoView({ block: "center", inline: "nearest" });
    (el.closest('[role="button"]') || el.parentElement || el).click();
  });
  await sleep(2200);
  await waitReady(page);
  await dismissOverlays(page);
  return true;
}

async function shot(page, name) {
  await waitReady(page);
  const raw = path.join(OUT, `_raw-${name}.png`);
  const final = path.join(OUT, `${name}-1206x2622.png`);
  await page.screenshot({ path: raw, fullPage: false });
  execFileSync("python3", [
    "-c",
    `
from PIL import Image
im=Image.open(${JSON.stringify(raw)}).convert('RGB')
im=im.resize((1206,2622), Image.LANCZOS)
im.save(${JSON.stringify(final)}, 'PNG', optimize=True)
print('saved', ${JSON.stringify(final)}, im.size)
`,
  ]);
  fs.unlinkSync(raw);
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});

const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

const page = await context.newPage();
page.setDefaultTimeout(45000);

console.log("goto", APP);
await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
await sleep(3500);

const inputs = page.locator("input");
await inputs.first().waitFor({ state: "visible", timeout: 60000 });
await inputs.nth(0).fill(EMAIL);
await inputs.nth(1).fill(PASS);
await page.getByText(/^Entrar$/i).first().click();
await sleep(7000);
await waitReady(page);
await dismissOverlays(page);

await shot(page, "01-home");
console.log("ok home");

await goSidebar(page, "Contas a Pagar");
await shot(page, "02-contas");
console.log("ok contas");

await goSidebar(page, "Consumo Moderado");
await shot(page, "03-consumo");
console.log("ok consumo");

// Gastos acompanhados: abrir Mercado se existir
await openMenu(page);
await sleep(500);
const mercado = page.getByText(/^Mercado$/i).first();
if (await mercado.isVisible().catch(() => false)) {
  await mercado.click({ force: true });
  await sleep(2500);
  await waitReady(page);
} else {
  const gastos = page.getByText(/Gastos acompanhados/i).first();
  if (await gastos.isVisible().catch(() => false)) {
    // click first item below - try Uber
    const uber = page.getByText(/^Uber$/i).first();
    if (await uber.isVisible().catch(() => false)) {
      await uber.click({ force: true });
      await sleep(2500);
      await waitReady(page);
    }
  } else {
    await goSidebar(page, "Linha do Tempo");
  }
}
await shot(page, "04-gastos");
console.log("ok gastos");

await goSidebar(page, "Rendas Acompanhadas");
await shot(page, "05-rendas");
console.log("ok rendas");

await browser.close();
console.log("DONE", OUT);
