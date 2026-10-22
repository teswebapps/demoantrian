"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface AnimatedGenerateButtonProps {
  labelIdle: string;
  labelActive?: string;
  icon?: ReactNode;
  highlightHueDeg?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "emerald" | "blue" | "purple" | "amber" | "rose" | "white";
}

const variantStyles: Record<string, { bg: string; text: string; shadow: string }> = {
  emerald: { bg: "bg-emerald-500 hover:bg-emerald-600", text: "text-white", shadow: "shadow-emerald-500/30" },
  blue:    { bg: "bg-blue-600 hover:bg-blue-700",       text: "text-white", shadow: "shadow-blue-500/30" },
  purple:  { bg: "bg-purple-600 hover:bg-purple-700",   text: "text-white", shadow: "shadow-purple-500/30" },
  amber:   { bg: "bg-amber-500 hover:bg-amber-600",     text: "text-white", shadow: "shadow-amber-500/30" },
  rose:    { bg: "bg-rose-500 hover:bg-rose-600",       text: "text-white", shadow: "shadow-rose-500/30" },
  white:   { bg: "bg-white hover:bg-slate-100",         text: "text-blue-700", shadow: "shadow-black/10" },
};

export default function AnimatedGenerateButton({
  labelIdle,
  labelActive = "Memproses...",
  icon,
  highlightHueDeg = 160,
  onClick,
  disabled = false,
  className = "",
  variant = "emerald",
}: AnimatedGenerateButtonProps) {
  const v = variantStyles[variant] ?? variantStyles.emerald;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      className={`relative w-full overflow-hidden rounded-xl font-black py-4 flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${v.bg} ${v.text} ${v.shadow} shadow-lg ${className}`}
      style={{
        boxShadow: disabled
          ? undefined
          : `0 10px 30px -10px hsla(${highlightHueDeg}, 80%, 50%, 0.5)`,
      }}
    >
      {/* Efek kilau saat loading */}
      {disabled && (
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          style={{
            background: `linear-gradient(90deg, transparent, hsla(${highlightHueDeg}, 100%, 80%, 0.25), transparent)`,
          }}
        />
      )}

      <div className="relative z-10 flex items-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          {disabled ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              {icon}
            </motion.span>
          )}
        </AnimatePresence>
        <span>{disabled ? labelActive : labelIdle}</span>
      </div>
    </motion.button>
  );
}