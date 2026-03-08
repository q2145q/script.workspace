"use client";

import { useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

export function ReportButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const t = useTranslations("workspace");
  const pathname = usePathname();
  const trpc = useTRPC();

  const submit = useMutation(
    trpc.report.submit.mutationOptions({
      onSuccess: () => {
        toast.success("Обращение отправлено");
        setMessage("");
        setOpen(false);
      },
      onError: (err) => {
        toast.error(err.message || "Ошибка отправки");
      },
    }),
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground w-full"
      >
        <MessageSquareWarning className="h-3.5 w-3.5" />
        {t("report")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-3">{t("reportTitle")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("reportDescription")}</p>
            <textarea
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              rows={4}
              maxLength={2000}
              placeholder={t("reportPlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => submit.mutate({ message, page: pathname })}
                disabled={!message.trim() || submit.isPending}
                className="px-4 py-2 text-sm rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {submit.isPending ? "..." : t("send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
