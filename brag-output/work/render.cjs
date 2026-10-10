// brag-series — rend une vidéo : capture les images de <nom>.html (pure fonction du temps),
// synthétise sa bande-son à partir de ses repères, puis encode.
// Usage : node render.cjs <nom> stills   → images de contrôle + planche stills-<nom>.jpg
//         node render.cjs <nom>          → ../<nom>.mp4 + ../<nom>.jpg (poster, aussi incrusté en image 0)
const { chromium } = require("playwright-core");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ffmpeg = require("ffmpeg-static");
const buildAudio = require("./audio.cjs");

const FPS = 30;
const [name, mode] = process.argv.slice(2);
const ff = (...args) =>
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...args]);
// Navigateur déjà installé sur la machine : Chrome, sinon Edge
const launch = () =>
  chromium
    .launch({ channel: "chrome" })
    .catch(() => chromium.launch({ channel: "msedge" }));

(async () => {
  const stills = mode === "stills";
  const dir = path.join(__dirname, `${stills ? "stills" : "frames"}-${name}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);

  const browser = await launch();
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
  });
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  await page.goto(
    "file://" + path.join(__dirname, `${name}.html`).replace(/\\/g, "/"),
  );
  await page.evaluate(() => window.ready);
  const video = await page.evaluate(() => window.VIDEO);

  const shoot = async (t, file) => {
    await page.evaluate((time) => window.seek(time), t);
    await page.screenshot({ path: path.join(dir, file) });
  };

  if (stills) {
    for (const [i, t] of video.stills.entries())
      await shoot(t, `${String(i).padStart(2, "0")}.png`);
    await browser.close();
    ff(
      "-i",
      path.join(dir, "%02d.png"),
      "-frames:v",
      "1",
      "-vf",
      "scale=432:768,tile=8x2",
      path.join(__dirname, `stills-${name}.jpg`),
    );
    return;
  }

  const total = Math.round(video.duration * FPS);
  for (let f = 0; f < total; f++) {
    // image 0 = poster (remplace, n'ajoute pas : durée et synchro audio inchangées)
    await shoot(
      f === 0 ? video.poster : f / FPS,
      `${String(f).padStart(4, "0")}.png`,
    );
  }
  await browser.close();

  const wav = path.join(dir, "audio.wav"),
    out = path.join(__dirname, "..");
  // un morceau par vidéo, composé d'après son numéro dans l'ambiance de la série (THEME.music)
  buildAudio({ track: parseInt(name) || 1, ...video.cues }, video.music, wav);
  ff(
    "-framerate",
    String(FPS),
    "-i",
    path.join(dir, "%04d.png"),
    "-i",
    wav,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "16",
    "-preset",
    "medium",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    "-shortest",
    path.join(out, `${name}.mp4`),
  );
  ff(
    "-i",
    path.join(dir, "0000.png"),
    "-q:v",
    "2",
    path.join(out, `${name}.jpg`),
  );
  fs.rmSync(dir, { recursive: true, force: true }); // les images sont régénérables : on ne garde que le MP4
  console.log(`${name} done (${video.duration}s)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
