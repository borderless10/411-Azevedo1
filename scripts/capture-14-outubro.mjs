import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const OUT = path.join(ROOT, "docs/checklists-411/screenshots/14-outubro");
const APP = "http://127.0.0.1:8765";

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});

const contextOpts = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

async function login(page, email) {
  await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1500);
  const inputs = page.locator("input");
  await inputs.nth(0).fill(email);
  await inputs.nth(1).fill("123456");
  await page.getByText(/^Entrar$/i).click();
  await page.waitForTimeout(5000);
  const later = page.getByText("Agora não").first();
  if (await later.isVisible().catch(() => false)) {
    await later.click();
    await page.waitForTimeout(500);
  }
}

const client = await browser.newContext(contextOpts);
const page = await client.newPage();
page.setDefaultTimeout(20000);
await login(page, "gustavo@gmail.com");

const banner = page.getByText("Seu ciclo acabou!").first();
if (await banner.isVisible().catch(() => false)) {
  await banner.click();
  await page.waitForTimeout(1200);
}

await page.mouse.click(24, 28);
await page.waitForTimeout(800);
await page.getByText("Agende sua consultoria").first().waitFor({ state: "visible" });
await page.screenshot({ path: path.join(OUT, "01-page-full.png") });

const consult = page.getByText("Agende sua consultoria").first();
const consultBox = await consult.boundingBox();
await page.screenshot({
  path: path.join(OUT, "02-detalhe-consultoria.png"),
  clip: {
    x: 0,
    y: Math.max(0, consultBox.y - 18),
    width: 280,
    height: consultBox.height + 36,
  },
});

await page.mouse.click(340, 400);
await page.waitForTimeout(600);
const confirm = page.getByText("Confirmar que agendei").first();
await confirm.waitFor({ state: "visible" });
await confirm.scrollIntoViewIfNeeded();
const confirmBox = await confirm.boundingBox();
await page.screenshot({
  path: path.join(OUT, "03-detalhe-confirmar-agendamento.png"),
  clip: {
    x: 12,
    y: Math.max(0, confirmBox.y - 90),
    width: 366,
    height: Math.min(240, confirmBox.height + 150),
  },
});

await client.close();

const adminCtx = await browser.newContext(contextOpts);
const admin = await adminCtx.newPage();
admin.setDefaultTimeout(20000);
await login(admin, "admin@gmail.com");
await admin.mouse.click(24, 28);
await admin.waitForTimeout(800);
await admin.getByText("Gerenciar Usuários").first().click();
await admin.waitForTimeout(1200);
await admin.getByText(/Cadastrar/i).first().click();
await admin.waitForTimeout(1500);
const supervisor = admin.getByText("Supervisor", { exact: true }).first();
await supervisor.waitFor({ state: "visible" });
const consultorPill = admin.getByText("Consultor", { exact: true }).first();
const a = await consultorPill.boundingBox();
const b = await supervisor.boundingBox();
const top = Math.min(a.y, b.y);
const bottom = Math.max(a.y + a.height, b.y + b.height);
await admin.screenshot({
  path: path.join(OUT, "04-detalhe-papel-supervisor.png"),
  clip: {
    x: 8,
    y: Math.max(0, top - 28),
    width: 374,
    height: Math.min(200, bottom - top + 64),
  },
});

await browser.close();
console.log("shots ok");
