import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { createProjectSchema, updateProjectSchema } from "@script/types";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return prisma.project.findMany({
      where: {
        OR: [
          { ownerId: ctx.user.id },
          { members: { some: { userId: ctx.user.id } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { documents: true } },
      },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
        include: {
          documents: { orderBy: { updatedAt: "desc" } },
          members: { include: { user: true } },
          episodes: {
            orderBy: { number: "asc" },
            include: { document: { select: { id: true, title: true } } },
          },
        },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return project;
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      return prisma.project.create({
        data: {
          ...input,
          ownerId: ctx.user.id,
          documents: {
            create: {
              title: "Script",
              content: {
                type: "doc",
                content: [{ type: "paragraph" }],
              },
            },
          },
        },
        include: { documents: true },
      });
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const project = await prisma.project.findFirst({
        where: { id, ownerId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const prismaData = { ...data } as Record<string, unknown>;
      if (data.knowledgeGraph !== undefined) {
        prismaData.knowledgeGraph = (data.knowledgeGraph ?? undefined) as unknown as Prisma.InputJsonValue;
      }
      return prisma.project.update({ where: { id }, data: prismaData });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.id, ownerId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return prisma.project.delete({ where: { id: input.id } });
    }),
});
