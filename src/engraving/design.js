export const FONTS = { sans: 'Gravura Sans', serif: 'Gravura Serif', mono: 'Gravura Mono', hand: 'Gravura Rukopis' };
export const newText = (text = 'Zauvek tvoj ♥') => ({ id: crypto.randomUUID(), type: 'text', text, font: 'serif', fontSize: 44, bold: false, italic: false, align: 'center', letterSpacing: 0, lineSpacing: 1.3, curve: 'straight', radius: 260, angle: 0, arc: 160, x: 500, y: 500, rotation: 0, width: 360, height: 58, locked: false });
export function diameterOf(product) {
  const entries = Object.entries(product.specs || product.specifications || {});
  const value = entries.find(([key]) => /pre[cč]nik|diameter/i.test(key))?.[1];
  const diameter = parseFloat(String(value ?? '').replace(',', '.'));
  return diameter >= 20 && diameter <= 70 ? diameter : 40;
}
const glyphs = (text) => typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter('sr', { granularity: 'grapheme' }).segment(text)].map((part) => part.segment) : Array.from(text);
export async function loadFonts() {
  await Promise.all([...Object.values(FONTS).map((font) => document.fonts.load(`44px "${font}"`, 'АБВабвČćŠšŽžĐđ')), document.fonts.load('44px "Gravura Emoji"', '😊🌙🐾♥')]);
}
export function canvasOf(size = 1000) { const canvas = document.createElement('canvas'); canvas.width = canvas.height = size; return canvas; }
function setFont(ctx, layer) { ctx.font = `${layer.italic ? 'italic' : 'normal'} ${layer.bold ? 700 : 400} ${layer.fontSize}px "${FONTS[layer.font]}", "Gravura Emoji"`; ctx.textBaseline = 'middle'; }
export function normalizeDesign(design) {
  const ctx = canvasOf().getContext('2d');
  return { ...design, layers: design.layers.map((layer) => {
    if (layer.type !== 'text') return layer;
    setFont(ctx, layer);
    const lines = layer.text.replace(/\uFE0F/g, '').split('\n');
    const width = Math.max(1, ...lines.map((text) => glyphs(text).reduce((sum, char) => sum + ctx.measureText(char).width, 0) + Math.max(0, glyphs(text).length - 1) * layer.letterSpacing));
    const curved = layer.curve !== 'straight';
    return { ...layer, width: curved ? 2 * (layer.radius + layer.fontSize) : width, height: curved ? 2 * (layer.radius + layer.fontSize) : Math.max(1, lines.length * layer.fontSize * layer.lineSpacing) };
  }) };
}
export function outsideZone(layer) {
  const radius = layer.type === 'text' && layer.curve !== 'straight' ? layer.radius + layer.fontSize : Math.hypot(layer.width, layer.height) / 2;
  return Math.hypot(layer.x - 500, layer.y - 500) + radius > 410 || layer.width > 1000 || layer.height > 1000;
}
export function loadImage(url) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('Slika nije dostupna.')); img.src = url; }); }
export async function importImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Izaberite PNG, JPEG ili WebP do 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let size = 768;
    while (size >= 192) {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const canvas = canvasOf(); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl.length <= 700000) return { id: crypto.randomUUID(), dataUrl, ratio: canvas.width / canvas.height };
      size = Math.floor(size * 0.7);
    }
    throw new Error('Slika je previše složena. Smanjite je i pokušajte ponovo.');
  } finally { URL.revokeObjectURL(url); }
}
async function monochrome(layer, assets) {
  const source = assets.find((asset) => asset.id === layer.assetId);
  if (!source) throw new Error('Nedostaje slika u nacrtu.');
  const img = await loadImage(source.dataUrl);
  const canvas = canvasOf(); canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  const pixels = ctx.getImageData(0, 0, img.width, img.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const gray = (0.2126 * pixels.data[i] + 0.7152 * pixels.data[i + 1] + 0.0722 * pixels.data[i + 2] - 128) * layer.contrast + 128;
    const dark = layer.invert ? gray >= layer.threshold : gray < layer.threshold;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 20;
    if (!dark) pixels.data[i + 3] = 0;
  }
  ctx.putImageData(pixels, 0, 0); return canvas;
}
export async function renderDesign(design, assets = [], { metal = false, guides = false, selected = null } = {}) {
  await loadFonts(); const canvas = canvasOf(); const ctx = canvas.getContext('2d');
  if (metal) {
    const gradient = ctx.createLinearGradient(0, 0, 1000, 1000);
    [[0, '#aeb2b8'], [0.24, '#f7f8f9'], [0.47, '#c6cbd0'], [0.72, '#eef0f2'], [1, '#969ca4']].forEach(([at, color]) => gradient.addColorStop(at, color));
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1000, 1000);
    for (let radius = 2; radius < 710; radius += 1.7) {
      ctx.strokeStyle = radius % 5 < 2 ? 'rgba(255,255,255,.18)' : 'rgba(55,60,65,.055)';
      ctx.lineWidth = .65; ctx.beginPath(); ctx.arc(500, 500, radius, 0, Math.PI * 2); ctx.stroke();
    }
  }
  for (const layer of design.layers) {
    ctx.save(); ctx.translate(layer.x, layer.y); ctx.rotate(layer.rotation * Math.PI / 180); ctx.fillStyle = '#141414';
    if (layer.type === 'image') ctx.drawImage(await monochrome(layer, assets), -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    else {
      setFont(ctx, layer);
      if (layer.curve !== 'straight') {
        const chars = glyphs(layer.text.replace(/\uFE0F/g, '').replace(/\n/g, ' ')); const lower = layer.curve === 'lower';
        const span = layer.curve === 'circle' ? Math.PI * 2 : Math.min(layer.arc * Math.PI / 180, chars.reduce((sum, char) => sum + ctx.measureText(char).width + layer.letterSpacing, 0) / layer.radius);
        const widths = chars.map((char) => Math.max(1, ctx.measureText(char).width + layer.letterSpacing)); const total = widths.reduce((a, b) => a + b, 0);
        let cursor = -span / 2;
        chars.forEach((char, index) => {
          const step = widths[index] / total * span;
          const theta = (lower ? Math.PI / 2 : -Math.PI / 2) + layer.angle * Math.PI / 180 + (lower ? -1 : 1) * (cursor + step / 2);
          ctx.save(); ctx.translate(Math.cos(theta) * layer.radius, Math.sin(theta) * layer.radius); ctx.rotate(theta + (lower ? -Math.PI / 2 : Math.PI / 2)); ctx.textAlign = 'center'; ctx.fillText(char, 0, 0); ctx.restore(); cursor += step;
        });
      } else {
        const lines = layer.text.replace(/\uFE0F/g, '').split('\n');
        lines.forEach((text, index) => {
          const chars = glyphs(text); const width = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + Math.max(0, chars.length - 1) * layer.letterSpacing;
          let x = layer.align === 'left' ? -layer.width / 2 : layer.align === 'right' ? layer.width / 2 - width : -width / 2;
          ctx.textAlign = 'left'; chars.forEach((char) => { ctx.fillText(char, x, (index - (lines.length - 1) / 2) * layer.fontSize * layer.lineSpacing); x += ctx.measureText(char).width + layer.letterSpacing; });
        });
      }
    }
    ctx.restore();
  }
  // Emoji use the same frozen monochrome raster as text, preview and all exports.
  if (!metal) {
    const pixels = ctx.getImageData(0, 0, 1000, 1000);
    for (let i = 0; i < pixels.data.length; i += 4) pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 20;
    ctx.putImageData(pixels, 0, 0);
  }
  if (guides) {
    ctx.strokeStyle = '#8ba6e8'; ctx.lineWidth = 2; ctx.setLineDash([9, 8]); ctx.beginPath(); ctx.arc(500, 500, 410, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#75829b'; ctx.font = '24px "Gravura Sans"'; ctx.textAlign = 'center'; ctx.fillText('ⓘ  Zona graviranja', 500, 850);
    const layer = design.layers.find((item) => item.id === selected);
    if (layer) { ctx.save(); ctx.translate(layer.x, layer.y); ctx.rotate(layer.rotation * Math.PI / 180); ctx.strokeStyle = outsideZone(layer) ? '#d82b2b' : '#a0b5e7'; ctx.lineWidth = 1.5; ctx.setLineDash([9, 8]); if (layer.type === 'text' && layer.curve !== 'straight') { ctx.beginPath(); ctx.arc(0, 0, layer.radius + layer.fontSize, 0, Math.PI * 2); ctx.stroke(); } else ctx.strokeRect(-layer.width / 2 - 8, -layer.height / 2 - 8, layer.width + 16, layer.height + 16); ctx.restore(); }
  }
  return canvas;
}
export async function previewOf(design, assets) {
  const art = await renderDesign(design, assets); const canvas = canvasOf(320); const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#e3e4e6'; ctx.beginPath(); ctx.arc(160, 160, 155, 0, Math.PI * 2); ctx.fill(); ctx.drawImage(art, 5, 5, 310, 310); return canvas.toDataURL('image/png');
}
export async function snapshotOf(design, assets) { return (await renderDesign(design, assets)).toDataURL('image/png'); }
export function downloadFile(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
