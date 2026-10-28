import english from './en.json';

const normalize = value => value.normalize('NFC').replace(/\s+/g, ' ').trim();
const exact = new Map(Object.entries(english));
const fold = value => value.toLocaleLowerCase('sr-Latn').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'dj');
const folded = new Map(Object.entries(english).map(([key, value]) => [fold(key), value]));
const patterns = Object.entries(english).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => {
  const parts = key.split(/(\{\d+\})/);
  const slots = [];
  const pattern = parts.map(part => {
    if (/^\{\d+\}$/.test(part)) { slots.push(part); return '(.+?)'; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { regex: new RegExp(`^${pattern}$`, 'u'), value, slots, length: key.length };
}).sort((a, b) => b.length - a.length);

// Serbian text is the source key. Unknown content stays intact, including
// product names, customer reviews and user-entered engraving text.
export function translate(value, language = 'sr', parameters) {
  if (Array.isArray(value)) return value.map(item => translate(item, language, parameters));
  if (typeof value !== 'string' || !value) return value;
  if (language !== 'en') return parameters ? value.replace(/\{([^}]+)\}/g, (match, name) => parameters[name] ?? match) : value;
  const key = normalize(value);
  if (!key) return value;
  let translated = exact.get(key) ?? folded.get(fold(key));
  if (translated === undefined) {
    for (const entry of patterns) {
      const match = key.match(entry.regex);
      if (!match) continue;
      const values = Object.fromEntries(entry.slots.map((slot, index) => [slot, match[index + 1]]));
      translated = entry.value.replace(/\{\d+\}/g, slot => values[slot] ?? slot);
      break;
    }
  }
  if (translated === undefined) return parameters ? value.replace(/\{([^}]+)\}/g, (match, name) => parameters[name] ?? match) : value;
  if (parameters) translated = translated.replace(/\{([^}]+)\}/g, (match, name) => parameters[name] ?? match);
  return `${value.match(/^\s*/)[0]}${translated}${value.match(/\s*$/)[0]}`;
}
