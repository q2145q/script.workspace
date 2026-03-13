"use client";

import { useState, useEffect, useCallback } from "react";

interface UseTypewriterOptions {
  /** Characters per tick */
  speed?: number;
  /** Milliseconds between ticks */
  interval?: number;
  /** Start typing immediately */
  autoStart?: boolean;
  /** Callback when typing is complete */
  onComplete?: () => void;
}

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {}
) {
  const { speed = 2, interval = 16, autoStart = true, onComplete } = options;
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const start = useCallback(() => {
    setDisplayed("");
    setIsTyping(true);
    setIsDone(false);
  }, []);

  const complete = useCallback(() => {
    setDisplayed(text);
    setIsTyping(false);
    setIsDone(true);
  }, [text]);

  useEffect(() => {
    if (autoStart && text) {
      start();
    }
  }, [text, autoStart, start]);

  useEffect(() => {
    if (!isTyping) return;

    if (displayed.length >= text.length) {
      setIsTyping(false);
      setIsDone(true);
      onComplete?.();
      return;
    }

    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + speed));
    }, interval);

    return () => clearTimeout(timer);
  }, [isTyping, displayed, text, speed, interval, onComplete]);

  return {
    displayed,
    isTyping,
    isDone,
    start,
    complete,
  };
}
