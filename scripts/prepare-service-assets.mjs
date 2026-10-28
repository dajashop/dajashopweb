import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Asset preparation only; no network requests, application build or tests.
const [kind, input] = process.argv.slice(2);
if (!['engraving', 'battery', 'strap', 'sizing', 'remote'].includes(kind) || !input) {
  throw new Error('Usage: node scripts/prepare-service-assets.mjs <kind> <source.png>');
}
const output = new URL('../public/images/services/', import.meta.url);
await mkdir(output, { recursive: true });
for (const width of [640, 960, 1600]) {
  const filename = `${kind}-${width}.webp`;
  const info = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(fileURLToPath(new URL(filename, output)));
  console.log(`${filename}: ${Math.round(info.size / 1024)} KB`);
}
const filename = `${kind}-share.jpg`;
const info = await sharp(input).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 84, mozjpeg: true }).toFile(fileURLToPath(new URL(filename, output)));
console.log(`${filename}: ${Math.round(info.size / 1024)} KB`);
