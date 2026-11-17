import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const APP = "http://127.0.0.1:8765";
const day15 = path.join(ROOT, "docs/checklists-411/screenshots/15");
const day16 = path.join(ROOT, "docs/checklists-411/screenshots/16");

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
  console.log("shot", path.basename(path.dirname(file)), path.basename(file));
}

async function openMenu(label) {
  const header = page
    .locator("text=/Consultor - Painel|Configurações|Ranking|Consumo Moderado/")
    .first();
  const box = await header.boundingBox();
  await page.mouse.click(Math.max(8, box.x - 28), box.y + box.height / 2);
  await page.waitForTimeout(700);
  const item = page.getByText(label, { exact: true }).first();
  await item.waitFor({ state: "visible", timeout: 8000 });
  await item.click();
  await page.waitForTimeout(1800);
}

try {
  await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2000);
  const inputs = page.locator("input");
  await inputs.nth(0).fill("consultor@gmail.com");
  await inputs.nth(1).fill("123456");
  await page.getByText(/^Entrar$/i).click();
  const verDados = page.getByText("Ver Dados").first();
  await verDados.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(1500);

  const search = page.getByPlaceholder("Buscar cliente");
  await search.waitFor({ state: "visible" });
  const searchBox = await search.boundingBox();
  const heading = page.getByText("Meus Clientes").first();
  const headingBox = (await heading.boundingBox()) || searchBox;
  const top = Math.max(0, Math.min(headingBox.y, searchBox.y) - 8);
  await shot(path.join(day16, "04-detalhe-busca.png"), {
    x: 8,
    y: top,
    width: 374,
    height: Math.min(240, searchBox.y + searchBox.height - top + 48),
  });

  await verDados.click();
  await page.waitForTimeout(2000);
  const contas = page.getByText("Contas a Pagar", { exact: true }).first();
  await contas.waitFor({ state: "visible", timeout: 20000 });
  await contas.scrollIntoViewIfNeeded();
  await contas.click();
  await page.waitForTimeout(2500);
  await shot(path.join(day15, "01-page-full.png"));

  const status = page
    .locator("text=/Sem vencimento|Vence hoje|Vencida|A vencer|Nenhuma conta/i")
    .first();
  if (await status.isVisible().catch(() => false)) {
    const box = await status.boundingBox();
    await shot(path.join(day15, "02-detalhe-vencimento.png"), {
      x: 8,
      y: Math.max(0, box.y - 80),
      width: 374,
      height: Math.min(260, box.height + 170),
    });
  } else {
    await shot(path.join(day15, "02-detalhe-vencimento.png"), {
      x: 8,
      y: 140,
      width: 374,
      height: 240,
    });
  }

  const academia = page.getByText("Academia", { exact: true }).first();
  await academia.waitFor({ state: "visible" });
  const academiaBox = await academia.boundingBox();
  await shot(path.join(day15, "02-detalhe-vencimento.png"), {
    x: 8,
    y: Math.max(0, academiaBox.y - 8),
    width: 374,
    height: 250,
  });

  const reativar = page.getByText("Reativar", { exact: true }).first();
  await reativar.scrollIntoViewIfNeeded();
  const reativarBox = await reativar.boundingBox();
  await shot(path.join(day15, "03-detalhe-inativa.png"), {
    x: 8,
    y: Math.max(0, reativarBox.y - 130),
    width: 374,
    height: 210,
  });

  const contasTitle = page.getByText("Contas do Cliente").first();
  const contasBox = await contasTitle.boundingBox();
  const backX = Math.max(8, contasBox.x - 28);
  const backY = contasBox.y + contasBox.height / 2;
  await page.mouse.click(backX, backY);
  await page.waitForTimeout(1200);
  await page.mouse.click(backX, backY);
  await page.waitForTimeout(1200);
  const painel = page.getByText("Consultor - Painel").first();
  await painel.waitFor({ state: "visible", timeout: 10000 });
  const painelBox = await painel.boundingBox();
  await page.mouse.click(Math.max(8, painelBox.x - 28), painelBox.y + painelBox.height / 2);
  await page.waitForTimeout(700);
  await page.getByText("Configurações", { exact: true }).first().click();
  await page.waitForTimeout(1500);
  const alterar = page.getByText("Alterar Senha").first();
  await alterar.scrollIntoViewIfNeeded();
  await alterar.click();
  await page.waitForTimeout(700);
  const senha = page.getByText("Senha Atual").first();
  await senha.waitFor({ state: "visible" });
  const senhaBox = await senha.boundingBox();
  await shot(path.join(day15, "04-detalhe-senha.png"), {
    x: 16,
    y: Math.max(0, senhaBox.y - 20),
    width: 358,
    height: 270,
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  await openMenu("Ranking");
  await page.waitForTimeout(3500);
  await shot(path.join(day16, "01-page-full.png"));
  const pts = page.locator("text=/pts|particip|liga|Individual|Casal/i").first();
  if (await pts.isVisible().catch(() => false)) {
    const box = await pts.boundingBox();
    await shot(path.join(day16, "02-detalhe-ranking.png"), {
      x: 8,
      y: Math.max(70, box.y - 60),
      width: 374,
      height: Math.min(300, box.height + 160),
    });
  } else {
    await shot(path.join(day16, "02-detalhe-ranking.png"), {
      x: 8,
      y: 150,
      width: 374,
      height: 260,
    });
  }

  await openMenu("Início");
  await page.getByText("Ver Dados").first().click();
  await page.waitForTimeout(1500);
  const consumo = page.getByText("Consumo Moderado", { exact: true }).first();
  await consumo.scrollIntoViewIfNeeded();
  await consumo.click();
  await page.waitForTimeout(4000);
  const perf = page
    .locator("text=/meta|planejamento|média|Consumo Moderado/i")
    .first();
  await perf.waitFor({ state: "visible", timeout: 15000 });
  const perfBox = await perf.boundingBox();
  await shot(path.join(day16, "03-detalhe-consumo.png"), {
    x: 8,
    y: Math.max(60, perfBox.y - 16),
    width: 374,
    height: Math.min(320, perfBox.height + 150),
  });

  const files = [
    ...[
      "01-page-full.png",
      "02-detalhe-vencimento.png",
      "03-detalhe-inativa.png",
      "04-detalhe-senha.png",
    ].map((name) => path.join(day15, name)),
    ...[
      "01-page-full.png",
      "02-detalhe-ranking.png",
      "03-detalhe-consumo.png",
      "04-detalhe-busca.png",
    ].map((name) => path.join(day16, name)),
  ];
  const hashes = files.map((file) => ({
    file: file.replace(ROOT + "/", ""),
    md5: md5(file),
    bytes: fs.statSync(file).size,
  }));
  if (new Set(hashes.map((item) => item.md5)).size !== hashes.length) {
    console.error(JSON.stringify(hashes, null, 2));
    throw new Error("screenshots repetidas");
  }
  console.log(JSON.stringify(hashes, null, 2));
} catch (error) {
  const fail = path.join(ROOT, "docs/checklists-411/screenshots/fail.png");
  await page.screenshot({ path: fail }).catch(() => undefined);
  const text = await page.locator("body").innerText().catch(() => "");
  fs.writeFileSync(
    path.join(ROOT, "docs/checklists-411/screenshots/fail.txt"),
    text.slice(0, 2500),
  );
  console.error("FAIL", error.message);
  console.error(text.slice(0, 800));
  process.exitCode = 1;
} finally {
  await browser.close();
}
