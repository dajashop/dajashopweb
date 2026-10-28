import { useStorefront } from '../localization/StorefrontContext.jsx';
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

export default function UploadProgressBar({ progress = 0, label = "Upload" }) {
  const { t: translateText } = useStorefront();

  return (
    <div className="w-full rounded-2xl border border-white/30 bg-white/30 dark:bg-zinc-800/40 backdrop-blur-xl p-2 shadow-inner">
      <div className="flex justify-between text-xs mb-1">
        <span className="opacity-80">{translateText(label)}</span>
        <span className="tabular-nums">{translateText(progress)}%</span>
      </div>
      <div className="h-2 rounded-xl bg-black/10 dark:bg-white/10 overflow-hidden">
        <motion.div
          className="h-full bg-black/60 dark:bg-white/60"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
