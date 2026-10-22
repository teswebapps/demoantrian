"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface AnimatedGenerateButtonProps {
  labelIdle: string;
  labelActive?: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean; // Tambahkan prop ini khusus untuk loading
  className?: string;
  variant?: "emerald" | "blue" | "purple" | "amber" | "rose" | "white" | "glass";
}

const variantStyles = {
  emerald: "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent",
  blue: "bg-blue-600 hover:bg-blue-700 text-white border-transparent",
  purple: "bg-purple-600 hover:bg-purple-700 text-white border-transparent",
  amber: "bg-amber-500 hover:bg-amber-600 text-white border-transparent",
  rose: "bg-rose-500 hover:bg-rose-600 text-white border-transparent",
  white: "bg-white text-blue-700 hover:bg-slate-100 border-transparent shadow-md",
  glass: "bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20",
};

export default function AnimatedGenerateButton({
  labelIdle,
  labelActive = "Memproses...",
  icon,
  onClick,
  disabled = false,
  isLoading = false,
  className = "",
  variant = "emerald",
}: AnimatedGenerateButtonProps) {
  const v = variantStyles[variant] || variantStyles.emerald;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={disabled || isLoading ? {} : { scale: 1.02 }}
      whileTap={disabled || isLoading ? {} : { scale: 0.98 }}
      // Shadow dihilangkan agar terlihat flat & clean (seperti desain shadcn)
      className={`relative w-full overflow-hidden rounded-xl font-bold py-4 px-4 flex justify-center items-center gap-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed border ${v} ${className}`}
    >
      <div className="relative z-10 flex items-center justify-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
            </motion.span>
          ) : (
            <motion.span
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center"
            >
              {icon}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-[15px] tracking-wide">
          {isLoading ? labelActive : labelIdle}
        </span>
      </div>
    </motion.button>
  );
}