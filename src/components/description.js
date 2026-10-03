const allowed = new Set(['P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'H3', 'BLOCKQUOTE']);

export function descriptionHtml(value = '') {
  value = String(value ?? '');
  const doc = document.implementation.createHTMLDocument('');
  const root = doc.createElement('div');
  if (!/<\/?[a-z][^>]*>/i.test(value)) {
    for (const line of value.split(/\r?\n/)) {
      const p = doc.createElement('p');
      p.textContent = line;
      if (!line) p.append(doc.createElement('br'));
      root.append(p);
    }
  } else {
    root.innerHTML = value;
    const clean = (parent) => {
      for (const child of [...parent.children]) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'MATH', 'TEMPLATE'].includes(child.tagName)) {
          child.remove();
          continue;
        }
        clean(child);
        if (!allowed.has(child.tagName)) child.replaceWith(...child.childNodes);
        else for (const attr of [...child.attributes]) child.removeAttribute(attr.name);
      }
    };
    clean(root);
  }
  return root.innerHTML;
}

export function descriptionText(value = '') {
  const root = document.createElement('div');
  root.innerHTML = descriptionHtml(value);
  for (const block of root.querySelectorAll('p, div, h3, li, blockquote, br')) block.append('\n');
  return (root.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
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
