import React from 'react';
import { motion } from 'framer-motion';

export default function SectionHeader({ title, count, onClear, isOpen, onToggle }) {
  return (
    <div
      className="f-head cursor-pointer"
      onClick={onToggle}
      role="button"
      aria-expanded={isOpen}
    >
      <span className="f-title">{title}</span>
      <div className="f-head-right">
        <div className="f-actions">
          {count > 0 && (
            <span className="f-badge" aria-label={`${count} izabrano`}>
              {count}
            </span>
          )}
          {count > 0 && (
            <button
              type="button"
              className="f-clear"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              Očisti
            </button>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="f-chevron"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </motion.svg>
      </div>
    </div>
  );
}

