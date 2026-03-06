import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";

/** Check that user can access the document's project */
async function assertDocumentAccess(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      deletedAt: null,
      project: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    },
    select: { id: true, projectId: true },
  });
  if (!doc) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Document not found or no access" });
  }
  return doc;
}

const sceneMetadataItem = z.object({
  sceneIndex: z.number().int().min(0),
  heading: z.string(),
  intExt: z.string().nullish(),
  timeOfDay: z.string().nullish(),
  location: z.string().nullish(),
  synopsis: z.string().nullish(),
  duration: z.number().nullish(),
  characters: z.array(z.string()).default([]),
  colorTag: z.string().nullish(),
  act: z.number().int().min(0).max(10).nullish(),
});

export const sceneMetadataRouter = createTRPCRouter({
  /** List all scene metadata for a document */
  list: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertDocumentAccess(input.documentId, ctx.user.id);

      return prisma.sceneMetadata.findMany({
        where: { documentId: input.documentId },
        orderBy: { sceneIndex: "asc" },
      });
    }),

  /** Sync scenes from client — upsert array, delete stale entries */
  sync: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        scenes: z.array(sceneMetadataItem).min(0).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertDocumentAccess(input.documentId, ctx.user.id);

      // Use a transaction: upsert all provided scenes, delete stale
      const validIndices = input.scenes.map((s) => s.sceneIndex);

      await prisma.$transaction(async (tx) => {
        // Upsert each scene
        for (const scene of input.scenes) {
          await tx.sceneMetadata.upsert({
            where: {
              documentId_sceneIndex: {
                documentId: input.documentId,
                sceneIndex: scene.sceneIndex,
              },
            },
            create: {
              documentId: input.documentId,
              sceneIndex: scene.sceneIndex,
              heading: scene.heading,
              intExt: scene.intExt ?? null,
              timeOfDay: scene.timeOfDay ?? null,
              location: scene.location ?? null,
              synopsis: scene.synopsis ?? null,
              duration: scene.duration ?? null,
              characters: scene.characters,
              colorTag: scene.colorTag ?? null,
              act: scene.act ?? null,
            },
            update: {
              heading: scene.heading,
              intExt: scene.intExt ?? null,
              timeOfDay: scene.timeOfDay ?? null,
              location: scene.location ?? null,
              characters: scene.characters,
              // Don't overwrite user-set fields if not provided
              ...(scene.synopsis !== undefined ? { synopsis: scene.synopsis ?? null } : {}),
              ...(scene.duration !== undefined ? { duration: scene.duration ?? null } : {}),
              ...(scene.colorTag !== undefined ? { colorTag: scene.colorTag ?? null } : {}),
              ...(scene.act !== undefined ? { act: scene.act ?? null } : {}),
            },
          });
        }

        // Delete scenes that no longer exist in the document
        if (validIndices.length > 0) {
          await tx.sceneMetadata.deleteMany({
            where: {
              documentId: input.documentId,
              sceneIndex: { notIn: validIndices },
            },
          });
        } else {
          // No scenes at all — clear everything
          await tx.sceneMetadata.deleteMany({
            where: { documentId: input.documentId },
          });
        }
      });

      return { success: true };
    }),

  /** Update a single scene's metadata (e.g., act, colorTag, synopsis) */
  update: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
        sceneIndex: z.number().int().min(0),
        act: z.number().int().min(0).max(10).nullish(),
        colorTag: z.string().nullish(),
        synopsis: z.string().nullish(),
        duration: z.number().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertDocumentAccess(input.documentId, ctx.user.id);

      const { documentId, sceneIndex, ...data } = input;

      return prisma.sceneMetadata.update({
        where: {
          documentId_sceneIndex: { documentId, sceneIndex },
        },
        data: {
          ...(data.act !== undefined ? { act: data.act ?? null } : {}),
          ...(data.colorTag !== undefined ? { colorTag: data.colorTag ?? null } : {}),
          ...(data.synopsis !== undefined ? { synopsis: data.synopsis ?? null } : {}),
          ...(data.duration !== undefined ? { duration: data.duration ?? null } : {}),
        },
      });
    }),
});
