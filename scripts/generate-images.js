/**
 * Generates the static images used by the demo pages.
 *
 * - public/images/hero-original.png  – the "as exported by the designer" hero: 2400px, lossless, several MB
 * - public/images/hero-{800,1600}.{jpg,webp} – properly sized & compressed variants (needs `sips` or
 *   ImageMagick for JPEG, `cwebp` for WebP)
 * - public/images/product-{1..6}.png – product photos used by the CLS demo
 *
 * The images are committed to the repo, so you only need to run this if you want to regenerate them:
 *   npm run images
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/images');
mkdirSync(OUT, { recursive: true });

// ---------- minimal PNG encoder (RGB, 8 bit) ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(width, height, pixel) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x / width, y / height);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- helpers ----------
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const noisy = (c, amount) => c.map((v) => clamp(v + (rand() - 0.5) * 2 * amount));

// ---------- hero: mountain landscape ----------
function hero(u, v) {
  let c = mix([28, 58, 138], [250, 172, 120], Math.min(1, v / 0.6));
  const dx = u - 0.7, dy = (v - 0.33) * (7 / 12);
  if (Math.hypot(dx, dy) < 0.05) c = [255, 236, 190];
  const ridge1 = 0.52 + 0.07 * Math.sin(u * 7) + 0.04 * Math.sin(u * 19 + 1);
  const ridge2 = 0.66 + 0.05 * Math.sin(u * 11 + 2) + 0.025 * Math.sin(u * 31);
  if (v > ridge1) c = mix([88, 92, 140], [60, 66, 108], (v - ridge1) * 4);
  if (v > ridge2) c = mix([46, 56, 86], [30, 38, 60], (v - ridge2) * 4);
  if (v > 0.86) c = mix([24, 34, 58], [14, 20, 34], (v - 0.86) * 7);
  return noisy(c, 7); // "photographic" grain makes lossless PNG huge – exactly the point
}

// ---------- product photos ----------
const PRODUCT_COLORS = [
  [231, 76, 60], [52, 152, 219], [46, 204, 113], [155, 89, 182], [241, 196, 15], [26, 188, 156],
];
function product(color) {
  return (u, v) => {
    let c = mix([245, 245, 242], [215, 215, 210], v);
    const d = Math.hypot((u - 0.5) * 4 / 3, v - 0.5);
    if (d < 0.3) c = mix(color, color.map((x) => x * 0.55), d / 0.3);
    if (v > 0.82 && Math.abs(u - 0.5) < 0.3) c = mix(c, [0, 0, 0], 0.12); // shadow
    return noisy(c, 10);
  };
}

function has(cmd) {
  try {
    execFileSync('which', [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ---------- generate ----------
const heroPng = path.join(OUT, 'hero-original.png');
writeFileSync(heroPng, encodePNG(2400, 1400, hero));
console.log('✔ hero-original.png');

PRODUCT_COLORS.forEach((color, i) => {
  writeFileSync(path.join(OUT, `product-${i + 1}.png`), encodePNG(600, 450, product(color)));
  console.log(`✔ product-${i + 1}.png`);
});

for (const width of [800, 1600]) {
  const jpg = path.join(OUT, `hero-${width}.jpg`);
  if (has('sips')) {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '--resampleWidth', String(width), heroPng, '--out', jpg], { stdio: 'ignore' });
  } else if (has('magick')) {
    execFileSync('magick', [heroPng, '-resize', `${width}x`, '-quality', '72', jpg]);
  } else {
    console.warn(`⚠ neither sips nor ImageMagick found – skipping ${path.basename(jpg)}`);
    continue;
  }
  console.log(`✔ ${path.basename(jpg)}`);

  const webp = path.join(OUT, `hero-${width}.webp`);
  if (has('cwebp')) {
    execFileSync('cwebp', ['-quiet', '-q', '70', '-resize', String(width), '0', heroPng, '-o', webp]);
    console.log(`✔ ${path.basename(webp)}`);
  } else {
    console.warn(`⚠ cwebp not found – skipping ${path.basename(webp)}`);
  }
}

if (!existsSync(path.join(OUT, 'hero-1600.jpg'))) process.exitCode = 1;
