async (page) => {
  const path = require("node:path");
  const fs = require("node:fs");
  const root = path.join(__dirname, "..");
  const outDir = path.join(root, "class7", "captures");
  fs.mkdirSync(outDir, { recursive: true });
  const url = "http://127.0.0.1:8731/index.html";

  const scrollTo = async (y) => {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(250);
  };
  const offsetTop = async (sel) =>
    page.evaluate((s) => document.querySelector(s)?.offsetTop ?? 0, sel);
  const shot = (name) => page.screenshot({ path: path.join(outDir, name) });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: "domcontentloaded" });

  const cut01 = await offsetTop("#cut-01");
  const cut02 = await offsetTop("#cut-02");
  const cut03 = await offsetTop("#cut-03");
  const cut04 = await offsetTop("#cut-04");
  const cut05 = await offsetTop("#cut-05");
  const h = 800;
  const cut02H = await page.evaluate(() => document.getElementById("cut-02")?.offsetHeight || 1);
  const cut03H = await page.evaluate(() => document.getElementById("cut-03")?.offsetHeight || 1);
  const cut04H = await page.evaluate(() => document.getElementById("cut-04")?.offsetHeight || 1);

  await scrollTo(cut01 + 40);
  await shot("01-entry.png");
  await scrollTo(cut02 - h * 0.2);
  await shot("01-to-02.png");
  await page.waitForSelector(".stream-block", { timeout: 20000 });
  await shot("02-stream.png");
  await scrollTo(cut02 + cut02H * 0.55);
  await shot("02-popups.png");
  const popupClose = page.locator(".popup-card__close").first();
  if (await popupClose.count()) {
    await popupClose.click();
    await page.waitForTimeout(200);
    await shot("02-fake-close.png");
  }
  await scrollTo(cut03 + cut03H * 0.35);
  await shot("03-obs-log.png");
  await scrollTo(cut03 + cut03H * 0.75);
  await shot("03-profile-labels.png");
  await scrollTo(cut04 + cut04H * 0.35);
  await shot("04-cards.png");
  await scrollTo(cut04 + cut04H * 0.85);
  await shot("04-saturated.png");
  await scrollTo(cut05 + 40);
  await page.waitForSelector(".window", { timeout: 15000 });
  await shot("05-windows.png");
  await page.waitForTimeout(700);
  await shot("05-red-close.png");
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
  while (await page.locator(".window__close").count()) {
    await page.locator(".window__close").first().click();
    await page.waitForTimeout(80);
  }
  await shot("05-closed.png");
  await scrollTo(cut05 + cut04H * 0.5);
  await shot("05-closing.png");
  return outDir;
}
