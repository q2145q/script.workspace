"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ScriptEditor } from "@script/editor";
import type { JSONContent } from "@script/editor";
import {
  BookOpen,
  Plus,
  Trash2,
  GripVertical,
  Users,
  MapPin,
  Box,
  GitBranch,
  FileText,
  Pencil,
  Check,
  X,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface BibleSectionsProps {
  projectId: string;
}

const SECTION_TYPE_ICONS: Record<string, typeof Users> = {
  CHARACTERS: Users,
  LOCATIONS: MapPin,
  OBJECTS: Box,
  ARCS: GitBranch,
  CUSTOM: FileText,
};

const SECTION_TYPE_LABELS: Record<string, string> = {
  CHARACTERS: "Characters",
  LOCATIONS: "Locations",
  OBJECTS: "Objects",
  ARCS: "Story Arcs",
  CUSTOM: "Custom",
};

export function BibleSections({ projectId }: BibleSectionsProps) {
  const t = useTranslations("Bible");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionType, setNewSectionType] = useState<string>("CUSTOM");
  const [searchQuery, setSearchQuery] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const newTitleInputRef = useRef<HTMLInputElement>(null);

  // Load sections
  const { data: sections = [], isLoading } = useQuery(
    trpc.bible.listSections.queryOptions({ projectId })
  );

  // Mutations
  const createMutation = useMutation(
    trpc.bible.createSection.mutationOptions({
      onSuccess: (newSection) => {
        queryClient.invalidateQueries({ queryKey: trpc.bible.listSections.queryKey({ projectId }) });
        setActiveSectionId(newSection.id);
        setShowNewSection(false);
        setNewSectionTitle("");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.bible.updateSection.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.bible.listSections.queryKey({ projectId }) });
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.bible.deleteSection.mutationOptions({
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: trpc.bible.listSections.queryKey({ projectId }) });
        if (activeSectionId === variables.sectionId) {
          setActiveSectionId(null);
        }
      },
    })
  );

  const [isAutoPopulating, setIsAutoPopulating] = useState(false);

  const handleAutoPopulate = async () => {
    setIsAutoPopulating(true);
    try {
      const [characters, locations] = await Promise.all([
        queryClient.fetchQuery(trpc.entity.listCharacters.queryOptions({ projectId })),
        queryClient.fetchQuery(trpc.entity.listLocations.queryOptions({ projectId })),
      ]);

      // Build TipTap JSONContent for characters
      const charNodes: JSONContent[] = [];
      for (const char of characters) {
        charNodes.push({
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: char.name }],
        });
        if (char.description) {
          charNodes.push({
            type: "paragraph",
            content: [{ type: "text", text: char.description }],
          });
        }
        if ((char as { traits?: string[] }).traits?.length) {
          charNodes.push({
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "Traits: " },
              { type: "text", text: ((char as { traits: string[] }).traits).join(", ") },
            ],
          });
        }
      }
      const charContent: JSONContent = {
        type: "doc",
        content: charNodes.length > 0 ? charNodes : [{ type: "paragraph" }],
      };

      // Build TipTap JSONContent for locations
      const locNodes: JSONContent[] = [];
      for (const loc of locations) {
        locNodes.push({
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: loc.name }],
        });
        if (loc.description) {
          locNodes.push({
            type: "paragraph",
            content: [{ type: "text", text: loc.description }],
          });
        }
      }
      const locContent: JSONContent = {
        type: "doc",
        content: locNodes.length > 0 ? locNodes : [{ type: "paragraph" }],
      };

      // Find existing sections or create new ones
      const charSection = sections.find((s) => s.type === "CHARACTERS");
      const locSection = sections.find((s) => s.type === "LOCATIONS");

      if (charSection) {
        await updateMutation.mutateAsync({
          projectId,
          sectionId: charSection.id,
          content: charContent,
        });
      } else {
        const newSec = await createMutation.mutateAsync({
          projectId,
          type: "CHARACTERS",
          title: t("typeCharacters"),
        });
        await updateMutation.mutateAsync({
          projectId,
          sectionId: newSec.id,
          content: charContent,
        });
      }

      if (locSection) {
        await updateMutation.mutateAsync({
          projectId,
          sectionId: locSection.id,
          content: locContent,
        });
      } else {
        const newSec = await createMutation.mutateAsync({
          projectId,
          type: "LOCATIONS",
          title: t("typeLocations"),
        });
        await updateMutation.mutateAsync({
          projectId,
          sectionId: newSec.id,
          content: locContent,
        });
      }

      queryClient.invalidateQueries({ queryKey: trpc.bible.listSections.queryKey({ projectId }) });
      toast.success(t("autoPopulated"));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsAutoPopulating(false);
    }
  };

  // Auto-select first section
  useEffect(() => {
    if (!activeSectionId && sections.length > 0) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  // Focus title input
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  useEffect(() => {
    if (showNewSection) newTitleInputRef.current?.focus();
  }, [showNewSection]);

  const activeSection = sections.find((s) => s.id === activeSectionId);

  // Debounced content save
  const handleContentUpdate = useCallback(
    (content: JSONContent) => {
      if (!activeSectionId) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        updateMutation.mutate({
          projectId,
          sectionId: activeSectionId,
          content,
        });
      }, 1500);
    },
    [activeSectionId, projectId, updateMutation]
  );

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) return;
    createMutation.mutate({
      projectId,
      type: newSectionType as "CHARACTERS" | "LOCATIONS" | "OBJECTS" | "ARCS" | "CUSTOM",
      title: newSectionTitle.trim(),
    });
  };

  const handleRenameSection = (sectionId: string) => {
    if (!titleDraft.trim()) {
      setEditingTitle(null);
      return;
    }
    updateMutation.mutate({
      projectId,
      sectionId,
      title: titleDraft.trim(),
    });
    setEditingTitle(null);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!window.confirm(t("confirmDeleteSection"))) return;
    deleteMutation.mutate({ projectId, sectionId });
  };

  const filteredSections = searchQuery
    ? sections.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left sidebar — section list */}
      <div className="flex w-64 flex-col border-r border-border bg-muted/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cinema" />
            <span className="text-sm font-medium">{t("title")}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleAutoPopulate}
              disabled={isAutoPopulating}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-cinema disabled:opacity-50"
              title={t("autoPopulate")}
            >
              {isAutoPopulating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setShowNewSection(true)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={t("addSection")}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        {sections.length > 5 && (
          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchSections")}
                className="w-full rounded-md border border-border bg-background py-1 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-cinema focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* New section form */}
        {showNewSection && (
          <div className="border-b border-border p-3 space-y-2">
            <input
              ref={newTitleInputRef}
              type="text"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateSection();
                if (e.key === "Escape") {
                  setShowNewSection(false);
                  setNewSectionTitle("");
                }
              }}
              placeholder={t("sectionTitlePlaceholder")}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-cinema focus:outline-none"
            />
            <select
              value={newSectionType}
              onChange={(e) => setNewSectionType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-cinema focus:outline-none"
            >
              <option value="CHARACTERS">{t("typeCharacters")}</option>
              <option value="LOCATIONS">{t("typeLocations")}</option>
              <option value="OBJECTS">{t("typeObjects")}</option>
              <option value="ARCS">{t("typeArcs")}</option>
              <option value="CUSTOM">{t("typeCustom")}</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateSection}
                disabled={!newSectionTitle.trim() || createMutation.isPending}
                className="flex-1 rounded-md bg-cinema px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-cinema/90 disabled:opacity-50"
              >
                {t("create")}
              </button>
              <button
                onClick={() => {
                  setShowNewSection(false);
                  setNewSectionTitle("");
                }}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Section list */}
        <div className="flex-1 overflow-y-auto">
          {filteredSections.length === 0 && !showNewSection && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              {sections.length === 0 ? t("noSections") : t("noSearchResults")}
            </div>
          )}
          {filteredSections.map((section) => {
            const Icon = SECTION_TYPE_ICONS[section.type] || FileText;
            const isActive = activeSectionId === section.id;
            const isEditing = editingTitle === section.id;

            return (
              <div
                key={section.id}
                className={`group flex items-center gap-2 border-b border-border/50 px-3 py-2 transition-colors cursor-pointer ${
                  isActive
                    ? "bg-cinema/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
                onClick={() => {
                  if (!isEditing) setActiveSectionId(section.id);
                }}
              >
                <GripVertical className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-50" />
                <Icon className="h-3.5 w-3.5 shrink-0" />

                {isEditing ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSection(section.id);
                      if (e.key === "Escape") setEditingTitle(null);
                    }}
                    onBlur={() => handleRenameSection(section.id)}
                    className="flex-1 rounded border border-cinema bg-background px-1 py-0.5 text-xs text-foreground focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="flex-1 truncate text-xs font-medium">
                    {section.title}
                  </span>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                  {isEditing ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSection(section.id);
                      }}
                      className="rounded p-0.5 text-green-500 hover:bg-green-500/10"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitle(section.id);
                        setTitleDraft(section.title);
                      }}
                      className="rounded p-0.5 hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSection(section.id);
                    }}
                    className="rounded p-0.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section count */}
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          {t("sectionCount", { count: sections.length })}
        </div>
      </div>

      {/* Right panel — section editor */}
      <div className="flex flex-1 flex-col">
        {activeSection ? (
          <>
            {/* Section header */}
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              {(() => {
                const Icon = SECTION_TYPE_ICONS[activeSection.type] || FileText;
                return <Icon className="h-4 w-4 text-cinema" />;
              })()}
              <span className="text-sm font-medium text-foreground">
                {activeSection.title}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {SECTION_TYPE_LABELS[activeSection.type] || activeSection.type}
              </span>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto">
              <ScriptEditor
                key={activeSection.id}
                content={activeSection.content as JSONContent | undefined}
                onUpdate={handleContentUpdate}
                hideToolbar={false}
                plainText
              />
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <BookOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("selectSection")}</p>
            {sections.length === 0 && (
              <button
                onClick={() => setShowNewSection(true)}
                className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
              >
                {t("createFirstSection")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
