import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma, type Prisma } from "@script/db";
import { tipTapContentSchema } from "@script/types";

export const documentRouter = createTRPCRouter({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { userId: ctx.user.id } } },
            ],
          },
        },
      });
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return doc;
    }),

  save: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: tipTapContentSchema,
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          project: {
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
        },
      });
      if (!doc) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.document.update({
        where: { id: input.id },
        data: {
          content: input.content as unknown as Prisma.InputJsonValue,
          ...(input.title && { title: input.title }),
        },
      });
    }),

  /** Save document metadata (e.g. scene synopses) */
  saveMetadata: protectedProcedure
    .input(z.object({
      id: z.string(),
      metadata: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await prisma.document.findFirst({
        where: {
          id: input.id,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { userId: ctx.user.id, role: { in: ["OWNER", "EDITOR"] } } } },
            ],
          },
        },
      });
      if (!doc) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.document.update({
        where: { id: input.id },
        data: { metadata: input.metadata as unknown as Prisma.InputJsonValue },
      });
    }),
});
