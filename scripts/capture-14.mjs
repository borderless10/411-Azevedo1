import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const OUT = path.join(ROOT, "docs/checklists-411/screenshots/14");
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

const login = async () => {
  await page.goto(APP, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2000);
  const inputs = page.locator("input");
  await inputs.nth(0).fill(EMAIL);
  await inputs.nth(1).fill(PASS);
  await page.getByText(/^Entrar$/i).click();
  await page.waitForTimeout(5000);
};

const openMenuItem = async (label) => {
  await page.mouse.click(20, 30);
  await page.waitForTimeout(800);
  const item = page.getByText(label).first();
  await item.waitFor({ state: "visible", timeout: 15000 });
  await item.click();
  await page.waitForTimeout(1800);
};

await login();

const closeCycleBanner = async () => {
  // O X do banner não tem texto acessível — clica no canto direito do alerta.
  await page.mouse.click(358, 92);
  await page.waitForTimeout(350);
};

await closeCycleBanner();
await openMenuItem("Configurações");
await closeCycleBanner();

await page.screenshot({ path: path.join(OUT, "01-page-full.png") });

const reminder = page.getByText("Lembrete para registrar gastos").first();
await reminder.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
const reminderBox = await reminder.boundingBox();
const hourLabel = page.getByText(/^Horário$/i).first();
const hourBox =
  (await hourLabel.boundingBox().catch(() => null)) || reminderBox;
const top = Math.max(0, Math.min(reminderBox.y, hourBox.y) - 24);
const bottom =
  Math.max(reminderBox.y + reminderBox.height, hourBox.y + hourBox.height) + 28;
await page.screenshot({
  path: path.join(OUT, "02-detalhe-lembrete-gastos.png"),
  clip: {
    x: 8,
    y: top,
    width: 374,
    height: Math.min(220, Math.max(120, bottom - top)),
  },
});

await openMenuItem("Contas a Pagar");
await closeCycleBanner();
await page.waitForTimeout(800);
const billStatus = page.locator("text=/Vence hoje|Vencida|A vencer|dia \\d+/i").first();
const hasBill = await billStatus.isVisible().catch(() => false);
if (!hasBill) {
  // FAB de nova conta (canto inferior direito)
  await page.mouse.click(348, 770);
  await page.waitForTimeout(900);
}
const dueLabel = page.getByText(/Data de Vencimento|Vence hoje|Vencida|A vencer/i).first();
await dueLabel.waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
const dueBox = (await dueLabel.boundingBox().catch(() => null)) || {
  x: 16,
  y: 220,
  width: 350,
  height: 40,
};
await page.screenshot({
  path: path.join(OUT, "03-detalhe-vencimento-contas.png"),
  clip: {
    x: 8,
    y: Math.max(0, dueBox.y - 70),
    width: 374,
    height: Math.min(300, dueBox.height + 180),
  },
});

if (await page.getByText("Nova Conta").isVisible().catch(() => false)) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}
await openMenuItem("Chats");
await closeCycleBanner();
await page.waitForTimeout(1200);
const consultor = page.getByText("Consultor", { exact: true }).first();
if (await consultor.isVisible().catch(() => false)) {
  await consultor.click();
  await page.waitForTimeout(1500);
}
const chatAnchor = page.locator("text=/Oi|Digite|Enviar|@/i").first();
await chatAnchor.waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
const chatBox = (await chatAnchor.boundingBox().catch(() => null)) || {
  x: 16,
  y: 400,
  width: 350,
  height: 60,
};
await page.screenshot({
  path: path.join(OUT, "04-detalhe-lista-chat.png"),
  clip: {
    x: 8,
    y: Math.max(0, Math.min(chatBox.y - 80, 500)),
    width: 374,
    height: 280,
  },
});

await browser.close();

const labels = [
  {
    file: "01-page-full.png",
    label: "Imagem 1 — Configurações com lembrete de gastos",
  },
  {
    file: "02-detalhe-lembrete-gastos.png",
    label: "Imagem 2 — Detalhe — Lembrete e horário",
  },
  {
    file: "03-detalhe-vencimento-contas.png",
    label: "Imagem 3 — Detalhe — Vencimento das contas",
  },
  {
    file: "04-detalhe-lista-chat.png",
    label: "Imagem 4 — Detalhe — Conversa do chat",
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
console.log("OK mobile shots 14");
