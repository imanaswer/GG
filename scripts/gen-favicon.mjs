import sharp from "sharp";
import { writeFileSync } from "fs";

const SRC = "public/Logo-Photoroom.png";
const BG = { r: 255, g: 255, b: 255 };   // white background
const FG = { r: 0, g: 0, b: 0 };          // black mark

// 1. Trim transparent border, recolour the mark to the foreground colour via its alpha mask.
async function whiteMark(size, pad) {
  const inner = Math.round(size * (1 - pad * 2));
  const trimmed = await sharp(SRC).trim().toBuffer();
  // Use the shape's alpha as a mask; paint it solid white.
  const alpha = await sharp(trimmed)
    .ensureAlpha()
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extractChannel("alpha")
    .toBuffer();
  const { width, height } = await sharp(alpha).metadata();
  const mark = await sharp({
    create: { width, height, channels: 3, background: FG },
  })
    .joinChannel(alpha)
    .png()
    .toBuffer();
  const off = Math.round((size - width) / 2);
  return { mark, off, offY: Math.round((size - height) / 2) };
}

async function roundedBg(size, radius) {
  const svg = `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="rgb(${BG.r},${BG.g},${BG.b})"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function build(size, { rounded = true, pad = 0.18 } = {}) {
  const radius = rounded ? Math.round(size * 0.22) : 0;
  const bg = rounded
    ? await roundedBg(size, radius)
    : await sharp({ create: { width: size, height: size, channels: 4, background: { ...BG, alpha: 1 } } }).png().toBuffer();
  const { mark, off, offY } = await whiteMark(size, pad);
  return sharp(bg).composite([{ input: mark, left: off, top: offY }]).png().toBuffer();
}

const targets = [
  { file: "public/icon-192.png", size: 192, opts: {} },
  { file: "public/icon-512.png", size: 512, opts: {} },
  { file: "public/icon-maskable-512.png", size: 512, opts: { rounded: false, pad: 0.28 } },
  { file: "public/favicon-32.png", size: 32, opts: {} },
  { file: "public/apple-icon.png", size: 180, opts: {} },
];

for (const t of targets) {
  const buf = await build(t.size, t.opts);
  writeFileSync(t.file, buf);
  console.log("wrote", t.file);
}

// Multi-resolution favicon.ico (16/32/48) for src/app/favicon.ico
import pngToIco from "png-to-ico";
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const s of icoSizes) icoPngs.push(await build(s, {}));
const ico = await pngToIco(icoPngs);
writeFileSync("src/app/favicon.ico", ico);
console.log("wrote src/app/favicon.ico");
