import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { serviceCatalog } from '../src/data/serviceCatalog.js';

// Social previews only. The pages themselves use small inline SVG illustrations.
const output = new URL('../public/images/services/', import.meta.url);
await mkdir(output, { recursive: true });
const escapeXml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
function linesOf(text, length = 22) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const last = lines.length - 1;
    if (lines[last] && `${lines[last]} ${word}`.length > length) lines.push(word);
    else lines[last] += `${lines[last] ? ' ' : ''}${word}`;
  }
  return lines;
}
const pages = [
  { slug: 'usluge', title: 'Usluge u Nišu', category: 'Pažnja je u detaljima.', tagline: 'Graviranje · Satovi · Daljinski' },
  ...serviceCatalog
];
for (const [index, page] of pages.entries()) {
  const lines = linesOf(page.title);
  const title = lines.map((line, row) => `<tspan x="72" y="${245 + row * 68}">${escapeXml(line)}</tspan>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#f5f5f7"/>
    <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="#d7d7dc"/>
    <g font-family="Arial, sans-serif" fill="#171717">
      <text x="72" y="93" font-size="23" font-weight="700" letter-spacing="4">DAJASHOP</text>
      <text x="1128" y="93" font-size="18" text-anchor="end" fill="#66666d">NIŠ · USLUGE U RADNJI</text>
      <text x="72" y="173" font-size="17" fill="#66666d">${escapeXml(page.category)}</text>
      <text font-size="56" font-weight="600" letter-spacing="-1.8">${title}</text>
      <text x="72" y="${270 + lines.length * 68}" font-size="23" fill="#66666d">${escapeXml(page.tagline)}</text>
      <path d="M72 500h1056" stroke="#d7d7dc"/>
      <text x="72" y="551" font-size="20">dajashop.rs/usluge</text>
      <text x="1128" y="551" font-size="18" text-anchor="end" fill="#66666d">Detalji koji znače.</text>
    </g>
    <g transform="translate(960 304)" fill="none" stroke="#6e6e73">
      <circle r="135" opacity=".2"/><circle r="116" stroke-dasharray="2 7" opacity=".35"/>
      <rect x="-27" y="-119" width="54" height="238" rx="10" fill="#f5f5f7" stroke-width="2"/>
      <circle r="78" fill="#f5f5f7" stroke-width="2"/><circle r="67" opacity=".5"/>
      <path d="M0-55v8M55 0h-8M0 55v-8M-55 0h8"/>
      <text y="12" text-anchor="middle" fill="#171717" stroke="none" font-family="Arial, sans-serif" font-size="34">${index ? `0${index}` : 'DA'}</text>
    </g>
  </svg>`;
  const target = fileURLToPath(new URL(`${page.slug}.jpg`, output));
  const info = await sharp(Buffer.from(svg)).jpeg({ quality: 85, mozjpeg: true }).toFile(target);
  console.log(`${page.slug}.jpg: ${Math.round(info.size / 1024)} KB`);
}
