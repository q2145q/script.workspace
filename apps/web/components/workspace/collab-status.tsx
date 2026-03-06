"use client";

import { useEffect, useState } from "react";
import type { HocuspocusProvider } from "@script/editor";
import { useTranslations } from "next-intl";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function CollabStatus({ provider }: { provider: HocuspocusProvider | null }) {
  const t = useTranslations("Collab");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    if (!provider) {
      setStatus("disconnected");
      return;
    }

    const onStatus = ({ status: s }: { status: string }) => {
      if (s === "connected") setStatus("connected");
      else if (s === "connecting") setStatus("connecting");
      else setStatus("disconnected");
    };

    provider.on("status", onStatus);

    // Check initial status
    if (provider.status === "connected") setStatus("connected");
    else if (provider.status === "connecting") setStatus("connecting");

    return () => {
      provider.off("status", onStatus);
    };
  }, [provider]);

  const statusConfig = {
    connected: { color: "bg-emerald-500", text: t("synced") },
    connecting: { color: "bg-yellow-500", text: t("connecting") },
    disconnected: { color: "bg-red-500", text: t("offline") },
  };

  const { color, text } = statusConfig[status];

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />
      {text}
    </span>
  );
}
