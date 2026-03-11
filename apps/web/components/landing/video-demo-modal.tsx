"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Film } from "lucide-react";

interface VideoDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoDemoModal({ open, onOpenChange }: VideoDemoModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0, 0, 0, 0.85)" }}
            onClick={() => onOpenChange(false)}
          />

          {/* Content */}
          <motion.div
            className="relative w-full max-w-3xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => onOpenChange(false)}
              className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              aria-label="Закрыть"
            >
              <X size={24} />
            </button>

            {/* Video placeholder */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                aspectRatio: "16 / 9",
                background: "#111",
                border: "1px solid #2e2e2e",
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(232, 201, 122, 0.15)",
                    border: "1px solid rgba(232, 201, 122, 0.3)",
                  }}
                >
                  <Film size={28} style={{ color: "#e8c97a" }} />
                </div>
                <p
                  className="text-sm"
                  style={{ color: "#a09a8e" }}
                >
                  Видео-демо скоро появится
                </p>
                <p
                  className="text-xs"
                  style={{ color: "#6b6560" }}
                >
                  60-секундный обзор YOMI Script
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
