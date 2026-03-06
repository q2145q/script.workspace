import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";

/** Extract plain text from TipTap JSON */
function extractPlainText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const node = content as Record<string, unknown>;
  if (node.type === "text" && typeof node.text === "string") return node.text;
  if (!Array.isArray(node.content)) return "";
  return (node.content as unknown[]).map(extractPlainText).join(" ");
}

export interface SearchResultItem {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  matchType: "title" | "content";
}

export const searchRouter = createTRPCRouter({
  /** Search documents by title and content across accessible projects */
  documents: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        projectId: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }): Promise<SearchResultItem[]> => {
      const userId = ctx.user.id;
      const searchTerm = input.query.trim();

      if (!searchTerm) return [];

      const accessFilter = {
        deletedAt: null as null,
        ...(input.projectId ? { projectId: input.projectId } : {}),
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
      };

      // Search by title using Prisma ILIKE
      const titleResults = await prisma.document.findMany({
        where: {
          ...accessFilter,
          title: { contains: searchTerm, mode: "insensitive" as const },
        },
        select: {
          id: true,
          title: true,
          projectId: true,
          project: { select: { title: true } },
        },
        take: input.limit,
        orderBy: { updatedAt: "desc" },
      });

      const results: SearchResultItem[] = titleResults.map((d) => ({
        id: d.id,
        title: d.title,
        projectId: d.projectId,
        projectTitle: d.project.title,
        matchType: "title" as const,
      }));

      // Also search in content — fetch docs not already found
      if (results.length < input.limit) {
        const titleIds = results.map((r) => r.id);
        const remaining = input.limit - results.length;

        const contentDocs = await prisma.document.findMany({
          where: {
            ...accessFilter,
            id: { notIn: titleIds },
          },
          select: {
            id: true,
            title: true,
            projectId: true,
            project: { select: { title: true } },
            content: true,
          },
          take: remaining * 3,
          orderBy: { updatedAt: "desc" },
        });

        const contentMatches = contentDocs
          .filter((doc) => {
            const text = extractPlainText(doc.content);
            return text.toLowerCase().includes(searchTerm.toLowerCase());
          })
          .slice(0, remaining);

        for (const doc of contentMatches) {
          results.push({
            id: doc.id,
            title: doc.title,
            projectId: doc.projectId,
            projectTitle: doc.project.title,
            matchType: "content",
          });
        }
      }

      return results;
    }),
});
