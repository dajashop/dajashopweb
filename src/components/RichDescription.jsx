import { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { descriptionHtml, descriptionText } from './description';
import './rich-description.css';

export function RichDescription({ value, onChange, disabled = false, maxLength = 4000 }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ left: 12, top: 12, width: 560 });
  const trigger = useRef(null);
  const editor = useRef(null);
  const panel = useRef(null);
  const accepted = useRef(value);
  const id = useId();
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    accepted.current = descriptionHtml(value);
    if (editor.current) { editor.current.innerHTML = accepted.current; editor.current.focus(); }
    setError('');
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(600, window.innerWidth - 24);
      const height = Math.min(panel.current?.offsetHeight || 400, window.innerHeight - 24);
      const below = rect.bottom + 6;
      setPosition({ width, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(below + height <= window.innerHeight - 12 ? below : rect.top - height - 6, window.innerHeight - height - 12)) });
    };
    place();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      if (event.key === 'Tab') {
        event.stopImmediatePropagation();
        const elements = [...panel.current.querySelectorAll('button, [contenteditable="true"]')];
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  // The editable DOM owns the selection until this panel closes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const publish = () => {
    if (!editor.current) return;
    const html = descriptionHtml(editor.current.innerHTML);
    const next = descriptionText(html) ? html : '';
    if (next.length > maxLength) {
      editor.current.innerHTML = accepted.current;
      setError(`Opis je predugačak (najviše ${maxLength} znakova sa formatiranjem).`);
      return;
    }
    accepted.current = next;
    setError('');
    onChange(next);
  };
  const command = (name, argument) => {
    editor.current?.focus();
    document.execCommand(name, false, argument);
    publish();
  };
  const move = (direction) => {
    const selection = window.getSelection();
    let block = selection?.anchorNode;
    if (!block || block === editor.current || !editor.current?.contains(block)) return;
    while (block.parentNode && block.parentNode !== editor.current && block.parentNode.nodeName !== 'UL' && block.parentNode.nodeName !== 'OL') block = block.parentNode;
    const sibling = direction < 0 ? block.previousSibling : block.nextSibling;
    if (!sibling) return;
    if (direction < 0) block.parentNode.insertBefore(block, sibling);
    else block.parentNode.insertBefore(sibling, block);
    const range = document.createRange(); range.selectNodeContents(block); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); editor.current.focus(); publish();
  };
  const tools = [['Podebljano', 'bold'], ['Kurziv', 'italic'], ['Podvučeno', 'underline'], ['Lista •', 'insertUnorderedList'], ['Lista 1.', 'insertOrderedList'], ['Pasus', 'formatBlock', 'p'], ['Naslov', 'formatBlock', 'h3'], ['Ukloni format', 'removeFormat'], ['Poništi', 'undo'], ['Ponovi', 'redo']];
  return <div>
    <span className="description-label" id={`${id}-label`}>Opis (opciono)</span>
    <button className="description-trigger" type="button" ref={trigger} disabled={disabled} aria-labelledby={`${id}-label`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(true)}><span>{descriptionText(value).replace(/\n/g, ' ') || 'Dodajte i uredite opis…'}</span><small>Uredi ▾</small></button>
    {open && createPortal(<div className="description-overlay" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="description-panel" ref={panel} style={position} id={id} role="dialog" aria-modal="true" aria-label="Uredi opis" onMouseDown={(event) => event.stopPropagation()}>
        <header><strong>Uredi opis</strong><button type="button" onClick={close} aria-label="Zatvori editor">✕</button></header>
        <div className="description-toolbar" role="toolbar" aria-label="Formatiranje opisa">{tools.map(([label, name, argument]) => <button type="button" key={name + label} onMouseDown={(event) => event.preventDefault()} onClick={() => command(name, argument)}>{label}</button>)}<button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => move(-1)} title="Pomeri izabrani pasus ili stavku liste gore">↑ Gore</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => move(1)} title="Pomeri izabrani pasus ili stavku liste dole">↓ Dole</button></div>
        <div className="description-content rich-description" ref={editor} contentEditable suppressContentEditableWarning role="textbox" tabIndex={0} aria-multiline="true" aria-label="Opis artikla" onInput={publish} onPaste={(event) => { event.preventDefault(); command('insertText', event.clipboardData.getData('text/plain')); }} />
        {error && <p className="description-error" role="alert">{error}</p>}
        <footer><span>Enter: novi pasus · Izmene ulaze u obrazac</span><button type="button" onClick={close}>Gotovo</button></footer>
      </section>
    </div>, document.body)}
  </div>;
}
