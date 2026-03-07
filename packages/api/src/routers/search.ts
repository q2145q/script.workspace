import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, Prisma } from "@script/db";

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

      // Content search via PostgreSQL FTS (GIN index on contentText)
      if (results.length < input.limit) {
        const titleIds = results.map((r) => r.id);
        const remaining = input.limit - results.length;

        const projectFilter = input.projectId
          ? Prisma.sql`AND d."projectId" = ${input.projectId}`
          : Prisma.empty;

        const excludeFilter = titleIds.length > 0
          ? Prisma.sql`AND d.id NOT IN (${Prisma.join(titleIds)})`
          : Prisma.empty;

        const contentMatches = await prisma.$queryRaw<
          { id: string; title: string; projectId: string; projectTitle: string }[]
        >(Prisma.sql`
          SELECT d.id, d.title, d."projectId", p.title AS "projectTitle"
          FROM document d
          JOIN project p ON d."projectId" = p.id
          WHERE d."deletedAt" IS NULL
            AND d."contentText" IS NOT NULL
            ${projectFilter}
            ${excludeFilter}
            AND (
              p."ownerId" = ${userId}
              OR EXISTS (
                SELECT 1 FROM project_member pm
                WHERE pm."projectId" = p.id AND pm."userId" = ${userId}
              )
            )
            AND to_tsvector('simple', d."contentText") @@ plainto_tsquery('simple', ${searchTerm})
          ORDER BY d."updatedAt" DESC
          LIMIT ${remaining}
        `);

        for (const doc of contentMatches) {
          results.push({
            id: doc.id,
            title: doc.title,
            projectId: doc.projectId,
            projectTitle: doc.projectTitle,
            matchType: "content",
          });
        }
      }

      return results;
    }),
});
