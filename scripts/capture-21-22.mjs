import { chromium } from "/home/eduardo/workspaces/Borderless/312-Agui/node_modules/playwright/index.mjs";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const APP = "http://127.0.0.1:8081";
const day21 = path.join(ROOT, "docs/checklists-411/screenshots/21");
const day22 = path.join(ROOT, "docs/checklists-411/screenshots/22");

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
  console.log("shot", file.replace(ROOT + "/", ""));
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

async function openSidebarItem(label) {
  await page.mouse.click(24, 24);
  await page.waitForTimeout(900);
  const item = page.getByText(label, { exact: true }).first();
  await item.waitFor({ state: "visible", timeout: 10000 });
  await item.click();
  await page.waitForTimeout(600);
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
  await page.waitForTimeout(1200);

  // ---------- Dia 21: ranking histórico ----------
  await openSidebarItem("Ranking");
  await page.waitForTimeout(4000);
  await shot(path.join(day21, "01-page-full.png"));
  await cropAround(
    page.getByText("Pódio Anterior", { exact: true }),
    path.join(day21, "02-detalhe-abas.png"),
    { padTop: 40, height: 300 },
  );

  await page.getByText("Pódio Anterior", { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await cropAround(
    page.locator("text=/edição encerrada|Ainda não há/i"),
    path.join(day21, "03-detalhe-podio-anterior.png"),
    { padTop: 60, height: 300 },
  );

  await page.getByText("Histórico", { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await cropAround(
    page.locator("text=/Nenhuma edição|Edição/i"),
    path.join(day21, "04-detalhe-historico.png"),
    { padTop: 60, height: 300 },
  );

  // ---------- Dia 22: insígnias e bordas ----------
  await page.getByText("Ranking Atual", { exact: true }).first().click().catch(() => undefined);
  await page.waitForTimeout(1200);
  const holdersBtn = page.getByText("Ver Detentores de Insígnias", { exact: false }).first();
  await holdersBtn.waitFor({ state: "visible", timeout: 15000 });
  await holdersBtn.click();
  await page.waitForTimeout(3000);
  await shot(path.join(day22, "01-page-full.png"));
  await cropAround(
    page.getByText("Guardião do Zero", { exact: true }),
    path.join(day22, "02-detalhe-busca-filtros.png"),
    { padTop: 110, height: 300 },
  );

  await openSidebarItem("Perfil");
  await page.waitForTimeout(3000);
  await cropAround(
    page.getByText("Minha borda", { exact: true }),
    path.join(day22, "03-detalhe-minha-borda.png"),
    { padTop: 50, height: 340 },
  );

  await page.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
  await page.waitForTimeout(3500);
  await openSidebarItem("Ranking");
  await page.waitForTimeout(3500);
  await cropAround(
    page.locator("text=/ pts/"),
    path.join(day22, "04-detalhe-ranking-insignias.png"),
    { padTop: 90, height: 300 },
  );

  const files = [
    ...["01-page-full.png", "02-detalhe-abas.png", "03-detalhe-podio-anterior.png", "04-detalhe-historico.png"].map((n) => path.join(day21, n)),
    ...["01-page-full.png", "02-detalhe-busca-filtros.png", "03-detalhe-minha-borda.png", "04-detalhe-ranking-insignias.png"].map((n) => path.join(day22, n)),
  ];
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
  const fail = path.join(ROOT, "docs/checklists-411/screenshots/fail-21-22.png");
  await page.screenshot({ path: fail }).catch(() => undefined);
  const text = await page.locator("body").innerText().catch(() => "");
  fs.writeFileSync(
    path.join(ROOT, "docs/checklists-411/screenshots/fail-21-22.txt"),
    text.slice(0, 2500),
  );
  console.error("FAIL", error.message);
  console.error(text.slice(0, 800));
  process.exitCode = 1;
} finally {
  await browser.close();
}
