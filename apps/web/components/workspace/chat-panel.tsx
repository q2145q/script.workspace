"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, Trash2, Sparkles, FileDown, Loader2, Check, ChevronDown } from "lucide-react";
import { Fragment, type Editor } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useChatStream, type ChatMessage } from "@/hooks/use-chat-stream";
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

/**
 * Insert text into the editor by formatting it into screenplay blocks.
 */
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
  const [inserted, setInserted] = useState(false);

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
          const $pos = editor.state.doc.resolve(editor.state.selection.to);
          const insertPos = $pos.after($pos.depth);
          tr.insert(insertPos, fragment);
          editor.view.dispatch(tr);
          toast.success("Scene inserted into document");
          setInserted(true);
        } else {
          toast.error("Could not format text into screenplay blocks");
        }
      },
      onError: (err) => {
        toast.error(`Format error: ${err.message}`);
      },
    })
  );

  const handleInsert = () => {
    const { selection, doc } = editor.state;
    const contextBefore = doc.textBetween(
      Math.max(0, selection.from - 500),
      selection.from,
      "\n"
    );
    const contextAfter = doc.textBetween(
      selection.to,
      Math.min(doc.content.size, selection.to + 500),
      "\n"
    );

    formatMutation.mutate({
      documentId,
      selectedText: content,
      selectionFrom: selection.from,
      selectionTo: selection.to,
      contextBefore,
      contextAfter,
    });
  };

  if (inserted) {
    return (
      <span className="flex items-center gap-1 text-[9px] text-green-500">
        <Check className="h-3 w-3" />
        Inserted
      </span>
    );
  }

  return (
    <button
      onClick={handleInsert}
      disabled={formatMutation.isPending}
      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:bg-ai-accent/10 hover:text-ai-accent disabled:opacity-50"
      title="Format and insert into document at cursor"
    >
      {formatMutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <FileDown className="h-3 w-3" />
      )}
      Insert into document
    </button>
  );
}

function ChatBubble({
  message,
  editor,
  documentId,
}: {
  message: ChatMessage;
  editor: Editor | null;
  documentId: string;
}) {
  const isUser = message.role === "USER";
  const showInsert = !isUser && !message.isStreaming && editor && message.content.length > 0;

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
          {showInsert && (
            <div className="opacity-0 transition-opacity group-hover:opacity-100">
              <InsertButton
                content={message.content}
                editor={editor}
                documentId={documentId}
              />
            </div>
          )}
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

  const { data: availableModels } = useQuery(
    trpc.provider.availableModels.queryOptions()
  );

  const { data: projectData } = useQuery(
    trpc.project.getById.queryOptions({ id: projectId })
  );

  const project = projectData as { preferredProvider?: string | null; preferredModel?: string | null } | undefined;

  // Get a display label for the current model
  let currentLabel = "Auto";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const editorContext = extractEditorContext(editor);
    sendMessage(trimmed, editorContext);
    setInput("");
  }, [input, isStreaming, editor, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // No provider state
  if (!hasProvider) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          AI features are temporarily unavailable
        </p>
        <p className="text-xs text-muted-foreground/60">
          Contact the administrator to configure AI providers
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          AI Chat
        </span>
        <div className="flex items-center gap-1">
          <ModelSelector projectId={projectId} />
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="rounded p-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Toggle suggestions"
          >
            <Sparkles className="h-3 w-3" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Clear chat history"
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
              Ask about your screenplay, brainstorm ideas, or get feedback
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
      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your screenplay..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ai-accent focus:outline-none disabled:opacity-50"
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="shrink-0 rounded-md bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive/20"
              title="Stop generating"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 rounded-md bg-ai-accent/10 p-2 text-ai-accent transition-colors hover:bg-ai-accent/20 disabled:opacity-30"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-center text-[9px] text-muted-foreground/50">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
