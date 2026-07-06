/**
 * Generate PWA icons with zero dependencies (Node's zlib only). Draws the
 * brand mark — a cream globule with a sage crescent (homeopathy pill /
 * leaf) on the sage brand background — as real raster PNGs.
 *
 *   node scripts/gen-icons.mjs
 */
import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

const SAGE = [124, 138, 107];
const CREAM = [250, 246, 236];

// CRC32 (PNG chunk checksum)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Coverage of a disc at pixel (x,y) with 2×2 supersampling → soft edges. */
function discCoverage(x, y, cx, cy, r) {
  let hits = 0;
  for (const dx of [0.25, 0.75])
    for (const dy of [0.25, 0.75]) {
      const ddx = x + dx - cx;
      const ddy = y + dy - cy;
      if (ddx * ddx + ddy * ddy <= r * r) hits++;
    }
  return hits / 4;
}

function render(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;
  const rGlobule = size * 0.3;
  // Crescent = globule disc minus an offset "bite" disc (up-right).
  const rBite = size * 0.26;
  const biteX = cx + size * 0.11;
  const biteY = cy - size * 0.11;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      let color = SAGE;
      const g = discCoverage(x, y, cx, cy, rGlobule);
      if (g > 0) {
        const bite = discCoverage(x, y, biteX, biteY, rBite);
        const crescent = Math.max(0, g - bite); // cream where globule but not bite
        color = mix(SAGE, CREAM, crescent);
      }
      const o = rowStart + 1 + x * 4;
      raw[o] = color[0];
      raw[o + 1] = color[1];
      raw[o + 2] = color[2];
      raw[o + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return png;
}

mkdirSync(OUT, { recursive: true });
for (const [name, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  writeFileSync(join(OUT, name), render(size));
  console.log("wrote", name);
}
