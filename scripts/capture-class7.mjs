import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "class7", "captures");
const url = process.env.CAPTURE_URL || "http://127.0.0.1:8731/index.html";

async function scrollTo(page, y) {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.waitForTimeout(400);
}

async function offsetTop(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.offsetTop : 0;
  }, selector);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: "networkidle" });

  const cut01 = await offsetTop(page, "#cut-01");
  const cut01b = await offsetTop(page, "#cut-01b");
  const cut02 = await offsetTop(page, "#cut-02");
  const cut03 = await offsetTop(page, "#cut-03");
  const cut04a = await offsetTop(page, "#cut-04a");
  const cut04c = await offsetTop(page, "#cut-04c");
  const cut05 = await offsetTop(page, "#cut-05");
  const h = page.viewportSize().height;

  const cut02H = await page.evaluate(() => document.getElementById("cut-02")?.offsetHeight || 1);

  await scrollTo(page, cut01 + 40);
  await page.screenshot({ path: path.join(outDir, "01-entry.png") });

  await scrollTo(page, cut01b - h * 0.35);
  await page.screenshot({ path: path.join(outDir, "01-dive.png") });

  await scrollTo(page, cut02 + 20);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, "01-to-02.png") });

  await page.waitForSelector(".mix-para, .mix-word", { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "02-1col-typing.png") });

  await page.waitForSelector(".mix-word", { timeout: 20000 });
  await scrollTo(page, cut02 + cut02H * 0.33);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "02-replace.png") });

  await scrollTo(page, cut02 + cut02H * 0.68);
  await page.screenshot({ path: path.join(outDir, "02-split.png") });

  await page.hover('[data-subject="cookie"] button');
  await page.click('[data-subject="cookie"] button');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(outDir, "02-hover-detail.png") });

  await scrollTo(page, cut03 + h * 0.2);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "03-diagram-recap.png") });

  await scrollTo(page, cut03 + h * 2.2);
  await page.screenshot({ path: path.join(outDir, "03-diagram-scroll.png") });

  await scrollTo(page, cut04a + 40);
  await page.screenshot({ path: path.join(outDir, "04a-youtube.png") });

  await scrollTo(page, cut04c + 40);
  await page.screenshot({ path: path.join(outDir, "04c-spam-dense.png") });

  await scrollTo(page, cut05 + 40);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, "05-windows.png") });

  const win = page.locator(".window").first();
  if (await win.count()) {
    const box = await win.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + 24;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 100, cy + 70, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, "05-drag.png") });
    }
  }

  let remaining = await page.locator(".window").count();
  while (remaining > 0) {
    await page.locator(".window").first().click({ position: { x: 12, y: 12 } });
    await page.waitForTimeout(150);
    remaining = await page.locator(".window").count();
  }
  await page.screenshot({ path: path.join(outDir, "05-closed.png") });
  await page.screenshot({ path: path.join(outDir, "05-closing.png") });

  await browser.close();
  console.log("Captures written to", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
