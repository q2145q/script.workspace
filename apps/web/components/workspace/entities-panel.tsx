"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MapPin,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { Editor } from "@script/editor";
import { useEditorState } from "@script/editor";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type EntityTab = "characters" | "locations" | "terms";

interface EntitiesPanelProps {
  projectId: string;
  defaultTab?: EntityTab;
  editor?: Editor | null;
}

// Extract unique character names from editor document
function extractCharacterNames(editor: Editor): string[] {
  const names = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (node.type.name === "character" && node.textContent.trim()) {
      names.add(node.textContent.trim());
    }
  });
  return Array.from(names).sort();
}

// Extract unique location names from scene headings
function extractLocationNames(editor: Editor): string[] {
  const locations = new Set<string>();
  const prefixPattern = /^(?:INT\.|EXT\.|INT\.\/EXT\.|EXT\.\/INT\.|ИНТ\.|НАТ\.|ИНТ\.\/НАТ\.|НАТ\.\/ИНТ\.)\s*/i;
  const timeSuffixPattern = /\s*[-—]\s*(?:DAY|NIGHT|MORNING|EVENING|DUSK|DAWN|ДЕНЬ|НОЧЬ|УТРО|ВЕЧЕР)\s*$/i;

  editor.state.doc.descendants((node) => {
    if (node.type.name === "sceneHeading" && node.textContent.trim()) {
      let text = node.textContent.trim();
      // Remove prefix (INT./EXT./etc.)
      text = text.replace(prefixPattern, "");
      // Remove time of day suffix
      text = text.replace(timeSuffixPattern, "");
      text = text.trim();
      if (text) {
        locations.add(text);
      }
    }
  });
  return Array.from(locations).sort();
}

const TABS: { key: EntityTab; label: string; icon: typeof Users }[] = [
  { key: "characters", label: "Characters", icon: Users },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "terms", label: "Glossary", icon: BookOpen },
];

// ============================================================
// Characters Sub-Panel
// ============================================================

function CharactersTab({ projectId, editor }: { projectId: string; editor?: Editor | null }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [traitInput, setTraitInput] = useState("");
  const [traits, setTraits] = useState<string[]>([]);

  const query = useQuery(
    trpc.entity.listCharacters.queryOptions({ projectId })
  );

  const createMutation = useMutation(
    trpc.entity.createCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listCharacters.queryKey({ projectId }),
        });
        resetForm();
        toast.success("Character created");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const updateMutation = useMutation(
    trpc.entity.updateCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listCharacters.queryKey({ projectId }),
        });
        resetForm();
        toast.success("Character updated");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.entity.deleteCharacter.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listCharacters.queryKey({ projectId }),
        });
        toast.success("Character deleted");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const [aiDescribingId, setAiDescribingId] = useState<string | null>(null);
  const describeMutation = useMutation(
    trpc.ai.describeCharacter.mutationOptions({
      onError: (err) => {
        toast.error(err.message);
        setAiDescribingId(null);
      },
    })
  );

  const handleAIDescribe = async (charId: string, charName: string) => {
    setAiDescribingId(charId);
    const context = editor
      ? editor.state.doc.textBetween(0, Math.min(editor.state.doc.content.size, 10000), "\n")
      : "";
    try {
      const result = await describeMutation.mutateAsync({
        projectId,
        characterName: charName,
        characterContext: context,
      });
      updateMutation.mutate({ id: charId, description: result.description });
    } finally {
      setAiDescribingId(null);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName("");
    setDescription("");
    setTraits([]);
    setTraitInput("");
  };

  const startEdit = (char: { id: string; name: string; description: string | null; traits: string[] }) => {
    setEditId(char.id);
    setName(char.name);
    setDescription(char.description ?? "");
    setTraits(char.traits);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editId) {
      updateMutation.mutate({
        id: editId,
        name: name.trim(),
        description: description.trim() || undefined,
        traits,
      });
    } else {
      createMutation.mutate({
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
        traits,
      });
    }
  };

  const addTrait = () => {
    const t = traitInput.trim();
    if (t && !traits.includes(t)) {
      setTraits([...traits, t]);
    }
    setTraitInput("");
  };

  const characters = query.data ?? [];

  // Detected characters from script
  const detectedNames = useEditorState({
    editor: editor as Editor,
    selector: (ctx) => extractCharacterNames(ctx.editor),
  }) as string[] | null;

  const savedNames = new Set(characters.map((c) => c.name.toUpperCase()));
  const unsavedDetected = (detectedNames ?? []).filter(
    (n) => !savedNames.has(n.toUpperCase())
  );

  return (
    <div>
      {/* Add button */}
      <div className="flex justify-end px-3 py-2">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="space-y-2 p-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Character name"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent resize-none"
              />
              {/* Traits */}
              <div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {traits.map((t) => (
                    <span
                      key={t}
                      className="flex items-center gap-0.5 rounded-full bg-ai-accent/10 px-2 py-0.5 text-[10px] font-medium text-ai-accent"
                    >
                      {t}
                      <button
                        onClick={() => setTraits(traits.filter((x) => x !== t))}
                        className="ml-0.5 hover:text-red-400"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={traitInput}
                    onChange={(e) => setTraitInput(e.target.value)}
                    placeholder="Add trait"
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTrait();
                      }
                    }}
                  />
                  <button onClick={addTrait} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                    +
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-ai-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-ai-accent/80 disabled:opacity-50"
                >
                  {editId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {query.isLoading ? (
        <div className="flex justify-center py-6">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : characters.length === 0 ? (
        <EmptyState icon={Users} label="No characters yet" />
      ) : (
        <div className="space-y-0.5 p-2">
          {characters.map((char) => (
            <div key={char.id} className="group rounded-md border border-transparent hover:border-border">
              <button
                onClick={() => setExpandedId(expandedId === char.id ? null : char.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                {expandedId === char.id ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {char.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAIDescribe(char.id, char.name);
                    }}
                    disabled={aiDescribingId === char.id}
                    className="rounded p-0.5 text-muted-foreground hover:text-ai-accent disabled:opacity-50"
                    title="AI describe"
                  >
                    {aiDescribingId === char.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-ai-accent" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(char);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ id: char.id });
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </button>
              <AnimatePresence>
                {expandedId === char.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2 pl-8">
                      {char.description && (
                        <p className="text-xs text-muted-foreground">{char.description}</p>
                      )}
                      {char.traits.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {char.traits.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-ai-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-ai-accent"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {!char.description && char.traits.length === 0 && (
                        <p className="text-[10px] text-muted-foreground/50 italic">No details</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Detected from Script */}
      {editor && unsavedDetected.length > 0 && (
        <div className="border-t border-border p-2">
          <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Detected in Script
          </p>
          <div className="space-y-0.5">
            {unsavedDetected.map((detectedName) => (
              <div
                key={detectedName}
                className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                <span className="truncate">{detectedName}</span>
                <button
                  onClick={() => {
                    createMutation.mutate({
                      projectId,
                      name: detectedName,
                    });
                  }}
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-ai-accent hover:bg-ai-accent/10"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Locations Sub-Panel
// ============================================================

function LocationsTab({ projectId, editor }: { projectId: string; editor?: Editor | null }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const query = useQuery(
    trpc.entity.listLocations.queryOptions({ projectId })
  );

  const createMutation = useMutation(
    trpc.entity.createLocation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listLocations.queryKey({ projectId }),
        });
        resetForm();
        toast.success("Location created");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const updateMutation = useMutation(
    trpc.entity.updateLocation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listLocations.queryKey({ projectId }),
        });
        resetForm();
        toast.success("Location updated");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.entity.deleteLocation.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listLocations.queryKey({ projectId }),
        });
        toast.success("Location deleted");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const [aiDescribingId, setAiDescribingId] = useState<string | null>(null);
  const describeLocMutation = useMutation(
    trpc.ai.describeLocation.mutationOptions({
      onError: (err) => {
        toast.error(err.message);
        setAiDescribingId(null);
      },
    })
  );

  const handleAIDescribe = async (locId: string, locName: string) => {
    setAiDescribingId(locId);
    const context = editor
      ? editor.state.doc.textBetween(0, Math.min(editor.state.doc.content.size, 10000), "\n")
      : "";
    try {
      const result = await describeLocMutation.mutateAsync({
        projectId,
        locationName: locName,
        locationContext: context,
      });
      updateMutation.mutate({ id: locId, description: result.description });
    } finally {
      setAiDescribingId(null);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setName("");
    setDescription("");
  };

  const startEdit = (loc: { id: string; name: string; description: string | null }) => {
    setEditId(loc.id);
    setName(loc.name);
    setDescription(loc.description ?? "");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editId) {
      updateMutation.mutate({
        id: editId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    } else {
      createMutation.mutate({
        projectId,
        name: name.trim(),
        description: description.trim() || undefined,
      });
    }
  };

  const locations = query.data ?? [];

  // Detected locations from script
  const detectedLocations = useEditorState({
    editor: editor as Editor,
    selector: (ctx) => extractLocationNames(ctx.editor),
  }) as string[] | null;

  const savedLocNames = new Set(locations.map((l) => l.name.toUpperCase()));
  const unsavedDetectedLocs = (detectedLocations ?? []).filter(
    (n) => !savedLocNames.has(n.toUpperCase())
  );

  return (
    <div>
      <div className="flex justify-end px-3 py-2">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="space-y-2 p-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Location name"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-ai-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-ai-accent/80 disabled:opacity-50"
                >
                  {editId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {query.isLoading ? (
        <div className="flex justify-center py-6">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : locations.length === 0 ? (
        <EmptyState icon={MapPin} label="No locations yet" />
      ) : (
        <div className="space-y-0.5 p-2">
          {locations.map((loc) => (
            <div key={loc.id} className="group rounded-md border border-transparent hover:border-border">
              <button
                onClick={() => setExpandedId(expandedId === loc.id ? null : loc.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                {expandedId === loc.id ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {loc.name}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAIDescribe(loc.id, loc.name);
                    }}
                    disabled={aiDescribingId === loc.id}
                    className="rounded p-0.5 text-muted-foreground hover:text-ai-accent disabled:opacity-50"
                    title="AI describe"
                  >
                    {aiDescribingId === loc.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-ai-accent" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(loc);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ id: loc.id });
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </button>
              <AnimatePresence>
                {expandedId === loc.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2 pl-8">
                      {loc.description ? (
                        <p className="text-xs text-muted-foreground">{loc.description}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 italic">No description</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Detected from Script */}
      {editor && unsavedDetectedLocs.length > 0 && (
        <div className="border-t border-border p-2">
          <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Detected in Script
          </p>
          <div className="space-y-0.5">
            {unsavedDetectedLocs.map((detectedName) => (
              <div
                key={detectedName}
                className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                <span className="truncate">{detectedName}</span>
                <button
                  onClick={() => {
                    createMutation.mutate({
                      projectId,
                      name: detectedName,
                    });
                  }}
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-ai-accent hover:bg-ai-accent/10"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Terms Sub-Panel
// ============================================================

function TermsTab({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");

  const query = useQuery(
    trpc.entity.listTerms.queryOptions({ projectId })
  );

  const createMutation = useMutation(
    trpc.entity.createTerm.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listTerms.queryKey({ projectId }),
        });
        resetForm();
        toast.success("Term created");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const updateMutation = useMutation(
    trpc.entity.updateTerm.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listTerms.queryKey({ projectId }),
        });
        resetForm();
        toast.success("Term updated");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const deleteMutation = useMutation(
    trpc.entity.deleteTerm.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.entity.listTerms.queryKey({ projectId }),
        });
        toast.success("Term deleted");
      },
      onError: (err) => toast.error(err.message),
    })
  );

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setTerm("");
    setDefinition("");
  };

  const startEdit = (t: { id: string; term: string; definition: string | null }) => {
    setEditId(t.id);
    setTerm(t.term);
    setDefinition(t.definition ?? "");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!term.trim()) return;
    if (editId) {
      updateMutation.mutate({
        id: editId,
        term: term.trim(),
        definition: definition.trim() || undefined,
      });
    } else {
      createMutation.mutate({
        projectId,
        term: term.trim(),
        definition: definition.trim() || undefined,
      });
    }
  };

  const terms = query.data ?? [];

  return (
    <div>
      <div className="flex justify-end px-3 py-2">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="space-y-2 p-3">
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Term"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent"
              />
              <textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Definition"
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ai-accent resize-none"
              />
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!term.trim() || createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-ai-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-ai-accent/80 disabled:opacity-50"
                >
                  {editId ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {query.isLoading ? (
        <div className="flex justify-center py-6">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : terms.length === 0 ? (
        <EmptyState icon={BookOpen} label="No terms yet" />
      ) : (
        <div className="space-y-0.5 p-2">
          {terms.map((t) => (
            <div key={t.id} className="group rounded-md border border-transparent hover:border-border">
              <button
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left"
              >
                {expandedId === t.id ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {t.term}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(t);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate({ id: t.id });
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </button>
              <AnimatePresence>
                {expandedId === t.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2 pl-8">
                      {t.definition ? (
                        <p className="text-xs text-muted-foreground">{t.definition}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 italic">No definition</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ icon: Icon, label }: { icon: typeof Users; label: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground/30" />
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================================
// Main Panel
// ============================================================

export function EntitiesPanel({ projectId, defaultTab = "characters", editor }: EntitiesPanelProps) {
  const [activeTab, setActiveTab] = useState<EntityTab>(defaultTab);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Tab bar */}
      <div className="glass-panel flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-ai-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "characters" && <CharactersTab projectId={projectId} editor={editor} />}
        {activeTab === "locations" && <LocationsTab projectId={projectId} editor={editor} />}
        {activeTab === "terms" && <TermsTab projectId={projectId} />}
      </div>
    </div>
  );
}
