import { chromium } from "/home/eduardo/workspaces/Borderless/312-Agui/node_modules/playwright/index.mjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const APP = "http://127.0.0.1:8081";
const day = path.join(ROOT, "docs/checklists-411/screenshots/19");

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});
const page = await (
  await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })
).newPage();
page.setDefaultTimeout(30000);

const md5 = (file) =>
  crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");

async function shot(file, clip) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (clip) await page.screenshot({ path: file, clip });
  else await page.screenshot({ path: file });
  console.log("shot", path.basename(file));
}

async function cropAround(locator, file, { padTop = 70, height = 260 } = {}) {
  const el = locator.first();
  await el.waitFor({ state: "visible", timeout: 15000 });
  await el.scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(400);
  const box = await el.boundingBox();
  if (!box) throw new Error("sem boundingBox para crop");
  await shot(file, {
    x: 8,
    y: Math.max(0, box.y - padTop),
    width: 374,
    height: Math.min(height, box.height + padTop + 120),
  });
}

try {
  await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);
  const inputs = page.locator("input");
  await inputs.nth(0).fill("consultor@gmail.com");
  await inputs.nth(1).fill("123456");
  await page.getByText(/^Entrar$/i).click();

  const verDados = page.getByText("Ver Dados").first();
  await verDados.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);
  await verDados.click();
  await page.waitForTimeout(2500);

  // Registros de Rendas (consultor vendo cliente)
  const registros = page.getByText("Registros de Rendas", { exact: true }).first();
  await registros.waitFor({ state: "visible", timeout: 20000 });
  await registros.scrollIntoViewIfNeeded();
  await registros.click();
  await page.waitForTimeout(3500);

  await shot(path.join(day, "01-page-full.png"));
  await cropAround(
    page.getByText("Gerais / salário", { exact: false }),
    path.join(day, "02-detalhe-filtros-renda.png"),
    { padTop: 90, height: 240 },
  );

  // Volta para detalhe do cliente e abre o chat (lista)
  await page.goBack().catch(() => undefined);
  await page.waitForTimeout(1500);
  // Header/menu: tenta abrir lista de chats pelo menu lateral se existir
  const bodyText = await page.locator("body").innerText();
  // Navega para ranking via menu hamburguer do header (primeiro botao no topo)
  // Usa o menu lateral: clica no avatar/hamburguer
  const menuBtn = page.locator("header button, [role='button']").first();
  // Fallback: volta duas vezes ate o painel e abre Ranking pelo sidebar
  await page.goBack().catch(() => undefined);
  await page.waitForTimeout(1200);

  // Tenta achar Ranking no DOM (sidebar pode estar montada)
  const rankingItem = page.getByText("Ranking", { exact: true }).first();
  if (await rankingItem.isVisible().catch(() => false)) {
    await rankingItem.click();
    await page.waitForTimeout(3500);
  } else {
    // abre sidebar clicando no canto superior esquerdo
    await page.mouse.click(24, 24);
    await page.waitForTimeout(800);
    const r2 = page.getByText("Ranking", { exact: true }).first();
    await r2.waitFor({ state: "visible", timeout: 10000 });
    await r2.click();
    await page.waitForTimeout(3500);
  }
  await cropAround(
    page.locator("text=/Ranking|pts|Individual/i"),
    path.join(day, "03-detalhe-ranking.png"),
    { padTop: 40, height: 300 },
  );

  // Chat: abre pelo sidebar
  await page.mouse.click(24, 24);
  await page.waitForTimeout(800);
  const chatItem = page
    .getByText(/^(Chat|Bate-Papo|Conversas)$/)
    .first();
  if (await chatItem.isVisible().catch(() => false)) {
    await chatItem.click();
  } else {
    const anyChat = page.locator("text=/Bate-Papo|Conversas/i").first();
    await anyChat.waitFor({ state: "visible", timeout: 10000 });
    await anyChat.click();
  }
  await page.waitForTimeout(3500);
  await cropAround(
    page.locator("text=/Bate-Papo|Conversas|Chat/i"),
    path.join(day, "04-detalhe-chat.png"),
    { padTop: 30, height: 320 },
  );

  const files = [
    "01-page-full.png",
    "02-detalhe-filtros-renda.png",
    "03-detalhe-ranking.png",
    "04-detalhe-chat.png",
  ].map((name) => path.join(day, name));
  const hashes = files.map((file) => ({
    file: file.replace(ROOT + "/", ""),
    md5: md5(file),
    bytes: fs.statSync(file).size,
  }));
  if (new Set(hashes.map((i) => i.md5)).size !== hashes.length) {
    console.error(JSON.stringify(hashes, null, 2));
    throw new Error("screenshots repetidas");
  }
  console.log(JSON.stringify(hashes, null, 2));
} catch (error) {
  const fail = path.join(ROOT, "docs/checklists-411/screenshots/fail-19.png");
  await page.screenshot({ path: fail }).catch(() => undefined);
  const text = await page.locator("body").innerText().catch(() => "");
  fs.writeFileSync(
    path.join(ROOT, "docs/checklists-411/screenshots/fail-19.txt"),
    text.slice(0, 2500),
  );
  console.error("FAIL", error.message);
  console.error(text.slice(0, 800));
  process.exitCode = 1;
} finally {
  await browser.close();
}
