// brag-series — fonds de story 1080×1920, tirés du fond des vidéos (halos du kit) pour poser stickers et textes dans Instagram.
// Usage : node story-bg.cjs [nom-video]   → ../story-bg/fond-story.png (nu) + ../story-bg/fond-story-logo.png (logo + nom)
// Sans argument, prend la première vidéo <nn>-<angle>.html : le fond est le même dans toute la série.
const { chromium } = require("playwright-core");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const name =
  process.argv[2] ||
  fs
    .readdirSync(__dirname)
    .filter((f) => /^\d\d-.+\.html$/.test(f))
    .sort()[0]
    ?.replace(/\.html$/, "");
if (!name) throw new Error("Aucune vidéo <nn>-<angle>.html dans work/");
const out = path.join(__dirname, "..", "story-bg");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium
    .launch({ channel: "chrome" })
    .catch(() => chromium.launch({ channel: "msedge" }));
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
  });
  await page.goto(pathToFileURL(path.join(__dirname, `${name}.html`)).href);
  await page.evaluate(() => window.ready);
  await page.evaluate(() => window.seek(2));
  // On ne garde que les halos : le texte et l'app de la vidéo disparaissent
  await page.addStyleTag({
    content: "#stage > :not(.glow):not(#brand){visibility:hidden!important}",
  });
  await page.screenshot({ path: path.join(out, "fond-story.png") });

  // Logo + nom à 270 px du haut : sous la barre de progression et le profil qu'Instagram superpose
  await page.evaluate(() =>
    document.getElementById("stage").insertAdjacentHTML(
      "beforeend",
      `<div id="brand" style="position:absolute;top:270px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:28px">
        <div class="logo" style="width:120px;height:120px;border-radius:30px;padding:18px;box-shadow:0 20px 80px color-mix(in srgb,var(--primary) 60%,transparent)"><img src="${THEME.logo}" alt=""></div>
        <span style="font-family:var(--font-heading);font-weight:700;font-size:68px">${THEME.name}</span>
      </div>`,
    ),
  );
  await page.waitForFunction(
    () =>
      [...document.images].every((i) => i.complete) &&
      document.fonts.status === "loaded",
  );
  await page.screenshot({ path: path.join(out, "fond-story-logo.png") });
  await browser.close();
  console.log(`Fonds écrits dans ${out}`);
})();
