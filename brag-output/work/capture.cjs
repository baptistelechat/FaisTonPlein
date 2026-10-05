// Capture les vrais écrans de la prod pour les vidéos de la série.
// Usage : node capture.cjs desktop | cost | history | fuels | install
const { chromium } = require("playwright-core");
const flow = process.argv[2];
const mobile = flow !== "desktop";
const D = "[data-vaul-drawer]";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const ctx = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 780 }
      : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 3 : 2,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    geolocation: { latitude: 45.764, longitude: 4.8357 },
    permissions: ["geolocation"],
  });
  await ctx.route(/posthog|\/ingest/, (r) => r.abort()); // pas d'analytics pour une session de capture
  const page = await ctx.newPage();
  const shot = async (n, textSel = D) => {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `shots/${n}.png` });
    console.log(
      `--- ${n}\n` +
        (await page.evaluate(
          (s) =>
            [...document.querySelectorAll(s)]
              .pop()
              ?.innerText.replace(/\n+/g, " | ")
              .slice(0, 700),
          textSel,
        )),
    );
  };
  const step = async (n, fn, textSel) => {
    try {
      await fn();
      await shot(n, textSel);
    } catch (e) {
      console.log(`FAIL ${n}: ${e.message.split("\n")[0]}`);
    }
  };
  // Glisse le tiroir vers le haut (snap étendu)
  const expandDrawer = async () => {
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, y) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x: 195, y }],
      });
    await touch("touchStart", 505);
    for (let y = 495; y >= 120; y -= 15) {
      await touch("touchMove", y);
      await page.waitForTimeout(16);
    }
    await touch("touchEnd");
    await page.waitForTimeout(800);
  };
  const sortByPrice = async () => {
    await page.getByText("Prix", { exact: true }).first().click();
    await page.waitForTimeout(500);
  };

  await page.goto("https://faistonplein.vercel.app", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("text=€/L", { timeout: 90000 });
  await page.waitForTimeout(8000);

  if (flow === "desktop") {
    await step("d0-initial", async () => {}, "body");
    await step("d1-prix", sortByPrice, "body");
    await step(
      "d2-detail",
      () => page.locator('[data-slot=card]:has-text("€/L")').first().click(),
      "body",
    );
  } else if (flow === "cost") {
    await step("c0-settings", () =>
      page.locator(`${D} button:has(svg.lucide-sliders-horizontal)`).click(),
    );
    await step("c2-vehicle-set", async () => {
      await page.getByText("Berline / Break").click();
      await page.waitForTimeout(600);
      await page.getByText("Berline / Break").scrollIntoViewIfNeeded();
    });
    await step("c3-closed", () => page.keyboard.press("Escape"));
    await step("c4-price-list", async () => {
      await sortByPrice();
      await expandDrawer();
    });
    await step("c5-cost-list", () => page.getByText("Coût/trajet").click());
  } else if (flow === "history") {
    await sortByPrice();
    await expandDrawer();
    await page.locator(`${D} [data-slot=card]`).first().click();
    await page.waitForTimeout(2500);
    await step("h1-detail-expanded", expandDrawer);
    // Le détail défile dans son propre conteneur : on le fait défiler jusqu'au graphique
    await step("h2-chart", () =>
      page
        .getByText(/volution du prix/i)
        .first()
        .evaluate((title) => {
          let box = title.parentElement;
          while (box && box.scrollHeight <= box.clientHeight + 20)
            box = box.parentElement;
          box.scrollTop +=
            title.getBoundingClientRect().top -
            box.getBoundingClientRect().top -
            40;
        }),
    );
  } else if (flow === "fuels") {
    await sortByPrice();
    await expandDrawer();
    for (const fuel of ["E10", "SP98", "E85"]) {
      await step(`f-${fuel}`, () =>
        page.getByText(fuel, { exact: true }).first().click(),
      );
    }
  } else if (flow === "install") {
    // Chrome headless n'émet pas beforeinstallprompt : on le déclenche pour afficher le vrai bouton « Installer »
    await step(
      "i0-install-button",
      () =>
        page.evaluate(() =>
          window.dispatchEvent(new Event("beforeinstallprompt")),
        ),
      "body",
    );
    await step("i1-cache", async () => {
      await page
        .locator(`${D} button:has(svg.lucide-sliders-horizontal)`)
        .click();
      await page.waitForTimeout(800);
      await page
        .getByText(/réinitialisation/i)
        .first()
        .scrollIntoViewIfNeeded();
    });
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
