import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const OUT = path.join(ROOT, "docs/checklists-411/screenshots/01");
const APP = "http://127.0.0.1:8765";
const EMAIL = "usuario@gmail.com";
const PASS = "123456";

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
page.setDefaultTimeout(45000);

await page.goto(APP, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(2000);

const inputs = page.locator("input");
await inputs.nth(0).fill(EMAIL);
await inputs.nth(1).fill(PASS);
await page.getByText(/^Entrar$/i).click();
await page.waitForTimeout(5000);

// Home full page first? We'll use Settings as main page for this delivery.
// Open hamburger (top-left)
await page.mouse.click(20, 30);
await page.waitForTimeout(800);

const cfg = page.getByText("Configurações").first();
await cfg.waitFor({ state: "visible", timeout: 15000 });
await cfg.click();
await page.waitForTimeout(2000);

const body = await page.locator("body").innerText();
console.log("settings snippet:", body.slice(0, 400).replace(/\n/g, " | "));

// Ensure Termos is in view
const termos = page.getByText("Termos e Privacidade").first();
await termos.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);

await page.screenshot({ path: path.join(OUT, "01-page-full.png") });

const termosBox = await termos.boundingBox();
const sub = page.getByText(/Privacidade, termos e exclus/i).first();
const subBox = (await sub.boundingBox().catch(() => null)) || termosBox;
const top = Math.max(0, Math.min(termosBox.y, subBox.y) - 36);
const bottom = Math.max(termosBox.y + termosBox.height, subBox.y + subBox.height) + 24;
await page.screenshot({
  path: path.join(OUT, "02-detalhe-termos-privacidade.png"),
  clip: { x: 8, y: top, width: 374, height: Math.min(180, bottom - top) },
});

await termos.click();
await page.waitForTimeout(1000);

// RN web Alert often renders as window.confirm-like or custom — try several
const exclusaoBtn = page.getByText("Exclusão de conta").first();
if (await exclusaoBtn.isVisible().catch(() => false)) {
  await page.screenshot({
    path: path.join(OUT, "03-detalhe-opcoes-legais.png"),
    clip: { x: 10, y: 180, width: 370, height: 360 },
  });
  const cancel = page.getByText(/^Cancelar$/i).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  else await page.keyboard.press("Escape");
} else {
  // Alert nativo do browser: aceitar e capturar seção Sistema
  page.once("dialog", async (d) => {
    console.log("dialog", d.message());
    await d.dismiss();
  });
  // re-click may have already consumed dialog — capture Sistema block
  const sistema = page.getByText(/^Sistema$/i).first();
  await sistema.scrollIntoViewIfNeeded();
  const sb = await sistema.boundingBox();
  await page.screenshot({
    path: path.join(OUT, "03-detalhe-opcoes-legais.png"),
    clip: { x: 8, y: Math.max(0, sb.y - 8), width: 374, height: 300 },
  });
}

await page.waitForTimeout(500);
const sobre = page.getByText(/^Sobre$/i).first();
await sobre.scrollIntoViewIfNeeded();
const ob = await sobre.boundingBox();
await page.screenshot({
  path: path.join(OUT, "04-detalhe-sobre-versao.png"),
  clip: { x: 8, y: Math.max(0, ob.y - 28), width: 374, height: 130 },
});

await browser.close();

const labels = [
  { file: "01-page-full.png", label: "Imagem 1 — Configurações do app (Expo)" },
  {
    file: "02-detalhe-termos-privacidade.png",
    label: "Imagem 2 — Detalhe — Termos e Privacidade",
  },
  {
    file: "03-detalhe-opcoes-legais.png",
    label: "Imagem 3 — Detalhe — Seção Sistema (documentos legais)",
  },
  {
    file: "04-detalhe-sobre-versao.png",
    label: "Imagem 4 — Detalhe — Sobre / versão do app",
  },
];
fs.writeFileSync(path.join(OUT, "labels.json"), JSON.stringify(labels, null, 2));

const hashes = new Set();
for (const item of labels) {
  const f = path.join(OUT, item.file);
  const buf = fs.readFileSync(f);
  const h = crypto.createHash("md5").update(buf).digest("hex");
  hashes.add(h);
  console.log(item.file, buf.length, h);
}
if (hashes.size !== 4) throw new Error("screenshots não distintas");
console.log("OK mobile shots");
