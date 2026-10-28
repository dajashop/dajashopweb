import { useStorefront } from '../../localization/StorefrontContext.jsx';
import React from "react";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Jeste li sigurni?",
  description = "Ova akcija se ne može opozvati.",
  confirmText = "Potvrdi",
  cancelText = "Odustani",
  isDanger = false,
}) {
  const { t: translateText } = useStorefront();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-100 grid place-items-center p-4 bg-black/20 backdrop-blur-sm" // Malo svetlija pozadina
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 p-6 shadow-xl ring-1 ring-black/5 backdrop-blur-xl" // Svetliji border i bg
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
          >
            <div className="flex flex-col items-center text-center gap-4">
              {/* Ikona */}
              <div
                className={`grid place-items-center w-12 h-12 rounded-full ${
                  isDanger
                    ? "bg-red-100 text-red-600" // Crvena za opasnost
                    : "bg-neutral-100 text-neutral-600" // Neutralna za ostalo
                }`}
              >
                <AlertTriangle size={24} strokeWidth={2.5} />
              </div>

              {/* Tekst */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-neutral-900 leading-tight">
                  {translateText(title)}
                </h3>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {translateText(description)}
                </p>
              </div>

              {/* Dugmad */}
              <div className="grid grid-cols-2 gap-3 w-full mt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  {translateText(cancelText)}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className={`px-4 py-3 rounded-xl font-semibold text-white shadow-lg transition-transform active:scale-95 ${
                    isDanger
                      ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" // Crveno dugme
                      : "bg-neutral-900 hover:bg-neutral-800" // Tamno dugme
                  }`}
                >
                  {translateText(confirmText)}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
