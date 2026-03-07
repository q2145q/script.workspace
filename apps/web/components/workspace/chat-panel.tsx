"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, Trash2, Sparkles, FileDown, Loader2, Check, ChevronDown, StickyNote, AtSign, Film, MapPin } from "lucide-react";
import { Fragment, type Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useChatStream, type ChatMessage } from "@/hooks/use-chat-stream";
import { estimateChatCost } from "@/lib/token-estimate";
import { SuggestionPreview } from "./suggestion-preview";
import { SuggestionHistory } from "./suggestion-history";

interface ChatPanelProps {
  editor: Editor | null;
  documentId: string;
  projectId: string;
}

function extractEditorContext(editor: Editor | null) {
  if (!editor) return undefined;

  const { doc, selection } = editor.state;
  const cursorPos = selection.from;

  let sceneStart = 0;
  let sceneEnd = doc.content.size;
  let prevSceneStart = 0;
  let nextSceneEnd = doc.content.size;
  let foundCurrent = false;

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      if (pos <= cursorPos) {
        prevSceneStart = sceneStart;
        sceneStart = pos;
        foundCurrent = true;
      } else if (foundCurrent && sceneEnd === doc.content.size) {
        sceneEnd = pos;
        nextSceneEnd = doc.content.size;
      } else if (sceneEnd !== doc.content.size && nextSceneEnd === doc.content.size) {
        nextSceneEnd = pos;
      }
    }
  });

  const currentSceneText = doc.textBetween(sceneStart, sceneEnd, "\n");

  let adjacentScenesText = "";
  if (prevSceneStart !== sceneStart) {
    adjacentScenesText += doc.textBetween(prevSceneStart, sceneStart, "\n");
  }
  if (sceneEnd < nextSceneEnd) {
    adjacentScenesText += "\n" + doc.textBetween(sceneEnd, nextSceneEnd, "\n");
  }

  const fullText = doc.textBetween(0, doc.content.size, "\n");
  const documentSummary = fullText.slice(0, 10000);

  return {
    currentSceneText,
    adjacentScenesText: adjacentScenesText || undefined,
    documentSummary,
  };
}

/** Extract all scene headings from the editor for @-mentions */
function extractSceneHeadings(editor: Editor | null): string[] {
  if (!editor) return [];
  const headings: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      const text = node.textContent.trim();
      if (text) headings.push(text);
    }
  });
  return headings;
}

/** Extract full text of a scene by heading */
function extractSceneTextByHeading(editor: Editor, heading: string): string {
  const { doc } = editor.state;
  let sceneStart = -1;
  let sceneEnd = doc.content.size;

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      const text = node.textContent.trim();
      if (text === heading && sceneStart === -1) {
        sceneStart = pos;
      } else if (sceneStart !== -1 && sceneEnd === doc.content.size) {
        sceneEnd = pos;
      }
    }
  });

  if (sceneStart === -1) return "";
  return doc.textBetween(sceneStart, sceneEnd, "\n");
}

/** Parse @[SCENE HEADING] references from text and extract scene contents */
function parseSceneReferences(
  text: string,
  editor: Editor | null,
): { cleanText: string; sceneTexts: string[] } {
  if (!editor) return { cleanText: text, sceneTexts: [] };

  const refPattern = /@\[([^\]]+)\]/g;
  const sceneTexts: string[] = [];
  let match;

  while ((match = refPattern.exec(text)) !== null) {
    const heading = match[1];
    const sceneText = extractSceneTextByHeading(editor, heading);
    if (sceneText) sceneTexts.push(sceneText);
  }

  // Clean text — keep the references as-is (they serve as visual context for the user)
  return { cleanText: text, sceneTexts };
}

/**
 * Insert text into the editor by formatting it into screenplay blocks.
 */
/** Get scene heading positions for the insert picker */
function getScenePositions(editor: Editor): Array<{ heading: string; endPos: number }> {
  const { doc } = editor.state;
  const scenes: Array<{ heading: string; startPos: number; endPos: number }> = [];

  doc.descendants((node, pos) => {
    if (node.type.name === "sceneHeading" || node.type.name === "scene-heading") {
      const text = node.textContent.trim();
      if (text) {
        // Close previous scene
        if (scenes.length > 0) {
          scenes[scenes.length - 1].endPos = pos;
        }
        scenes.push({ heading: text, startPos: pos, endPos: doc.content.size });
      }
    }
  });

  return scenes.map((s) => ({ heading: s.heading, endPos: s.endPos }));
}

function InsertButton({
  content,
  editor,
  documentId,
}: {
  content: string;
  editor: Editor;
  documentId: string;
}) {
  const trpc = useTRPC();
  const t = useTranslations("Chat");
  const [inserted, setInserted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [targetPos, setTargetPos] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const formatMutation = useMutation(
    trpc.ai.format.mutationOptions({
      onSuccess: (result) => {
        const nodes = result.blocks
          .map((block) => {
            const nodeType = editor.schema.nodes[block.type];
            if (!nodeType) return null;
            return nodeType.create(
              null,
              block.text ? editor.schema.text(block.text) : null
            );
          })
          .filter((n): n is NonNullable<typeof n> => n != null);

        if (nodes.length > 0) {
          const fragment = Fragment.from(nodes);
          const { tr } = editor.state;
          const insertPos = targetPos ?? editor.state.doc.content.size;
          tr.insert(insertPos, fragment);
          editor.view.dispatch(tr);
          toast.success(t("sceneInserted"));
          setInserted(true);
        } else {
          toast.error(t("couldNotFormat"));
        }
      },
      onError: (err) => {
        toast.error(t("formatError", { message: err.message }));
      },
    })
  );

  const handleInsertAt = (pos: number) => {
    setTargetPos(pos);
    setShowPicker(false);

    const { doc } = editor.state;
    const contextBefore = doc.textBetween(
      Math.max(0, pos - 500),
      pos,
      "\n"
    );
    const contextAfter = doc.textBetween(
      pos,
      Math.min(doc.content.size, pos + 500),
      "\n"
    );

    formatMutation.mutate({
      documentId,
      selectedText: content,
      selectionFrom: pos,
      selectionTo: pos,
      contextBefore,
      contextAfter,
    });
  };

  if (inserted) {
    return (
      <span className="flex items-center gap-1 text-[9px] text-green-500">
        <Check className="h-3 w-3" />
        {t("inserted")}
      </span>
    );
  }

  const scenes = getScenePositions(editor);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        disabled={formatMutation.isPending}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-ai-accent/10 hover:text-ai-accent disabled:opacity-50"
        title={t("insertTitle")}
      >
        {formatMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <FileDown className="h-3 w-3" />
        )}
        {t("insert")}
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full right-0 z-50 mb-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-border bg-background shadow-xl"
          >
            <div className="p-1">
              <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("insertWhere")}
              </p>
              {/* Insert at beginning */}
              <button
                onClick={() => handleInsertAt(0)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              >
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{t("insertAtBeginning")}</span>
              </button>
              {/* After each scene */}
              {scenes.map((scene, idx) => (
                <button
                  key={idx}
                  onClick={() => handleInsertAt(scene.endPos)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
                >
                  <Film className="h-3 w-3 text-ai-accent" />
                  <span className="truncate">{t("insertAfter")} {scene.heading}</span>
                </button>
              ))}
              {/* Insert at end */}
              <button
                onClick={() => handleInsertAt(editor.state.doc.content.size)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
              >
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span>{t("insertAtEnd")}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SaveNoteButton({
  content,
  projectId,
}: {
  content: string;
  projectId: string;
}) {
  const trpc = useTRPC();
  const t = useTranslations("Chat");
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const noteMutation = useMutation(
    trpc.note.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.note.list.queryKey({ projectId }),
        });
        toast.success(t("noteSaved"));
        setSaved(true);
      },
    })
  );

  if (saved) {
    return (
      <span className="flex items-center gap-1 text-[9px] text-green-500">
        <Check className="h-3 w-3" />
        {t("noteSaved")}
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        const title = content.slice(0, 80).replace(/\n/g, " ");
        noteMutation.mutate({ projectId, title, plainText: content });
      }}
      disabled={noteMutation.isPending}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-ai-accent/10 hover:text-ai-accent disabled:opacity-50"
      title={t("saveNote")}
    >
      {noteMutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <StickyNote className="h-3 w-3" />
      )}
      {t("saveNote")}
    </button>
  );
}

function ChatBubble({
  message,
  editor,
  documentId,
  projectId,
}: {
  message: ChatMessage;
  editor: Editor | null;
  documentId: string;
  projectId: string;
}) {
  const isUser = message.role === "USER";
  const showInsert = !isUser && !message.isStreaming && editor && message.content.length > 0;
  const showSaveNote = !isUser && !message.isStreaming && message.content.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "chat-message-user"
            : `chat-message-assistant ${message.isStreaming ? "chat-message-streaming" : ""}`
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {!message.isStreaming && (
            <span className="text-[9px] text-muted-foreground/60">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {showInsert && (
              <InsertButton
                content={message.content}
                editor={editor}
                documentId={documentId}
              />
            )}
            {showSaveNote && (
              <SaveNoteButton content={message.content} projectId={projectId} />
            )}
          </div>
        </div>
        {message.isStreaming && !message.content && (
          <div className="flex gap-1 py-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ai-accent [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ai-accent [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ai-accent" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ModelSelector({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const t = useTranslations("Chat");

  const { data: availableModels } = useQuery(
    trpc.provider.availableModels.queryOptions()
  );

  const { data: projectData } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );

  const project = projectData as { preferredProvider?: string | null; preferredModel?: string | null } | undefined;

  // Get a display label for the current model
  let currentLabel = t("auto");
  if (project?.preferredModel && availableModels) {
    for (const p of availableModels) {
      const found = p.models.find((m) => m.id === project.preferredModel);
      if (found) {
        currentLabel = found.label;
        break;
      }
    }
  }

  if (!availableModels || availableModels.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {currentLabel}
        <ChevronDown className="h-3 w-3" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-full z-50 mt-1 max-h-64 w-56 overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-xl"
          >
            {availableModels.map((p) => (
              <div key={p.provider}>
                <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {p.provider}
                </div>
                {p.models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      // This is a session-level override — stored in the hook
                      // We dispatch a custom event the hook can listen to
                      window.dispatchEvent(
                        new CustomEvent("chat-model-override", {
                          detail: { provider: p.provider, model: m.id },
                        })
                      );
                      setOpen(false);
                    }}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent ${
                      project?.preferredModel === m.id ? "text-ai-accent" : "text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatPanel({ editor, documentId, projectId }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [sceneFilter, setSceneFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const t = useTranslations("Chat");

  const trpcCtx = useTRPC();
  const {
    messages,
    sendMessage,
    isStreaming,
    stopStreaming,
    clearHistory,
    hasProvider,
    overrideProvider,
    overrideModel,
    setModelOverride,
  } = useChatStream(projectId);

  // Get project's preferred model for cost estimation
  const { data: projectData } = useQuery(
    trpcCtx.project.getById.queryOptions({ id: projectId })
  );
  const activeModel = overrideModel || (projectData as { preferredModel?: string | null } | undefined)?.preferredModel || null;

  // Listen for model override events from the selector
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && setModelOverride) {
        setModelOverride(detail.provider, detail.model);
      }
    };
    window.addEventListener("chat-model-override", handler);
    return () => window.removeEventListener("chat-model-override", handler);
  }, [setModelOverride]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Scene headings for @-mentions
  const sceneHeadings = useMemo(() => extractSceneHeadings(editor), [editor]);
  const filteredScenes = useMemo(() => {
    if (!sceneFilter) return sceneHeadings.slice(0, 8);
    const lower = sceneFilter.toLowerCase();
    return sceneHeadings.filter(h => h.toLowerCase().includes(lower)).slice(0, 8);
  }, [sceneHeadings, sceneFilter]);

  const insertSceneRef = useCallback((heading: string) => {
    setInput(prev => {
      // Replace the @... text with the reference
      const atIndex = prev.lastIndexOf("@");
      if (atIndex >= 0) {
        return prev.slice(0, atIndex) + `@[${heading}] `;
      }
      return prev + `@[${heading}] `;
    });
    setShowScenePicker(false);
    setSceneFilter("");
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const editorContext = extractEditorContext(editor);

    // Parse @[...] references and include scene texts
    const { sceneTexts } = parseSceneReferences(trimmed, editor);
    if (sceneTexts.length > 0) {
      // Add referenced scene texts to editor context
      const referencedText = sceneTexts.join("\n\n---\n\n");
      sendMessage(trimmed, {
        ...editorContext,
        currentSceneText: referencedText,
      });
    } else {
      sendMessage(trimmed, editorContext);
    }
    setInput("");
    setShowScenePicker(false);
  }, [input, isStreaming, editor, sendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Detect @ trigger for scene picker
    const atIndex = val.lastIndexOf("@");
    if (atIndex >= 0 && atIndex === val.length - 1) {
      setShowScenePicker(true);
      setSceneFilter("");
    } else if (atIndex >= 0 && showScenePicker) {
      const afterAt = val.slice(atIndex + 1);
      // If user typed `@[` it means they're in a reference — close picker
      if (afterAt.startsWith("[")) {
        setShowScenePicker(false);
      } else if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
        setSceneFilter(afterAt);
      } else {
        setShowScenePicker(false);
      }
    }
  }, [showScenePicker]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (showScenePicker && filteredScenes.length > 0) {
        insertSceneRef(filteredScenes[0]);
      } else {
        handleSend();
      }
    }
    if (e.key === "Escape" && showScenePicker) {
      setShowScenePicker(false);
    }
  };

  // No provider state
  if (!hasProvider) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {t("aiUnavailable")}
        </p>
        <p className="text-xs text-muted-foreground/60">
          {t("contactAdmin")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("title")}
        </span>
        <div className="flex items-center gap-1">
          <ModelSelector projectId={projectId} />
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="rounded p-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t("toggleSuggestions")}
            aria-label={t("toggleSuggestions")}
          >
            <Sparkles className="h-3 w-3" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title={t("clearHistory")}
              aria-label={t("clearHistory")}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Sparkles className="h-6 w-6 text-ai-accent/40" />
            <p className="text-xs text-muted-foreground">
              {t("emptyState")}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                editor={editor}
                documentId={documentId}
                projectId={projectId}
              />
            ))}
          </AnimatePresence>
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (collapsible) */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="max-h-48 overflow-y-auto">
              <SuggestionPreview editor={editor} documentId={documentId} />
              <SuggestionHistory documentId={documentId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="relative border-t border-border p-2">
        {/* Scene mention picker */}
        <AnimatePresence>
          {showScenePicker && filteredScenes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="absolute bottom-full left-2 right-2 z-10 mb-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-background shadow-xl"
            >
              <div className="p-1">
                <p className="px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("sceneReference")}
                </p>
                {filteredScenes.map((heading) => (
                  <button
                    key={heading}
                    onClick={() => insertSceneRef(heading)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    <Film className="h-3 w-3 text-ai-accent" />
                    <span className="truncate">{heading}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              rows={1}
              disabled={isStreaming}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-ai-accent focus:outline-none disabled:opacity-50"
            />
            {/* @ button for scene references */}
            {sceneHeadings.length > 0 && !isStreaming && (
              <button
                onClick={() => {
                  setInput(prev => prev + "@");
                  setShowScenePicker(true);
                  setSceneFilter("");
                  textareaRef.current?.focus();
                }}
                className="absolute bottom-2 right-2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-ai-accent"
                title={t("mentionScene")}
                aria-label={t("mentionScene")}
              >
                <AtSign className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="shrink-0 rounded-md bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20"
              title={t("stopGenerating")}
              aria-label={t("stopGenerating")}
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 rounded-md bg-ai-accent/10 p-2 text-ai-accent transition-colors hover:bg-ai-accent/20 disabled:opacity-30"
              title={t("sendMessage")}
              aria-label={t("sendMessage")}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between px-1">
          <span className="text-[9px] text-muted-foreground/40">
            {input.trim()
              ? estimateChatCost(input, activeModel)
              : ""}
          </span>
          <span className="text-[9px] text-muted-foreground/50">
            {t("shiftEnter")}
          </span>
        </div>
      </div>
    </div>
  );
}
