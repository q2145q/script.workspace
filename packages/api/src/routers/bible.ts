import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { getBibleSchema, saveBibleSchema } from "@script/types";

export const bibleRouter = createTRPCRouter({
  /** Get the project bible (auto-creates if not exists) */
  get: protectedProcedure
    .input(getBibleSchema)
    .query(async ({ ctx, input }) => {
      // Verify project access
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or no access" });
      }

      // Upsert: create if not exists
      const bible = await prisma.projectBible.upsert({
        where: { projectId: input.projectId },
        update: {},
        create: {
          projectId: input.projectId,
          content: {},
        },
      });

      return bible;
    }),

  /** Save bible content */
  save: protectedProcedure
    .input(saveBibleSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify editor access
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            {
              members: {
                some: {
                  userId: ctx.user.id,
                  role: { in: ["OWNER", "EDITOR"] },
                },
              },
            },
          ],
        },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or no editor access" });
      }

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
});
