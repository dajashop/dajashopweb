import { newText, normalizeDesign, outsideZone } from './design';
export const FACTORY_RADIUS = 190;
export function overlapsFactory(layer) {
  if (layer.type === 'text' && layer.curve !== 'straight') return Math.hypot(layer.x - 500, layer.y - 500) + FACTORY_RADIUS >= layer.radius - layer.fontSize;
  const angle = -layer.rotation * Math.PI / 180;
  const dx = 500 - layer.x; const dy = 500 - layer.y;
  const x = dx * Math.cos(angle) - dy * Math.sin(angle); const y = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.hypot(Math.max(0, Math.abs(x) - layer.width / 2), Math.max(0, Math.abs(y) - layer.height / 2)) < FACTORY_RADIUS;
}
function parsedDate(text) {
  const match = text.match(/(?:^|\s)(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})\.?)(?=$|\s)/);
  if (!match) return null;
  const year = Number(match[1] || match[6]); const month = Number(match[2] || match[5]); const day = Number(match[3] || match[4]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? { day, month, year } : null;
}
export function classifyContent(layers) {
  const text = layers.filter((layer) => layer.type === 'text').map((layer) => layer.text).join('\n');
  if (layers.some((layer) => layer.type === 'image')) return text.trim() ? 'Tekst i slika' : 'Slika / logo';
  if (parsedDate(text)) return 'Prepoznat datum';
  if (/^[\s♥♡∞★✦☀☾✿❀☺♛⚓✝\p{Extended_Pictographic}]+$/u.test(text)) return 'Simboli';
  return text.includes('\n') ? 'Poruka u više redova' : 'Lična poruka';
}
const styles = [
  { name: 'Klasični', font: 'serif', italic: false, bold: false },
  { name: 'Moderni', font: 'sans', italic: false, bold: false },
  { name: 'Elegantni', font: 'serif', italic: true, bold: false },
  { name: 'Rukopis', font: 'hand', italic: false, bold: false },
  { name: 'Mono', font: 'mono', italic: false, bold: false },
  { name: 'Podebljani', font: 'sans', italic: false, bold: true },
];
const layouts = [
  { key: 'upper', name: 'Gornji luk', curve: 'upper' },
  { key: 'lower', name: 'Donji luk', curve: 'lower' },
  { key: 'paired', name: 'Dva luka', curve: 'upper' },
  { key: 'top', name: 'Iznad fabričke gravure', curve: 'straight' },
  { key: 'bottom', name: 'Ispod fabričke gravure', curve: 'straight' },
  { key: 'sides', name: 'Uz ivicu', curve: 'straight' },
];
function fit(layer, reserveCenter, maxArcWidth) {
  let next = normalizeDesign({ layers: [layer] }).layers[0];
  const valid = () => !outsideZone(next) && (!reserveCenter || !overlapsFactory(next));
  if (layer.type === 'image') {
    while (!valid() && next.width > 20 && next.height > 20) next = { ...next, width: next.width * .92, height: next.height * .92 };
  } else {
    const measureWidth = () => normalizeDesign({ layers: [{ ...next, curve: 'straight', text: next.text.replace(/\n/g, ' ') }] }).layers[0].width;
    while ((!valid() || maxArcWidth && measureWidth() > maxArcWidth) && next.fontSize > 14) next = normalizeDesign({ layers: [{ ...next, fontSize: next.fontSize - 1 }] }).layers[0];
    if (maxArcWidth && measureWidth() > maxArcWidth) return null;
  }
  return valid() ? next : null;
}
function arcCollision(arc, other) {
  const dx = other.x - arc.x; const dy = other.y - arc.y;
  const distance = Math.hypot(dx, dy); const half = Math.hypot(other.width, other.height) / 2;
  if (Math.abs(distance - arc.radius) > half + arc.fontSize) return false;
  if (arc.curve === 'circle') return true;
  const width = normalizeDesign({ layers: [{ ...arc, curve: 'straight', text: arc.text.replace(/\n/g, ' ') }] }).layers[0].width;
  const span = Math.min(arc.arc * Math.PI / 180, width / arc.radius);
  const center = (arc.curve === 'lower' ? Math.PI / 2 : -Math.PI / 2) + (arc.angle + arc.rotation) * Math.PI / 180;
  const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - center), Math.cos(Math.atan2(dy, dx) - center));
  return Math.abs(delta) < span / 2 + Math.atan2(half, Math.max(1, distance));
}
export function generateSuggestions(design) {
  const source = design.layers.filter((layer) => layer.type === 'image' || layer.text.trim());
  if (!source.length) return [];
  const reserveCenter = design.reserveCenter !== false;
  const candidates = []; const seen = new Set();
  const arrangements = reserveCenter ? layouts : [...layouts, { key: 'center', name: 'U sredini', curve: 'straight' }, { key: 'circle', name: 'Puni krug', curve: 'circle' }];
  for (const layout of arrangements) for (const style of styles) for (const size of [44, 30]) {
    const layers = source.map((original, index) => {
      const lane = index % 2; const row = Math.floor(index / 2); const slots = Math.ceil(source.length / 2);
      const angle = slots > 1 ? (row - (slots - 1) / 2) * (120 / slots) : 0;
      let next = { ...original, x: 500, y: 500, rotation: 0 };
      if (original.type === 'image') {
        const base = source.some((item) => item.type === 'text') ? -90 : layout.key === 'lower' || layout.key === 'bottom' ? 90 : layout.key === 'sides' ? 180 : -90;
        const theta = (base + index * 360 / source.length) * Math.PI / 180;
        const scale = Math.min(size === 44 ? 150 : 100, 600 / source.length) / Math.max(original.width, original.height);
        next = { ...next, x: 500 + Math.cos(theta) * (reserveCenter ? 305 : 200), y: 500 + Math.sin(theta) * (reserveCenter ? 305 : 200), width: original.width * scale, height: original.height * scale };
      } else {
        next = { ...next, ...style, fontSize: size, curve: layout.curve, align: 'center', letterSpacing: 0, lineSpacing: 1.2, radius: 310, arc: Math.max(30, 150 / slots), angle };
        delete next.name;
        if (source.some((item) => item.type === 'image') && next.curve !== 'straight') { const theta = -90 + index * 360 / source.length; next.curve = theta > 0 && theta < 180 ? 'lower' : 'upper'; next.angle = ((theta - (next.curve === 'lower' ? 90 : -90) + 540) % 360) - 180; }
        if (layout.key === 'lower' && !source.some((item) => item.type === 'image')) next.angle = -angle;
        if (layout.key === 'paired' && !source.some((item) => item.type === 'image')) { next.curve = lane ? 'lower' : 'upper'; next.angle = lane ? -angle : angle; }
        if (layout.key === 'top' || layout.key === 'bottom') { next.x = 500 + (row - (slots - 1) / 2) * (160 / slots); next.y = layout.key === 'top' ? 200 + lane * 25 : 800 - lane * 25; }
        if (layout.key === 'sides') { next.x = lane ? 800 : 200; next.y = 500 + (row - (slots - 1) / 2) * (160 / slots); next.rotation = lane ? 90 : -90; }
        if (layout.key === 'center') next.y = 500 + (index - (source.length - 1) / 2) * 85;
      }
      if (next.type === 'image' && layout.key === 'center') { next.x = 500; next.y = 500 + (index - (source.length - 1) / 2) * 180; }
      return fit(next, reserveCenter, next.type === 'text' && next.curve !== 'straight' && next.curve !== 'circle' ? next.radius * next.arc * Math.PI / 180 : null);
    });
    if (layers.some((layer) => !layer)) continue;
    // Avoid offering overlapping copies when a message contains several elements.
    if (layers.some((a, i) => layers.slice(i + 1).some((b) => {
      if (a.type === 'text' && b.type === 'text' && a.curve !== 'straight' && b.curve !== 'straight') return a.curve === b.curve && Math.abs(a.angle - b.angle) < Math.max(a.arc, b.arc) / 2;
      if (a.type === 'text' && a.curve !== 'straight') return arcCollision(a, b);
      if (b.type === 'text' && b.curve !== 'straight') return arcCollision(b, a);
      return Math.hypot(a.x - b.x, a.y - b.y) < (Math.hypot(a.width, a.height) + Math.hypot(b.width, b.height)) / 2;
    }))) continue;
    const signature = JSON.stringify(layers);
    if (seen.has(signature)) continue; seen.add(signature);
    candidates.push({ id: `${layout.key}-${style.font}-${style.italic}-${style.bold}-${size}`, name: source.some((item) => item.type === 'text') ? `${layout.name} · ${style.name}` : layout.name, detail: size === 44 ? 'Istaknuto' : 'Diskretno', design: { ...design, layers } });
  }
  // Mix layouts and typefaces in the first screen instead of showing a single layout repeatedly.
  const groups = arrangements.map((layout) => candidates.filter((candidate) => candidate.id.startsWith(`${layout.key}-`))).filter((group) => group.length);
  candidates.length = 0;
  const rounds = Math.max(0, ...groups.map((group) => group.length));
  for (let round = 0; round < rounds; round++) groups.forEach((group, index) => { if (round < group.length) candidates.push(group[(round + index * 2) % group.length]); });
  // Date alternatives are explicit choices; mixed messages always retain their exact text.
  if (source.length === 1 && source[0].type === 'text' && parsedDate(source[0].text.trim())) {
    const date = parsedDate(source[0].text.trim());
    const exact = /^(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{4}\.?)$/.test(source[0].text.trim());
    if (exact) for (const formatted of [`${String(date.day).padStart(2, '0')}.${String(date.month).padStart(2, '0')}.${date.year}.`, `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`, new Date(date.year, date.month - 1, date.day).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' })]) {
      const layer = fit({ ...source[0], text: formatted, font: 'serif', fontSize: 38, curve: 'upper', radius: 310, angle: 0, arc: 160, x: 500, y: 500, rotation: 0 }, reserveCenter, 800);
      if (layer) candidates.unshift({ id: `date-${formatted}`, name: 'Drugačiji zapis datuma', detail: formatted, design: { ...design, layers: [layer] } });
    }
  }
  return candidates;
}
export function starterDesign(design, message) { return { ...design, layers: message.split('\n').map((text) => newText(text)) }; }