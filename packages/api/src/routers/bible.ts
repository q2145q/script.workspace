import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { getBibleSchema, saveBibleSchema } from "@script/types";
import { assertProjectAccess, assertEditorAccess } from "../access";

/** Ensure bible record exists, return its id */
async function ensureBible(projectId: string): Promise<string> {
  const bible = await prisma.projectBible.upsert({
    where: { projectId },
    update: {},
    create: { projectId, content: {} },
    select: { id: true },
  });
  return bible.id;
}

const SECTION_TYPES = ["CHARACTERS", "LOCATIONS", "OBJECTS", "ARCS", "CUSTOM"] as const;

export const bibleRouter = createTRPCRouter({
  /** Get the project bible (auto-creates if not exists) */
  get: protectedProcedure
    .input(getBibleSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      const bible = await prisma.projectBible.upsert({
        where: { projectId: input.projectId },
        update: {},
        create: {
          projectId: input.projectId,
          content: {},
        },
        include: {
          sections: { orderBy: { sortOrder: "asc" } },
        },
      });

      return bible;
    }),

  /** Save bible content (legacy single-content mode) */
  save: protectedProcedure
    .input(saveBibleSchema)
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);

      const bible = await prisma.projectBible.upsert({
        where: { projectId: input.projectId },
        update: { content: input.content as unknown as Prisma.InputJsonValue },
        create: {
          projectId: input.projectId,
          content: input.content as unknown as Prisma.InputJsonValue,
        },
      });

      return bible;
    }),

  // ===== SECTION ENDPOINTS =====

  /** List sections for a project's bible */
  listSections: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const bibleId = await ensureBible(input.projectId);

      return prisma.bibleSection.findMany({
        where: { bibleId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  /** Create a new bible section */
  createSection: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.enum(SECTION_TYPES).default("CUSTOM"),
        title: z.string().min(1).max(200),
        content: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);
      const bibleId = await ensureBible(input.projectId);

      // Get max sortOrder
      const last = await prisma.bibleSection.findFirst({
        where: { bibleId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      const nextOrder = (last?.sortOrder ?? -1) + 1;

      return prisma.bibleSection.create({
        data: {
          bibleId,
          type: input.type,
          title: input.title,
          content: (input.content ?? {}) as Prisma.InputJsonValue,
          sortOrder: nextOrder,
        },
      });
    }),

  /** Update a bible section (title, content, type, sortOrder) */
  updateSection: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sectionId: z.string(),
        title: z.string().min(1).max(200).optional(),
        content: z.any().optional(),
        type: z.enum(SECTION_TYPES).optional(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);
      const bibleId = await ensureBible(input.projectId);

      // Verify section belongs to this bible
      const section = await prisma.bibleSection.findFirst({
        where: { id: input.sectionId, bibleId },
        select: { id: true },
      });
      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      const data: Record<string, unknown> = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.content !== undefined) data.content = input.content as Prisma.InputJsonValue;
      if (input.type !== undefined) data.type = input.type;
      if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;

      return prisma.bibleSection.update({
        where: { id: input.sectionId },
        data,
      });
    }),

  /** Delete a bible section */
  deleteSection: protectedProcedure
    .input(z.object({ projectId: z.string(), sectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);
      const bibleId = await ensureBible(input.projectId);

      // Verify section belongs to this bible
      const section = await prisma.bibleSection.findFirst({
        where: { id: input.sectionId, bibleId },
        select: { id: true },
      });
      if (!section) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
      }

      await prisma.bibleSection.delete({ where: { id: input.sectionId } });
      return { success: true };
    }),

  /** Reorder sections */
  reorderSections: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        /** Array of section IDs in desired order */
        sectionIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);

      await prisma.$transaction(
        input.sectionIds.map((id, index) =>
          prisma.bibleSection.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      );

      return { success: true };
    }),

  /** Search across all sections of a bible */
  searchSections: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        query: z.string().min(1).max(200),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      const bibleId = await ensureBible(input.projectId);

      const sections = await prisma.bibleSection.findMany({
        where: {
          bibleId,
          OR: [
            { title: { contains: input.query, mode: "insensitive" } },
          ],
        },
        orderBy: { sortOrder: "asc" },
      });

      return sections;
    }),

  /** Convert legacy bible content into sections (one-time migration) */
  convertToSections: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertEditorAccess(input.projectId, ctx.user.id);
      const bibleId = await ensureBible(input.projectId);

      // Check if sections already exist
      const existing = await prisma.bibleSection.count({ where: { bibleId } });
      if (existing > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Sections already exist. Cannot convert legacy content.",
        });
      }

      // Get the legacy content
      const bible = await prisma.projectBible.findUnique({
        where: { id: bibleId },
        select: { content: true },
      });

      if (!bible?.content || typeof bible.content !== "object") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No legacy content to convert" });
      }

      // Create default sections with legacy content placed in "General" section
      const defaultSections = [
        { type: "CHARACTERS", title: "Characters", content: {} },
        { type: "LOCATIONS", title: "Locations", content: {} },
        { type: "ARCS", title: "Story Arcs", content: {} },
        { type: "CUSTOM", title: "General", content: bible.content as Prisma.InputJsonValue },
      ];

      await prisma.$transaction(
        defaultSections.map((s, index) =>
          prisma.bibleSection.create({
            data: {
              bibleId,
              type: s.type,
              title: s.title,
              content: s.content as Prisma.InputJsonValue,
              sortOrder: index,
            },
          })
        )
      );

      return { success: true, sectionsCreated: defaultSections.length };
    }),
});
