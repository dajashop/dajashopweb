import React, { useEffect, useRef, useState } from "react";
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import "./Pagination.css";

export default function Pagination({ page, total, perPage, onChange, getPageUrl }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const navRef = useRef(null);
  const [pageSlots, setPageSlots] = useState(10);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const update = () => {
      const width = nav.clientWidth;
      // Hidden/transitional layouts must not collapse the page window to one.
      if (!width) return;
      const buttons = [...nav.querySelectorAll('.pagination__btn')];
      const arrows = buttons.filter(button => button.querySelector('svg') && window.getComputedStyle(button).display !== 'none');
      const arrowWidth = arrows.reduce((sum, button) => sum + button.getBoundingClientRect().width, 0);
      const gap = parseFloat(window.getComputedStyle(nav).columnGap) || 6;
      const pageButtonWidth = Math.max(36, ...buttons.filter(button => !button.querySelector('svg')).map(button => button.getBoundingClientRect().width));
      const availableForPages = width - arrowWidth - Math.max(0, arrows.length - 1) * gap;
      setPageSlots(Math.max(1, Math.min(10, Math.floor(availableForPages / (pageButtonWidth + gap)))));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    window.addEventListener('resize', update);
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [page, pages]);
  if (pages <= 1) return null;
  const visiblePageCount = Math.min(pages, pageSlots);
  const firstVisiblePage = Math.max(1, Math.min(page - Math.floor((visiblePageCount - 1) / 2), pages - visiblePageCount + 1));
  const visiblePages = Array.from({ length: visiblePageCount }, (_, index) => firstVisiblePage + index);
  const pageButton = (target, content, label, { disabled = false, current = false, rel, edge = false } = {}) => {
    const props = {
      key: label,
      className: `pagination__btn ${current ? 'is-active' : ''} ${edge ? 'pagination__btn--edge' : ''}`,
      'aria-current': current ? 'page' : undefined,
      'aria-label': label,
      title: label,
    };
    if (disabled) return <button {...props} type="button" disabled>{content}</button>;
    return getPageUrl
      ? <Link {...props} to={getPageUrl(target)} rel={rel}>{content}</Link>
      : <button {...props} type="button" onClick={() => onChange(target)}>{content}</button>;
  };
  return (
    <nav ref={navRef} className="pagination" aria-label="Stranice kataloga">
      {pageButton(1, <ChevronsLeft size={18} aria-hidden="true" />, 'Prva stranica', { disabled: page <= 1, edge: true })}
      {pageButton(page - 1, <ChevronLeft size={18} aria-hidden="true" />, 'Prethodna stranica', { disabled: page <= 1, rel: 'prev' })}
      {visiblePages.map(number => pageButton(number, number, `Strana ${number}`, { current: page === number }))}
      {pageButton(page + 1, <ChevronRight size={18} aria-hidden="true" />, 'Sledeća stranica', { disabled: page >= pages, rel: 'next' })}
      {pageButton(pages, <ChevronsRight size={18} aria-hidden="true" />, 'Poslednja stranica', { disabled: page >= pages, edge: true })}
    </nav>
  );
}
