import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface ToasterOverlayProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export function ToasterOverlay({ toasts, removeToast }: ToasterOverlayProps) {
  const activeToast = toasts[0];

  return (
    <div className="fixed bottom-0 left-0 w-full z-[150] pointer-events-none flex flex-col justify-end">
      <AnimatePresence>
        {activeToast && (
          <TickerBanner key="fixed-banner" toast={activeToast} onClose={() => removeToast(activeToast.id)} />
        )}
      </AnimatePresence>
    </div>
  );
}

interface ToastCardProps {
  key?: string | number;
  toast: ToastItem;
  onClose: () => void;
}

function TickerBanner({ toast, onClose }: ToastCardProps) {
  useEffect(() => {
    // 8 seconds scroll duration (shorter because queued)
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  // "black for good"
  let bgClass = "bg-slate-950/95 border-t border-slate-900";
  let textClass = "text-emerald-400"; // keep some color for the text so it's readable against black

  if (toast.type === "info") {
    textClass = "text-emerald-400";
  } else if (toast.type === "error" || toast.type === "warning") {
    // "red for bad"
    bgClass = "bg-rose-950/95 border-t border-rose-900/50";
    textClass = "text-rose-400";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className={`w-full overflow-hidden flex items-center shrink-0 backdrop-blur-md transition-colors duration-500 ${bgClass}`}
    >
      <div className="relative w-full h-[28px] sm:h-[34px] flex items-center overflow-hidden">
        <motion.div
          key={toast.id} // forces recreation on new toast ID
          initial={{ x: "100vw" }}
          animate={{ x: "-150vw" }} // Guaranteed to scroll fully off screen
          transition={{ duration: 7.5, ease: "linear" }}
          className={`absolute whitespace-nowrap font-mono text-[11px] sm:text-[13px] uppercase tracking-widest px-4 font-semibold ${textClass}`}
          style={{ willChange: "transform" }}
        >
          {toast.message}
        </motion.div>
      </div>
    </motion.div>
  );
}
