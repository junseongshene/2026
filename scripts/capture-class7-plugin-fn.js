async (page) => {
  const path = require("node:path");
  const fs = require("node:fs");
  const root = path.join(__dirname, "..");
  const outDir = path.join(root, "class7", "captures");
  fs.mkdirSync(outDir, { recursive: true });
  const url = "http://127.0.0.1:8731/index.html";

  const scrollTo = async (y) => {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(200);
  };
  const offsetTop = async (sel) =>
    page.evaluate((s) => document.querySelector(s)?.offsetTop ?? 0, sel);
  const shot = (name) => page.screenshot({ path: path.join(outDir, name) });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const cut01 = await offsetTop("#cut-01");
  const cut01b = await offsetTop("#cut-01b");
  const cut02 = await offsetTop("#cut-02");
  const cut03 = await offsetTop("#cut-03");
  const cut04a = await offsetTop("#cut-04a");
  const cut04c = await offsetTop("#cut-04c");
  const cut05 = await offsetTop("#cut-05");
  const h = 800;
  const cut02H = await page.evaluate(() => document.getElementById("cut-02")?.offsetHeight || 1);

  await scrollTo(cut01 + 40);
  await shot("01-entry.png");
  await scrollTo(cut01b - h * 0.35);
  await shot("01-dive.png");
  await scrollTo(cut02 + 20);
  await page.waitForSelector(".mix-para, .mix-word", { timeout: 20000 });
  await shot("01-to-02.png");
  await shot("02-1col-typing.png");
  await page.waitForSelector(".mix-word", { timeout: 25000 });
  await scrollTo(cut02 + cut02H * 0.33);
  await shot("02-replace.png");
  await scrollTo(cut02 + cut02H * 0.68);
  await shot("02-split.png");
  await page.locator('[data-subject="cookie"] button').click();
  await page.waitForTimeout(150);
  await shot("02-hover-detail.png");
  await scrollTo(cut03 + h * 0.2);
  await shot("03-diagram-recap.png");
  await scrollTo(cut03 + h * 2.2);
  await shot("03-diagram-scroll.png");
  await scrollTo(cut04a + 40);
  await shot("04a-youtube.png");
  await scrollTo(cut04c + 40);
  await shot("04c-spam-dense.png");
  await scrollTo(cut05 + 40);
  await shot("05-windows.png");

  const win = page.locator(".window").first();
  if (await win.count()) {
    const box = await win.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + 24;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + 100, cy + 70, { steps: 6 });
      await page.mouse.up();
      await shot("05-drag.png");
    }
  }
  while (await page.locator(".window").count()) {
    await page.locator(".window").first().click({ position: { x: 12, y: 12 } });
    await page.waitForTimeout(80);
  }
  await shot("05-closed.png");
  await shot("05-closing.png");
  return outDir;
}
