import React from "react";
import { Link } from 'react-router-dom';
import "./Pagination.css";

export default function Pagination({ page, total, perPage, onChange, getPageUrl }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Stranice kataloga">
      {Array.from({ length: pages }).map((_, i) => {
        const props = {
          className: `pagination__btn ${page === i + 1 ? 'is-active' : ''}`,
          'aria-current': page === i + 1 ? 'page' : undefined,
          'aria-label': `Strana ${i + 1}`,
        };
        return getPageUrl
          ? <Link key={i} {...props} to={getPageUrl(i + 1)}>{i + 1}</Link>
          : <button key={i} {...props} onClick={() => onChange(i + 1)}>{i + 1}</button>;
      })}
    </nav>
  );
}
