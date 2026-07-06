/**
 * Generate the favicon, PWA icons, and a clean display logo from the client's
 * ARYA badge photo (public/brand/arya-logo.jpeg, 1600x900). The source is a
 * photo of the round badge on a beige backdrop, so we crop tightly to the
 * badge, mask everything outside the circle to transparent (drops the beige +
 * the ragged JPEG rim), sharpen, and export at exact display sizes.
 *
 *   node scripts/gen-icons-from-logo.mjs
 *
 * Re-run if the client sends a new logo. Requires devDeps: sharp, png-to-ico.
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";

const SRC = "public/brand/arya-logo.jpeg";

async function circularBadge() {
  // Find the badge's TRUE bounding box by its darkness (it's a dark badge on a
  // light, unevenly-shadowed beige backdrop — trimming the colour photo
  // directly leaves the badge off-centre). Threshold to a black-badge-on-white
  // silhouette, then read sharp's trim offsets for exact, symmetric bounds.
  const { info } = await sharp(SRC)
    .grayscale()
    .threshold(80) // badge (dark) → 0, beige (light) → 255
    .trim({ threshold: 10, background: "#ffffff" })
    .toBuffer({ resolveWithObject: true });

  const bx = Math.abs(info.trimOffsetLeft);
  const by = Math.abs(info.trimOffsetTop);
  const side = Math.min(info.width, info.height);
  const square = await sharp(SRC)
    .extract({
      left: bx + Math.round((info.width - side) / 2),
      top: by + Math.round((info.height - side) / 2),
      width: side,
      height: side,
    })
    .png()
    .toBuffer();

  // The physical badge is photographed at a slight tilt, so it's mildly
  // elliptical — a single circle mask can't hug it without leaving a beige
  // crescent. Instead: back it with a clean disc of the badge's OWN dark
  // background colour, then overlay only the badge's inner circle. The disc
  // fills the thin rim where the beige was; the seam is dark-on-dark.
  const c = side / 2;

  // Sample the badge's background colour from a dark point just inside the top
  // rim (x = centre, y = 8% down) so the backing disc matches exactly.
  const px = await sharp(square)
    .extract({ left: Math.round(c), top: Math.round(side * 0.08), width: 1, height: 1 })
    .raw()
    .toBuffer();
  const bg = `rgb(${px[0]},${px[1]},${px[2]})`;

  const discR = Math.round(c - 2); // clean outer disc
  const contentR = Math.round(c - side * 0.05); // inner circle, excludes beige rim

  const contentMask = Buffer.from(
    `<svg width="${side}" height="${side}"><circle cx="${c}" cy="${c}" r="${contentR}" fill="#fff"/></svg>`,
  );
  const content = await sharp(square)
    .composite([{ input: contentMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const disc = Buffer.from(
    `<svg width="${side}" height="${side}"><circle cx="${c}" cy="${c}" r="${discR}" fill="${bg}"/></svg>`,
  );
  return sharp(disc)
    .composite([{ input: content }])
    .png()
    .toBuffer();
}

async function emit(badge, size, path) {
  await sharp(badge)
    .resize(size, size, { fit: "cover" })
    .sharpen({ sigma: 1 })
    .png()
    .toFile(path);
  console.log(`✓ ${path} (${size}px)`);
}

const badge = await circularBadge();

// PWA + apple icons (referenced by manifest + layout metadata).
await emit(badge, 192, "public/icons/icon-192.png");
await emit(badge, 512, "public/icons/icon-512.png");
await emit(badge, 180, "public/icons/apple-touch-icon.png");

// Clean display asset for the header/footer (replaces the ragged .jpeg use).
await emit(badge, 256, "public/brand/arya-logo.png");

// Browser-tab favicon: multi-size .ico from crisp small PNGs.
const ico16 = await sharp(badge).resize(16, 16).sharpen({ sigma: 1 }).png().toBuffer();
const ico32 = await sharp(badge).resize(32, 32).sharpen({ sigma: 1 }).png().toBuffer();
const ico48 = await sharp(badge).resize(48, 48).sharpen({ sigma: 1 }).png().toBuffer();
await writeFile("public/favicon.ico", await pngToIco([ico16, ico32, ico48]));
console.log("✓ public/favicon.ico (16/32/48)");
