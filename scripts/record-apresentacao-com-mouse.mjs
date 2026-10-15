/**
 * Vídeo de teste das entregas do dia 14/set (escopo autorizado pelo usuário:
 * “faça um video testando oq foi feito”).
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const APP = "http://127.0.0.1:8765";
const EMAIL = "usuario@gmail.com";
const PASS = "123456";
const PROJECT_NUM = "411";
const OUT_DIR = path.join(ROOT, "docs/checklists-411");
const OUT_MP4 = path.join(OUT_DIR, `video de apresentação do ${PROJECT_NUM}.mp4`);
const VIDEO_DIR = path.join(OUT_DIR, "_video-raw");

const GLANCE = 400;
const LIST_PEEK = 650;
const CURSOR_STEP_MS = 22;
const TYPE_DELAY = 12;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function installFakeCursor(page) {
  await page.addStyleTag({
    content: `
      #pw-fake-cursor {
        position: fixed;
        left: 0;
        top: 0;
        width: 28px;
        height: 28px;
        pointer-events: none;
        z-index: 2147483647;
        transform: translate(-2px, -2px);
        filter: drop-shadow(0 1px 2px rgba(0,0,0,.45));
      }
    `,
  });
  await page.evaluate(() => {
    if (document.getElementById("pw-fake-cursor")) return;
    const el = document.createElement("div");
    el.id = "pw-fake-cursor";
    el.innerHTML =
      '<svg viewBox="0 0 28 28" width="28" height="28" xmlns="http://www.w3.org/2000/svg"><path d="M4 3 L4 22 L10 16 L15 26 L18 24.5 L13 15 L22 15 Z" fill="#8c52ff" stroke="#fff" stroke-width="1.4"/></svg>';
    document.body.appendChild(el);
    window.__pwCursor = { x: 40, y: 40 };
  });
}

async function moveCursor(page, x, y) {
  const pos = await page.evaluate(() => window.__pwCursor || { x: 40, y: 40 });
  const steps = 12;
  for (let i = 1; i <= steps; i += 1) {
    const nx = pos.x + ((x - pos.x) * i) / steps;
    const ny = pos.y + ((y - pos.y) * i) / steps;
    await page.evaluate(
      ({ nx, ny }) => {
        window.__pwCursor = { x: nx, y: ny };
        const el = document.getElementById("pw-fake-cursor");
        if (el) el.style.transform = `translate(${nx - 2}px, ${ny - 2}px)`;
      },
      { nx, ny },
    );
    await wait(CURSOR_STEP_MS);
  }
}

async function moveToLocator(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(box.height / 2, 18);
  await moveCursor(page, x, y);
  return { x, y, box };
}

async function clickLoc(page, locator) {
  const pos = await moveToLocator(page, locator);
  if (!pos) throw new Error("clickLoc: locator sem bounding box");
  await page.mouse.click(pos.x, pos.y);
  await wait(GLANCE);
}

async function hoverLoc(page, locator) {
  await moveToLocator(page, locator);
  await wait(GLANCE);
}

async function typeFast(page, locator, text) {
  await clickLoc(page, locator);
  await page.keyboard.press("Control+A");
  await locator.pressSequentially(text, { delay: TYPE_DELAY });
  await wait(GLANCE);
}

async function selectLoc(page, locator, label) {
  await clickLoc(page, locator);
  const native = await locator.evaluate((el) => el.tagName === "SELECT");
  if (native) {
    await page.evaluate(
      ({ sel, wanted }) => {
        const select = document.querySelectorAll("select");
        let target = null;
        for (const s of select) {
          if (s === sel || s.options?.[s.selectedIndex]?.text === wanted) {
            target = s;
          }
        }
        const active = document.activeElement;
        const el = (active && active.tagName === "SELECT" ? active : target) || sel;
        const old = document.getElementById("pw-fake-select-menu");
        if (old) old.remove();
        const rect = el.getBoundingClientRect();
        const menu = document.createElement("div");
        menu.id = "pw-fake-select-menu";
        menu.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.bottom + 4}px;min-width:${Math.max(rect.width, 88)}px;background:#1b1228;border:1px solid #8c52ff;border-radius:10px;z-index:2147483646;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.4);`;
        [...el.options].slice(0, 12).forEach((opt) => {
          const row = document.createElement("div");
          row.textContent = opt.text;
          row.dataset.value = opt.value;
          row.style.cssText =
            "padding:10px 12px;color:#fff;font:14px sans-serif;cursor:pointer;";
          if (opt.text === wanted || opt.value === wanted) {
            row.style.background = "#8c52ff";
          }
          menu.appendChild(row);
        });
        document.body.appendChild(menu);
      },
      { sel: null, wanted: label },
    );
    const option = page.locator("#pw-fake-select-menu div", { hasText: label }).first();
    await clickLoc(page, option);
    await locator.selectOption({ label }).catch(() =>
      locator.selectOption({ value: label }),
    );
    await page.evaluate(() => document.getElementById("pw-fake-select-menu")?.remove());
  }
  await wait(GLANCE);
}

async function waitLoaded(page) {
  await page
    .waitForFunction(
      () => !/Carregando dados/.test(document.body.innerText || ""),
      { timeout: 40000 },
    )
    .catch(() => undefined);
  await wait(GLANCE);
}

async function openMenu(page, label) {
  await moveCursor(page, 22, 32);
  await page.mouse.click(22, 32);
  await wait(LIST_PEEK);
  const item = page.getByText(label, { exact: true }).first();
  await item.waitFor({ state: "visible", timeout: 12000 });
  await clickLoc(page, item);
  await wait(LIST_PEEK);
  await waitLoaded(page);
}

async function ensureApp(page) {
  if (!/127\.0\.0\.1:8765|localhost:8765/.test(page.url())) {
    await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
    await installFakeCursor(page);
    await waitLoaded(page);
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  recordVideo: { dir: VIDEO_DIR, size: { width: 390, height: 844 } },
});
const page = await context.newPage();
page.setDefaultTimeout(45000);

try {
console.log("Act 0 — login");
await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector("input", { timeout: 30000 });
await wait(GLANCE);
await installFakeCursor(page);

const inputs = page.locator("input");
await moveToLocator(page, inputs.nth(0));
await inputs.nth(0).fill(EMAIL);
await wait(GLANCE);
await moveToLocator(page, inputs.nth(1));
await inputs.nth(1).fill(PASS);
await wait(GLANCE);
await clickLoc(page, page.getByText(/^Entrar$/i).first());
await waitLoaded(page);
await ensureApp(page);

console.log("Act 1 — lembrete de gastos");
try {
await openMenu(page, "Configurações");
await ensureApp(page);
const reminder = page.getByText("Lembrete para registrar gastos").first();
await reminder.waitFor({ state: "visible", timeout: 15000 });
await hoverLoc(page, reminder);
const hourRow = page.getByText(/^Horário$/i).first();
await clickLoc(page, hourRow);
await page.getByText("Horário do lembrete").first().waitFor({ state: "visible", timeout: 8000 }).catch(() => undefined);
await wait(LIST_PEEK);
const saveHour = page.getByText("Salvar horário").first();
if (await saveHour.isVisible().catch(() => false)) {
  await clickLoc(page, saveHour);
}
await wait(LIST_PEEK);
} catch (err) {
  console.warn("Act 1:", err?.message || err);
}

console.log("Act 2 — contas / vencimento só com o dia");
try {
await openMenu(page, "Contas a Pagar");
await ensureApp(page);
await hoverLoc(page, page.getByText("Pendentes").first());
await hoverLoc(page, page.getByText("Vencidas").first());
await moveCursor(page, 348, 770);
await page.mouse.click(348, 770);
await wait(LIST_PEEK);
const nova = page.getByText("Nova Conta").first();
if (await nova.isVisible().catch(() => false)) {
  const titleInput = page.getByPlaceholder("Ex: Conta de Luz").first();
  if (await titleInput.isVisible().catch(() => false)) {
    await typeFast(page, titleInput, "Conta dia 13");
  }
  const amountInput = page.getByPlaceholder("Ex: 150,00").first();
  if (await amountInput.isVisible().catch(() => false)) {
    await typeFast(page, amountInput, "50");
  }
  const dueInput = page.getByPlaceholder(/Dia ou DD|Vencimento|DD\/MM/i).first();
  if (await dueInput.isVisible().catch(() => false)) {
    await typeFast(page, dueInput, "13");
  }
  await hoverLoc(page, page.getByText(/Cadastrar Conta/i).first());
  await page.keyboard.press("Escape");
}
await wait(GLANCE);
} catch (err) {
  console.warn("Act 2:", err?.message || err);
}

console.log("Act 3 — chat: conversa, menção e menu");
try {
await openMenu(page, "Chats");
await ensureApp(page);
const visao = page.getByText("Visão").first();
const consultor = page.getByText("Consultor", { exact: true }).first();
if (await visao.isVisible().catch(() => false)) {
  await clickLoc(page, visao);
} else if (await consultor.isVisible().catch(() => false)) {
  await clickLoc(page, consultor);
}
await wait(LIST_PEEK);
const composer = page.getByPlaceholder("Digite sua mensagem...").first();
if (await composer.isVisible().catch(() => false)) {
  await typeFast(page, composer, "@");
  await wait(LIST_PEEK);
  const mention = page.locator("text=/^@/").first();
  if (await mention.isVisible().catch(() => false)) {
    await clickLoc(page, mention);
  }
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await wait(GLANCE);
}
const bubble = page.locator("text=/Oi|Nanda|Chegamooooos|vacilando/i").first();
if (await bubble.isVisible().catch(() => false)) {
  const pos = await moveToLocator(page, bubble);
  if (pos) {
    await page.mouse.down();
    await wait(800);
    await page.mouse.up();
    await wait(LIST_PEEK);
  }
  const reply = page.getByText("Responder").first();
  if (await reply.isVisible().catch(() => false)) {
    const report = page.getByText("Denunciar").first();
    if (await report.isVisible().catch(() => false)) {
      await hoverLoc(page, report);
    }
    await clickLoc(page, reply);
    await wait(GLANCE);
  }
  const heart = page.getByLabel("Reagir com ❤️").first();
  if (await heart.isVisible().catch(() => false)) {
    await clickLoc(page, heart);
  } else if (await page.getByText("Cancelar").isVisible().catch(() => false)) {
    await clickLoc(page, page.getByText("Cancelar").first());
  }
}
await wait(LIST_PEEK);
} catch (err) {
  console.warn("Act 3:", err?.message || err);
}
} catch (err) {
  console.warn("gravação interrompida:", err?.message || err);
} finally {
await context.close();
await browser.close();
}

const webms = fs
  .readdirSync(VIDEO_DIR)
  .filter((f) => f.endsWith(".webm"))
  .map((f) => path.join(VIDEO_DIR, f));
if (!webms.length) throw new Error("nenhum webm gravado");
webms.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
const webm = webms[0];
const ff = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    webm,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    OUT_MP4,
  ],
  { stdio: "inherit" },
);
if (ff.status !== 0) throw new Error("ffmpeg falhou");
const st = fs.statSync(OUT_MP4);
console.log("MP4", OUT_MP4, st.size);
