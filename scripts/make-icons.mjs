import sharp from "sharp";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const RED = "#E63946";
const BG  = "#080808";

const svg = (size) => {
  const r   = size * 0.22;
  const cx  = size / 2;
  const cy  = size / 2;
  const gy  = size * 0.66;
  const fs  = size * 0.46;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${RED}"/>
  <circle cx="${cx}" cy="${cy * 0.78}" r="${size * 0.06}" fill="#ffffff" opacity="0.12"/>
  <text x="${cx}" y="${gy}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="${fs}" font-weight="900" fill="#ffffff" text-anchor="middle"
        letter-spacing="-${fs * 0.04}">GG</text>
  <rect x="${size * 0.22}" y="${size * 0.82}" width="${size * 0.56}" height="${size * 0.03}"
        rx="${size * 0.015}" fill="#ffffff" opacity="0.85"/>
</svg>`.trim();
};

const sizes = [192, 512];
const outDir = resolve(process.cwd(), "public");

for (const s of sizes) {
  const buf = await sharp(Buffer.from(svg(s))).png({ compressionLevel: 9 }).toBuffer();
  const out = resolve(outDir, `icon-${s}.png`);
  await writeFile(out, buf);
  console.log(`wrote ${out} (${buf.length} bytes)`);
}

// Also emit a maskable-safe 512 with extra padding, in case you want separate slots later.
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${RED}"/>
  <text x="256" y="320" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        font-size="180" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-8">GG</text>
</svg>`.trim();
const mbuf = await sharp(Buffer.from(maskable)).png({ compressionLevel: 9 }).toBuffer();
await writeFile(resolve(outDir, "icon-maskable-512.png"), mbuf);
console.log(`wrote icon-maskable-512.png (${mbuf.length} bytes), bg ${BG}`);
