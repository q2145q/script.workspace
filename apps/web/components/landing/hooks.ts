"use client";

import { useState, useEffect, useRef } from "react";

export interface ScreenplayLine {
  type: "heading" | "action" | "character" | "dialogue" | "parenthetical";
  text: string;
  pause?: number;
}

export function useInView(
  threshold = 0.15
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}

export function useTypewriter(lines: ScreenplayLine[], speed = 30) {
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!started || done) return;
    if (lineIdx >= lines.length) {
      setDone(true);
      return;
    }

    const line = lines[lineIdx]!;
    if (charIdx < line.text.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(
        () => {
          if (lineIdx + 1 >= lines.length) {
            setDone(true);
            return;
          }
          setLineIdx((l) => l + 1);
          setCharIdx(0);
        },
        line.pause ?? 300
      );
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, started, done, lines, speed]);

  const visible = lines.slice(0, lineIdx + 1).map((line, i) => ({
    ...line,
    display: i < lineIdx ? line.text : line.text.slice(0, charIdx),
    cursor: i === lineIdx && !done,
  }));

  return { visible, start: () => setStarted(true), done };
}
