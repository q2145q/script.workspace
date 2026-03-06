"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Users,
  Film,
  AlignLeft,
  ScrollText,
  UserCircle,
  Download,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface OnePagerPanelProps {
  projectId: string;
}

export function OnePagerPanel({ projectId }: OnePagerPanelProps) {
  const t = useTranslations("OnePager");
  const tTypes = useTranslations("OnePagerTypes");
  const tCommon = useTranslations("Common");
  const tEntities = useTranslations("Entities");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Load project data
  const { data: project } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );

  // Load characters
  const { data: characters } = useQuery(
    trpc.entity.listCharacters.queryOptions({ projectId })
  );

  // Load members (returns { owner, members })
  const { data: memberData } = useQuery(
    trpc.member.list.queryOptions({ projectId })
  );

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  // Build authors list: owner + editors
  const authorNames: string[] = [];
  if (memberData?.owner) authorNames.push(memberData.owner.name);
  memberData?.members
    ?.filter((m) => m.role === "EDITOR")
    .forEach((m) => {
      if (!authorNames.includes(m.user.name)) authorNames.push(m.user.name);
    });
  if (authorNames.length === 0) authorNames.push("—");

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="glass-panel flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-ai-accent" />
          <span className="text-sm font-medium text-foreground">{t("title")}</span>
        </div>
        <ExportButton projectId={projectId} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-6 px-8 py-8">
          {/* Title */}
          <OnePagerBlock
            icon={Film}
            label={t("title")}
            value={project.title}
            notSetLabel={t("notSet")}
          />

          {/* Authors */}
          <OnePagerBlock
            icon={Users}
            label={t("authors")}
            value={authorNames.join(", ")}
            notSetLabel={t("notSet")}
          />

          {/* Genre */}
          <OnePagerBlock
            icon={Film}
            label={t("genreType")}
            value={formatProjectType(project.type, tTypes)}
            notSetLabel={t("notSet")}
          />

          {/* Logline */}
          <LoglineBlock projectId={projectId} savedLogline={project.logline} />

          {/* Synopsis */}
          <SynopsisBlock projectId={projectId} savedSynopsis={project.synopsis} />

          {/* Characters */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {tEntities("characters")}
              </span>
            </div>
            {characters && characters.length > 0 ? (
              <div className="space-y-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <span className="font-medium text-sm text-foreground">
                      {char.name}
                    </span>
                    {char.description && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {char.description}
                      </p>
                    )}
                    {char.traits && char.traits.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {char.traits.map((trait, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t("noCharacters")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OnePagerBlock({
  icon: Icon,
  label,
  value,
  notSetLabel,
}: {
  icon: typeof Film;
  label: string;
  value: string | null | undefined;
  notSetLabel: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
        {value || <span className="italic text-muted-foreground">{notSetLabel}</span>}
      </p>
    </div>
  );
}

function LoglineBlock({ projectId, savedLogline }: { projectId: string; savedLogline: string | null }) {
  const t = useTranslations("OnePager");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [userRequest, setUserRequest] = useState("");
  const [logline, setLogline] = useState(savedLogline ?? "");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation(
    trpc.ai.generateLogline.mutationOptions({
      onSuccess: (data) => {
        setLogline(data.logline);
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: projectId }) });
        toast.success(t("loglineGenerated"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const saveMutation = useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: projectId }) });
        setEditing(false);
        toast.success(t("loglineSaved"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(logline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <AlignLeft className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("logline")}
        </span>
      </div>

      {logline ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                rows={3}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => saveMutation.mutate({ id: projectId, logline })}
                  disabled={saveMutation.isPending}
                  className="rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {tCommon("save")}
                </button>
                <button
                  onClick={() => { setLogline(savedLogline ?? ""); setEditing(false); }}
                  className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p
                className="flex-1 cursor-pointer text-sm text-foreground hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                onClick={() => setEditing(true)}
                title={t("clickToEdit")}
              >
                {logline}
              </p>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground italic">
          {t("noLogline")}
        </p>
      )}

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          placeholder={t("instructionsPlaceholder")}
          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => mutation.mutate({ projectId, userRequest })}
          disabled={mutation.isPending}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-ai-accent px-3 py-1.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {logline ? tCommon("regenerate") : tCommon("generate")}
        </button>
      </div>
    </div>
  );
}

function SynopsisBlock({ projectId, savedSynopsis }: { projectId: string; savedSynopsis: string | null }) {
  const t = useTranslations("OnePager");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [synopsis, setSynopsis] = useState(savedSynopsis ?? "");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation(
    trpc.ai.generateSynopsis.mutationOptions({
      onSuccess: (data) => {
        setSynopsis(data.synopsis);
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: projectId }) });
        toast.success(t("synopsisGenerated"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const saveMutation = useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: projectId }) });
        setEditing(false);
        toast.success(t("synopsisSaved"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(synopsis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("synopsis")}
        </span>
      </div>

      {synopsis ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                rows={8}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => saveMutation.mutate({ id: projectId, synopsis })}
                  disabled={saveMutation.isPending}
                  className="rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {tCommon("save")}
                </button>
                <button
                  onClick={() => { setSynopsis(savedSynopsis ?? ""); setEditing(false); }}
                  className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {tCommon("cancel")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-end">
                <button
                  onClick={handleCopy}
                  className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p
                className="cursor-pointer whitespace-pre-wrap text-sm text-foreground hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                onClick={() => setEditing(true)}
                title={t("clickToEdit")}
              >
                {synopsis}
              </p>
            </>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground italic">
          {t("noSynopsis")}
        </p>
      )}

      <div className="mt-2">
        <button
          onClick={() => mutation.mutate({ projectId })}
          disabled={mutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-ai-accent/10 px-3 py-1.5 text-sm font-medium text-ai-accent transition-all hover:bg-ai-accent/20 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {synopsis ? t("regenerateSynopsis") : t("generateSynopsis")}
        </button>
      </div>
    </div>
  );
}

function ExportButton({ projectId }: { projectId: string }) {
  const t = useTranslations("OnePager");
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    // Select all text in the one-pager for easy copy
    const el = document.querySelector("[data-one-pager-content]");
    if (el) {
      const text = el.textContent || "";
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("copiedToClipboard"));
    }
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
      {t("copyAll")}
    </button>
  );
}

function formatProjectType(type: string, tTypes: (key: string) => string): string {
  const knownTypes = ["Feature Film", "Short Film", "TV Series", "TV Pilot", "Documentary", "Web Series", "Animation"];
  const typeMap: Record<string, string> = {
    FEATURE_FILM: "Feature Film",
    SHORT_FILM: "Short Film",
    TV_SERIES: "TV Series",
    TV_PILOT: "TV Pilot",
    DOCUMENTARY: "Documentary",
    WEB_SERIES: "Web Series",
    ANIMATION: "Animation",
  };
  const displayKey = typeMap[type] || type;
  if (knownTypes.includes(displayKey)) {
    return tTypes(displayKey);
  }
  return displayKey;
}
