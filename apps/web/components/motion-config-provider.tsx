"use client";

import { MotionConfig } from "framer-motion";

/** Wraps app with MotionConfig to respect prefers-reduced-motion OS setting */
export function MotionConfigProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
