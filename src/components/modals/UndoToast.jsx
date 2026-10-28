import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React, { useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, X } from "lucide-react";
import "./UndoToast.css";

export default function UndoToast({ visible, item, onUndo, onClose, duration = 6000 }) {
  const { t: translateText } = useStorefront();

  // Tajmer za auto-zatvaranje
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onClose]);

  return (
    <AnimatePresence>
      {visible && item && (
        <motion.div
          className="undo-toast"
          initial={{ opacity: 0, y: 20, x: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          role="alert"
        >
          <div className="undo-content">
            <span className="undo-label">{translateText("Uklonjeno:")}</span>
            <span className="undo-name">{translateText(item.name)}</span>
          </div>

          <div className="undo-actions">
            <button onClick={onUndo} className="btn-undo">
              <RotateCcw size={14} />
              <span>{translateText("Vrati")}</span>
            </button>
            <button onClick={onClose} className="btn-close" aria-label={translateText("Zatvori")}>
              <X size={16} />
            </button>
          </div>

          {/* Progress bar koji pokazuje koliko vremena je ostalo */}
          <motion.div
            className="undo-timer"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}