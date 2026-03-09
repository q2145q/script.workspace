"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Cpu, Users, UserPlus, Trash2, Crown, Sparkles, Copy, Check, FileText } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LANGUAGES, type ProjectStatus } from "@script/types";
import { useTranslations } from "next-intl";

interface ProjectSettingsFormProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    language: string;
    status: string;
    preferredProvider: string | null;
    preferredModel: string | null;
    logline: string | null;
    synopsis: string | null;
  };
  projectId: string;
  isOwner?: boolean;
}

const PROJECT_TYPE_VALUES = ["FEATURE_FILM", "TV_SERIES", "SHORT_FILM", "OTHER"] as const;
const MEMBER_ROLE_VALUES = ["EDITOR", "COMMENTER", "VIEWER"] as const;
const PROJECT_STATUS_VALUES = ["DRAFT", "IN_PROGRESS", "UNDER_REVIEW", "FINAL", "ARCHIVED"] as const;

export function ProjectSettingsForm({ project, projectId, isOwner }: ProjectSettingsFormProps) {
  const t = useTranslations("ProjectSettings");
  const tTypes = useTranslations("ProjectTypes");
  const tStatus = useTranslations("ProjectStatus");
  const tRoles = useTranslations("MemberRoles");
  const tCommon = useTranslations("Common");

  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [type, setType] = useState(project.type);
  const [language, setLanguage] = useState(project.language);
  const [status, setStatus] = useState(project.status);
  const [selectedProvider, setSelectedProvider] = useState(project.preferredProvider ?? "");
  const [selectedModel, setSelectedModel] = useState(project.preferredModel ?? "");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: availableModels } = useQuery(
    trpc.provider.availableModels.queryOptions()
  );

  const updateMutation = useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.project.getById.queryKey({ id: projectId }) });
        toast.success(t("settingsSaved"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleSave = () => {
    updateMutation.mutate({
      id: projectId,
      title: title.trim() || project.title,
      description: description.trim() || undefined,
      type: type as "FEATURE_FILM" | "TV_SERIES" | "SHORT_FILM" | "OTHER",
      language,
      status: status as ProjectStatus,
      preferredProvider: selectedProvider || null,
      preferredModel: selectedModel || null,
    });
  };

  const currentProviderModels = availableModels?.find(
    (p) => p.provider === selectedProvider
  )?.models ?? [];

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const providerModels = availableModels?.find((p) => p.provider === provider)?.models ?? [];
    setSelectedModel(providerModels[0]?.id ?? "");
  };

  const inputClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  const labelClass = "mb-1.5 block text-xs font-medium text-muted-foreground";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Link
          href={`/project/${projectId}`}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">{project.title}</p>
        </div>
      </div>

      {/* General */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("general")}</h2>
        <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          <div>
            <label className={labelClass}>{t("projectTitle")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass + " resize-none"}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>{t("type")}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
              >
                {PROJECT_TYPE_VALUES.map((value) => (
                  <option key={value} value={value}>{tTypes(value)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("status")}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                {PROJECT_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>{tStatus(value)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("language")}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* AI Model */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Cpu className="h-4 w-4 text-cinema" />
          {t("aiModel")}
        </h2>
        <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          {availableModels && availableModels.length > 0 ? (
            <>
              <div>
                <label className={labelClass}>{t("provider")}</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{t("autoDefault")}</option>
                  {availableModels.map((p) => (
                    <option key={p.provider} value={p.provider}>
                      {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProvider && currentProviderModels.length > 0 && (
                <div>
                  <label className={labelClass}>{t("model")}</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className={inputClass}
                  >
                    {currentProviderModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t("aiModelHint")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("noProviders")}
            </p>
          )}
        </div>
      </section>

      {/* AI Tools */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-cinema" />
          {t("aiTools")}
        </h2>
        <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          <LoglineGenerator projectId={projectId} savedLogline={project.logline} />
          <div className="border-t border-border" />
          <SynopsisGenerator projectId={projectId} savedSynopsis={project.synopsis} />
        </div>
      </section>

      {/* Save button */}
      <section className="mb-8">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-cinema px-4 py-2 text-sm font-medium text-cinema-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("saveChanges")}
        </button>
      </section>

      {/* Members */}
      {isOwner && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4" />
            {t("members")}
          </h2>
          <MembersSection projectId={projectId} />
        </section>
      )}
    </motion.div>
  );
}

function LoglineGenerator({ projectId, savedLogline }: { projectId: string; savedLogline: string | null }) {
  const t = useTranslations("ProjectSettings");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const [userRequest, setUserRequest] = useState("");
  const [logline, setLogline] = useState(savedLogline ?? "");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation(
    trpc.ai.generateLogline.mutationOptions({
      onSuccess: (data) => {
        setLogline(data.logline);
        toast.success(t("loglineGenerated"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(logline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {t("generateLogline")}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          placeholder={t("instructionsPlaceholder")}
          className={inputClass}
        />
        <button
          onClick={() => mutation.mutate({ projectId, userRequest })}
          disabled={mutation.isPending}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-cinema px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {logline ? tCommon("regenerate") : tCommon("generate")}
        </button>
      </div>
      {logline && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <p className="flex-1 text-sm text-foreground">{logline}</p>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title={tCommon("copy")}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {t("loglineHint")}
      </p>
    </div>
  );
}

function SynopsisGenerator({ projectId, savedSynopsis }: { projectId: string; savedSynopsis: string | null }) {
  const t = useTranslations("ProjectSettings");
  const tCommon = useTranslations("Common");
  const trpc = useTRPC();
  const [synopsis, setSynopsis] = useState(savedSynopsis ?? "");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation(
    trpc.ai.generateSynopsis.mutationOptions({
      onSuccess: (data) => {
        setSynopsis(data.synopsis);
        toast.success(t("synopsisGenerated"));
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
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {t("generateSynopsis")}
      </label>
      <button
        onClick={() => mutation.mutate({ projectId })}
        disabled={mutation.isPending}
        className="flex items-center gap-1.5 rounded-lg bg-cinema/10 px-3 py-2 text-sm font-medium text-cinema transition-all hover:bg-cinema/20 disabled:opacity-50"
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {synopsis ? t("regenerateSynopsis") : t("generateSynopsis")}
      </button>
      {synopsis && (
        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-1 flex items-center justify-end">
            <button
              onClick={handleCopy}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              title={tCommon("copy")}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">{synopsis}</p>
        </div>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {t("synopsisHint")}
      </p>
    </div>
  );
}

function MembersSection({ projectId }: { projectId: string }) {
  const t = useTranslations("ProjectSettings");
  const tRoles = useTranslations("MemberRoles");
  const tCommon = useTranslations("Common");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"EDITOR" | "COMMENTER" | "VIEWER">("EDITOR");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data } = useQuery(
    trpc.member.list.queryOptions({ projectId })
  );

  const inviteMutation = useMutation(
    trpc.member.invite.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: trpc.member.list.queryKey({ projectId }) });
        toast.success(t("invited", { name: result.user.name || result.user.email }));
        setInviteEmail("");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const updateRoleMutation = useMutation(
    trpc.member.updateRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.member.list.queryKey({ projectId }) });
        toast.success(t("roleUpdated"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const removeMutation = useMutation(
    trpc.member.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.member.list.queryKey({ projectId }) });
        toast.success(t("memberRemoved"));
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const inputClass = "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      {/* Owner */}
      {data?.owner && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-sm font-medium text-foreground">{data.owner.name}</span>
            <span className="text-xs text-muted-foreground">{data.owner.email}</span>
          </div>
          <span className="text-xs font-medium text-amber-500">{tCommon("owner")}</span>
        </div>
      )}

      {/* Members list */}
      {data?.members && data.members.length > 0 && (
        <div className="mb-4 space-y-2">
          {data.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{member.user.name}</span>
                <span className="text-xs text-muted-foreground">{member.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) =>
                    updateRoleMutation.mutate({
                      projectId,
                      userId: member.userId,
                      role: e.target.value as "EDITOR" | "COMMENTER" | "VIEWER",
                    })
                  }
                  disabled={updateRoleMutation.isPending}
                  className="rounded border border-border bg-muted/50 px-2 py-1 text-xs text-foreground"
                >
                  {MEMBER_ROLE_VALUES.map((value) => (
                    <option key={value} value={value}>{tRoles(value)}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeMutation.mutate({ projectId, userId: member.userId })}
                  disabled={removeMutation.isPending}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title={t("removeMember")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{t("inviteByEmail")}</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={inputClass}
          />
        </div>
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value as "EDITOR" | "COMMENTER" | "VIEWER")}
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
        >
          {MEMBER_ROLE_VALUES.map((value) => (
            <option key={value} value={value}>{tRoles(value)}</option>
          ))}
        </select>
        <button
          onClick={() =>
            inviteMutation.mutate({ projectId, email: inviteEmail, role: inviteRole })
          }
          disabled={!inviteEmail.trim() || inviteMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-cinema px-3 py-2 text-sm font-medium text-cinema-foreground transition-all hover:opacity-90 disabled:opacity-50"
        >
          {inviteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {tCommon("invite")}
        </button>
      </div>
    </div>
  );
}
