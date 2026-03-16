"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

const DISMISS_KEY = "beta-banner-dismissed";

export function BetaBanner() {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("Landing.betaBanner");

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="relative z-10 bg-amber-500/90 px-4 py-2 text-center text-sm text-black backdrop-blur-sm"
    >
      <p className="pr-8">
        {t("text")}{" "}
        <a
          href="https://t.me/mishaabramyan"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          {t("linkText")}
        </a>
        {t("textEnd")}
      </p>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-black/70 transition-colors hover:text-black"
        aria-label={t("closeLabel")}
      >
        <X size={16} />
      </button>
    </div>
  );
}
