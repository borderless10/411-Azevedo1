import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = "/home/eduardo/workspaces/Borderless/411-Azevedo1";
const OUT = path.join(ROOT, "testes/desktop-captures");
const APP = "http://127.0.0.1:8081";
const EMAIL = "usuario@gmail.com";
const PASS = "123456";

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/google-chrome",
});

const sizes = [
  [1280, 800],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
];

for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.setDefaultTimeout(60000);
  await page.goto(APP, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(3000);

  const inputs = page.locator("input");
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill(EMAIL);
    await inputs.nth(1).fill(PASS);
    await page.getByText(/^Entrar$/i).click();
    await page.waitForTimeout(7000);
  }

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  const hasHOverflow = overflow.scrollWidth > overflow.clientWidth + 2;
  console.log(`${w}x${h}`, overflow, hasHOverflow ? "H-OVERFLOW" : "ok");

  await page.screenshot({
    path: path.join(OUT, `home-auth-${w}.png`),
  });

  // expense list if reachable via sidebar
  const gastos = page.getByText(/^Gastos$/i).first();
  if (await gastos.isVisible().catch(() => false)) {
    await gastos.click();
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: path.join(OUT, `expense-list-${w}.png`),
    });
  }

  await page.close();
}

await browser.close();
console.log("done");
