import React from "react";
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import "./Pagination.css";

export default function Pagination({ page, total, perPage, onChange, getPageUrl }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const pageButton = (target, content, label, { disabled = false, current = false, rel } = {}) => {
    const props = {
      key: label,
      className: `pagination__btn ${current ? 'is-active' : ''}`,
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
    <nav className="pagination" aria-label="Stranice kataloga">
      {pageButton(1, <ChevronsLeft size={18} aria-hidden="true" />, 'Prva stranica', { disabled: page <= 1 })}
      {pageButton(page - 1, <ChevronLeft size={18} aria-hidden="true" />, 'Prethodna stranica', { disabled: page <= 1, rel: 'prev' })}
      {Array.from({ length: pages }, (_, i) => pageButton(i + 1, i + 1, `Strana ${i + 1}`, { current: page === i + 1 }))}
      {pageButton(page + 1, <ChevronRight size={18} aria-hidden="true" />, 'Sledeća stranica', { disabled: page >= pages, rel: 'next' })}
      {pageButton(pages, <ChevronsRight size={18} aria-hidden="true" />, 'Poslednja stranica', { disabled: page >= pages })}
    </nav>
  );
}
