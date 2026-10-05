// brag-series — outils de capture des vrais écrans d'une app. Les parcours (quoi cliquer) sont
// propres à chaque projet : ils s'écrivent dans capture.cjs, qui importe ce fichier.
const { chromium } = require("playwright-core");
const fs = require("node:fs");
const path = require("node:path");

// Ouvre l'app dans le même gabarit que les cadres du kit : mobile 390×780 (×3) ou bureau 1440×900 (×2).
// options : { url, mobile = true, geolocation?, locale?, timezoneId?, block?, waitFor?, settle? }
//   block   : regex des requêtes à couper (analytics) pour ne pas polluer les stats du projet
//   waitFor : sélecteur qui prouve que l'app a fini de charger ses données
module.exports = async ({
  url,
  mobile = true,
  geolocation,
  locale = "fr-FR",
  timezoneId = "Europe/Paris",
  block = /posthog|\/ingest|google-analytics|googletagmanager|plausible|umami|vercel-insights|_vercel\/insights/,
  waitFor,
  settle = 4000,
}) => {
  fs.mkdirSync(path.join(__dirname, "shots"), { recursive: true });
  const browser = await chromium
    .launch({ channel: "chrome" })
    .catch(() => chromium.launch({ channel: "msedge" }));
  const ctx = await browser.newContext({
    viewport: mobile
      ? { width: 390, height: 780 }
      : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 3 : 2,
    isMobile: mobile,
    hasTouch: mobile,
    locale,
    timezoneId,
    ...(geolocation ? { geolocation, permissions: ["geolocation"] } : {}),
  });
  if (block) await ctx.route(block, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 90000 });
  await page.waitForTimeout(settle);

  // Capture shots/<nom>.png et imprime le texte visible (pour relever les vrais chiffres et libellés)
  const shot = async (name, textSel = "body", wait = 2500) => {
    await page.waitForTimeout(wait);
    await page.screenshot({
      path: path.join(__dirname, "shots", `${name}.png`),
    });
    const text = await page.evaluate(
      (s) =>
        [...document.querySelectorAll(s)]
          .pop()
          ?.innerText.replace(/\n+/g, " | ")
          .slice(0, 900),
      textSel,
    );
    console.log(`--- ${name}\n${text}`);
  };
  // Une étape = une action puis une capture ; un échec n'arrête pas le parcours
  const step = async (name, action, textSel) => {
    try {
      await action();
      await shot(name, textSel);
    } catch (e) {
      console.log(`FAIL ${name}: ${e.message.split("\n")[0]}`);
    }
  };
  // Glissement tactile vertical (tiroirs, feuilles) : les clics souris ne déclenchent pas ces gestes
  const swipe = async (x, fromY, toY) => {
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, y) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: type === "touchEnd" ? [] : [{ x, y }],
      });
    const dir = Math.sign(toY - fromY);
    await touch("touchStart", fromY);
    for (let y = fromY + dir * 10; dir * (toY - y) >= 0; y += dir * 15) {
      await touch("touchMove", y);
      await page.waitForTimeout(16);
    }
    await touch("touchEnd");
    await page.waitForTimeout(800);
  };
  // Fait défiler le conteneur scrollable d'un élément (scrollIntoView ne suffit pas dans un tiroir)
  const scrollTo = (locator, offset = 40) =>
    locator.evaluate((el, off) => {
      let box = el.parentElement;
      while (box && box.scrollHeight <= box.clientHeight + 20)
        box = box.parentElement;
      if (box)
        box.scrollTop +=
          el.getBoundingClientRect().top -
          box.getBoundingClientRect().top -
          off;
    }, offset);

  return {
    page,
    ctx,
    shot,
    step,
    swipe,
    scrollTo,
    close: () => browser.close(),
  };
};
