"use client";

import { useState } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("FEATURE_FILM");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const createMutation = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: (project) => {
        queryClient.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success("Project created");
        setOpen(false);
        setTitle("");
        setDescription("");
        router.push(`/project/${project.id}`);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    })
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        New Project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">New Project</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              title,
              description: description || undefined,
              type: type as "FEATURE_FILM" | "TV_SERIES" | "SHORT_FILM" | "OTHER",
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="My Screenplay"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="A brief description of your project"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="FEATURE_FILM">Feature Film</option>
              <option value="TV_SERIES">TV Series</option>
              <option value="SHORT_FILM">Short Film</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
