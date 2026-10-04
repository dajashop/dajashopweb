import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const inputDir = new URL('../public/images/', import.meta.url);
const outputDir = new URL('home/', inputDir);
await mkdir(outputDir, { recursive: true });

// Keep the originals for other pages. Home uses these smaller WebP copies.
const images = [
  ['banner-watches-casio.png', 'hero-casio', [768, 1280, 1920]],
  ['model_banner_bed6ebb9-b47f-438a-835e-f63534a7d455.jpg', 'hero-daniel-klein', [768, 1280, 1519]],
  ['casio-g-shock-original-ga-2100-4aer-carbon-core-guard_183960_205228.jpg', 'g-shock', [480, 768, 1280, 1600]],
  ['daniel-klain-5252.PNG', 'women-watches', [480, 960]],
  ['Casiothumb.webp', 'gifts', [480, 960, 1280]],
  ['servisthumb.png', 'service', [640, 1280, 1536]],
];

for (const [source, name, widths] of images) {
  for (const width of widths) {
    const result = await sharp(fileURLToPath(new URL(source, inputDir)))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 84, effort: 6 })
      .toFile(fileURLToPath(new URL(`${name}-${width}.webp`, outputDir)));
    console.log(`${name}-${width}.webp: ${Math.round(result.size / 1024)} KB`);
  }
}
