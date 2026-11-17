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
  if (clip) await page.screenshot({ path: file, clip });
  else await page.screenshot({ path: file });
  console.log("shot", path.basename(file));
}

async function openSidebarItem(label) {
  // Hamburguer no header (canto superior esquerdo)
  await page.mouse.click(24, 28);
  await page.waitForTimeout(900);
  const item = page.getByText(label, { exact: true }).first();
  await item.waitFor({ state: "visible", timeout: 12000 });
  await item.click();
  await page.waitForTimeout(3200);
}

try {
  await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2500);
  const inputs = page.locator("input");
  if ((await inputs.count()) > 0 && (await inputs.first().isVisible().catch(() => false))) {
    await inputs.nth(0).fill("consultor@gmail.com");
    await inputs.nth(1).fill("123456");
    await page.getByText(/^Entrar$/i).click();
  }
  await page
    .getByText("Ver Dados")
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  await page.waitForTimeout(1200);

  await openSidebarItem("Ranking");
  const rankHead = page.locator("text=/Ranking|Individual|Casal/i").first();
  await rankHead.waitFor({ state: "visible", timeout: 15000 });
  const box = await rankHead.boundingBox();
  await shot(path.join(day, "03-detalhe-ranking.png"), {
    x: 8,
    y: Math.max(0, (box?.y || 120) - 50),
    width: 374,
    height: 330,
  });

  await openSidebarItem("Chats");
  const chatHead = page.locator("text=/Bate-Papo|Chats|Conversas/i").first();
  await chatHead.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);
  const cbox = await chatHead.boundingBox();
  await shot(path.join(day, "04-detalhe-chat.png"), {
    x: 8,
    y: Math.max(0, (cbox?.y || 100) - 40),
    width: 374,
    height: 340,
  });

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
    throw new Error("screenshots repetidas " + JSON.stringify(hashes));
  }
  console.log(JSON.stringify(hashes, null, 2));
} catch (error) {
  await page
    .screenshot({ path: path.join(ROOT, "docs/checklists-411/screenshots/fail-19b.png") })
    .catch(() => undefined);
  const text = await page.locator("body").innerText().catch(() => "");
  fs.writeFileSync(
    path.join(ROOT, "docs/checklists-411/screenshots/fail-19b.txt"),
    text.slice(0, 2500),
  );
  console.error("FAIL", error.message);
  console.error(text.slice(0, 800));
  process.exitCode = 1;
} finally {
  await browser.close();
}
