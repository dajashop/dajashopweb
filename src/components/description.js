import { decodeHTML } from 'entities';

const allowed = new Set(['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'blockquote']);
const escapeText = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function descriptionHtml(value = '') {
  value = String(value ?? '');
  if (!/<\/?[a-z][^>]*>/i.test(value)) {
    return value.split(/\r?\n/).map(line => `<p>${line ? escapeText(line) : '<br>'}</p>`).join('');
  }
  // The same allowlist runs in the Worker and browser, without a DOM. Rebuild
  // tags rather than trusting attributes, URLs, event handlers or raw markup.
  const stack = [];
  const source = value
    .replace(/<(script|style|iframe|object|svg|math|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|svg|math|template)\b[^>]*>[\s\S]*$/gi, '');
  let output = '';
  for (const token of source.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+|</g) || []) {
    if (token.startsWith('<!--')) continue;
    if (!token.startsWith('<')) { output += escapeText(decodeHTML(token)); continue; }
    const tag = token.match(/^<\s*(\/?)\s*([a-z][a-z0-9]*)\b[^>]*>$/i);
    if (!tag) { output += escapeText(token); continue; }
    const name = tag[2].toLowerCase();
    if (!allowed.has(name)) continue;
    if (name === 'br') { output += '<br>'; continue; }
    if (tag[1]) {
      const index = stack.lastIndexOf(name);
      if (index !== -1) while (stack.length > index) output += `</${stack.pop()}>`;
    } else {
      // Avoid browser repair of nested paragraphs, which would break hydration.
      if (['p', 'div', 'ul', 'ol', 'h3', 'blockquote'].includes(name) && stack.includes('p')) {
        while (stack.includes('p')) output += `</${stack.pop()}>`;
      }
      output += `<${name}>`; stack.push(name);
    }
  }
  while (stack.length) output += `</${stack.pop()}>`;
  return output;
}

export function descriptionText(value = '') {
  return decodeHTML(descriptionHtml(value)
    .replace(/<br>|<\/(?:p|div|h3|li|blockquote)>/g, '\n')
    .replace(/<[^>]*>/g, ''))
    .replace(/\n{3,}/g, '\n\n').trim();
}

// A short plain-text summary for meta, Open Graph and Twitter descriptions.
export function metaDescription(value = '', firstParagraph = false) {
  // Inline line breaks stay in their paragraph; block endings mark its boundary.
  const source = firstParagraph ? descriptionHtml(value).replace(/<br\s*\/?>/gi, ' ').replace(/[\r\n]+/g, ' ') : value;
  let text = descriptionText(source);
  if (firstParagraph) text = text.split(/\r?\n/).find(paragraph => paragraph.trim()) || '';
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text;
  const shortened = text.slice(0, 159);
  const boundary = shortened.lastIndexOf(' ');
  return (boundary > 100 ? shortened.slice(0, boundary) : shortened).trimEnd() + '…';
}
