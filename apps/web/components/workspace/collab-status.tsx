"use client";

import { useEffect, useState } from "react";
import type { HocuspocusProvider } from "@script/editor";
import { useTranslations } from "next-intl";

type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function CollabStatus({ provider }: { provider: HocuspocusProvider | null }) {
  const t = useTranslations("Collab");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [userCount, setUserCount] = useState(0);

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

    // Track online user count via awareness
    const awareness = provider.awareness;
    if (awareness) {
      const updateCount = () => {
        const states = awareness.getStates();
        setUserCount(states.size);
      };
      awareness.on("change", updateCount);
      updateCount();

      return () => {
        provider.off("status", onStatus);
        awareness.off("change", updateCount);
      };
    }

    return () => {
      provider.off("status", onStatus);
    };
  }, [provider]);

  const statusConfig = {
    connected: { color: "bg-emerald-500", text: t("synced"), pulse: false },
    connecting: { color: "bg-yellow-500", text: t("connecting"), pulse: true },
    disconnected: { color: "bg-red-500", text: t("offline"), pulse: false },
  };

  const { color, text, pulse } = statusConfig[status];

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`relative inline-block h-1.5 w-1.5 rounded-full ${color}`}>
        {pulse && (
          <span className={`absolute inset-0 animate-ping rounded-full ${color} opacity-75`} />
        )}
      </span>
      {text}
      {status === "connected" && userCount > 1 && (
        <span className="text-muted-foreground/60">
          ({userCount})
        </span>
      )}
    </span>
  );
}
