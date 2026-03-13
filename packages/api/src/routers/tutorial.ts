import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  prisma,
  loadInceptionContent,
  loadInceptionCharacters,
  loadInceptionLocations,
  loadInceptionAnalyses,
} from "@script/db";

const MAX_TUTORIAL_STEP = 18;

export const tutorialRouter = createTRPCRouter({
  /** Get current tutorial state */
  getState: protectedProcedure.query(async ({ ctx }) => {
    const profile = await prisma.userProfile.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id },
      update: {},
      select: {
        tutorialStep: true,
        tutorialCompleted: true,
        demoProjectId: true,
      },
    });
    return profile;
  }),

  /** Advance to a specific step */
  setStep: protectedProcedure
    .input(z.object({ step: z.number().int().min(0).max(MAX_TUTORIAL_STEP) }))
    .mutation(async ({ ctx, input }) => {
      return prisma.userProfile.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          tutorialStep: input.step,
        },
        update: {
          tutorialStep: input.step,
          ...(input.step >= MAX_TUTORIAL_STEP
            ? { tutorialCompleted: true }
            : {}),
        },
        select: {
          tutorialStep: true,
          tutorialCompleted: true,
        },
      });
    }),

  /** Skip tutorial entirely */
  skip: protectedProcedure.mutation(async ({ ctx }) => {
    return prisma.userProfile.upsert({
      where: { userId: ctx.user.id },
      create: {
        userId: ctx.user.id,
        tutorialStep: MAX_TUTORIAL_STEP,
        tutorialCompleted: true,
      },
      update: {
        tutorialStep: MAX_TUTORIAL_STEP,
        tutorialCompleted: true,
      },
    });
  }),

  /** Restart tutorial from the beginning */
  restart: protectedProcedure.mutation(async ({ ctx }) => {
    return prisma.userProfile.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id, tutorialStep: 1 },
      update: {
        tutorialStep: 1,
        tutorialCompleted: false,
      },
    });
  }),

  /** Create demo project for the user (idempotent) */
  createDemoProject: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user already has a demo project
    const profile = await prisma.userProfile.upsert({
      where: { userId: ctx.user.id },
      create: { userId: ctx.user.id },
      update: {},
    });

    if (profile.demoProjectId) {
      // Verify the project still exists
      const existing = await prisma.project.findFirst({
        where: { id: profile.demoProjectId, deletedAt: null },
        include: { documents: { select: { id: true }, take: 1 } },
      });
      if (existing) {
        return {
          projectId: existing.id,
          documentId: existing.documents[0]?.id ?? null,
          created: false,
        };
      }
    }

    // Load seed data from JSON files
    const content = loadInceptionContent();
    const characters = loadInceptionCharacters();
    const locations = loadInceptionLocations();
    const analyses = loadInceptionAnalyses();

    // Create project + document + characters + locations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the project
      const project = await tx.project.create({
        data: {
          title: "Начало — Кристофер Нолан (демо)",
          description:
            "Демо-проект с полным сценарием фильма «Начало» для изучения возможностей редактора.",
          type: "FEATURE_FILM",
          status: "FINAL",
          language: "ru",
          ownerId: ctx.user.id,
          isDemo: true,
        },
      });

      // 2. Create the document with full screenplay content
      const document = await tx.document.create({
        data: {
          projectId: project.id,
          title: "Начало",
          content: content as never,
        },
      });

      // 3. Create characters
      if (characters.length > 0) {
        await tx.character.createMany({
          data: characters.map((c) => ({
            projectId: project.id,
            name: c.name,
            description: c.description,
            traits: c.traits,
          })),
        });
      }

      // 4. Create locations
      if (locations.length > 0) {
        await tx.location.createMany({
          data: locations.map((l) => ({
            projectId: project.id,
            name: l.name,
            description: l.description,
          })),
        });
      }

      // 5. Store pre-computed analysis results
      const analysisEntries = Object.entries(analyses);
      if (analysisEntries.length > 0) {
        await tx.demoAnalysis.createMany({
          data: analysisEntries.map(([type, result]) => ({
            projectId: project.id,
            type,
            result: result as never,
          })),
        });
      }

      // 6. Link demo project to user profile and start tutorial
      await tx.userProfile.update({
        where: { userId: ctx.user.id },
        data: {
          demoProjectId: project.id,
          tutorialStep: 1,
        },
      });

      return { projectId: project.id, documentId: document.id };
    });

    return { ...result, created: true };
  }),

  /** Get pre-computed analysis for demo project */
  getDemoAnalysis: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.enum([
          "beat_sheet",
          "structure",
          "pacing",
          "consistency",
          "knowledge_graph",
          "synopsis",
          "character_analysis",
        ]),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify user owns this project
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          isDemo: true,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Demo project not found",
        });
      }

      const analysis = await prisma.demoAnalysis.findUnique({
        where: {
          projectId_type: {
            projectId: input.projectId,
            type: input.type,
          },
        },
      });

      if (!analysis) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Analysis type "${input.type}" not found for this project`,
        });
      }

      return analysis.result;
    }),
});
