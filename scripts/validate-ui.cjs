const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  await page.goto("http://127.0.0.1:3210", { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });

  const firstImage = page.locator(".portrait-frame img");
  await firstImage.waitFor();
  const firstSource = await firstImage.getAttribute("src");
  const naturalWidth = await firstImage.evaluate((image) => image.naturalWidth);
  if (!naturalWidth) throw new Error("First portrait failed to load");

  await page.screenshot({
    path: "C:/Users/孙喆/.codex/visualizations/2026/07/26/019f9c92-5c45-7213-8ae5-9bf6338b6b4f/portrait-rating-desktop.png",
    fullPage: true
  });

  await page.getByRole("button", { name: "7 分" }).click();
  await page.waitForFunction(
    (source) => document.querySelector(".portrait-frame img")?.getAttribute("src") !== source,
    firstSource
  );
  const secondSource = await firstImage.getAttribute("src");
  await page.getByRole("button", { name: "8 分" }).click();
  await page.waitForFunction(
    (source) => document.querySelector(".portrait-frame img")?.getAttribute("src") !== source,
    secondSource
  );

  await page.getByRole("button", { name: /统计/ }).click();
  await page.locator(".average-orb strong").waitFor();
  const average = (await page.locator(".average-orb strong").textContent()).trim();
  if (average !== "7.50") throw new Error(`Unexpected average: ${average}`);

  await page.reload({ waitUntil: "networkidle" });
  const restoredBadge = (await page.locator(".stats-button b").textContent()).trim();
  if (restoredBadge !== "2") {
    throw new Error("Local persistence check failed");
  }
  await page.getByRole("button", { name: /统计/ }).click();

  await page.screenshot({
    path: "C:/Users/孙喆/.codex/visualizations/2026/07/26/019f9c92-5c45-7213-8ae5-9bf6338b6b4f/portrait-rating-stats.png",
    fullPage: true
  });

  await page.getByRole("button", { name: "继续评分" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "C:/Users/孙喆/.codex/visualizations/2026/07/26/019f9c92-5c45-7213-8ae5-9bf6338b6b4f/portrait-rating-mobile.png",
    fullPage: true
  });

  const result = {
    portraitLoaded: naturalWidth > 0,
    automaticAdvance: firstSource !== secondSource,
    average,
    persistence: true,
    portraitCount: await page.evaluate(() =>
      fetch("/portraits.json").then((response) => response.json()).then((items) => items.length)
    )
  };
  console.log(JSON.stringify(result));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
