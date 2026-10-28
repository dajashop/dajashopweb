import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import "./FlashModal.css"; // Uvozimo CSS

export default function FlashModal({
  open,
  title,
  subtitle,
  onClose,
  duration = 2000,
  icon,
}) {
  const { t: translateText } = useStorefront();

  // Auto close logika ostaje ista
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  // ESC logika ostaje ista
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="flash-overlay"
          onClick={() => onClose?.()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-live="polite"
          role="alertdialog"
        >
          <motion.div
            className="flash-card"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flash-icon">
              {icon ?? <CheckCircle2 size={24} strokeWidth={3} />}
            </div>

            <h3 className="flash-title">{translateText(title)}</h3>
            {subtitle && <p className="flash-subtitle">{translateText(subtitle)}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}