import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import {
  createCharacterSchema,
  updateCharacterSchema,
  deleteCharacterSchema,
  listCharactersSchema,
  createLocationSchema,
  updateLocationSchema,
  deleteLocationSchema,
  listLocationsSchema,
  createTermSchema,
  updateTermSchema,
  deleteTermSchema,
  listTermsSchema,
} from "@script/types";

function assertProjectAccess(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  }).then((p) => {
    if (!p) throw new TRPCError({ code: "NOT_FOUND" });
    return p;
  });
}

function assertProjectEditAccess(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        {
          members: {
            some: { userId, role: { in: ["OWNER", "EDITOR"] } },
          },
        },
      ],
    },
  }).then((p) => {
    if (!p) throw new TRPCError({ code: "FORBIDDEN" });
    return p;
  });
}

export const entityRouter = createTRPCRouter({
  // ============================================================
  // Characters
  // ============================================================
  listCharacters: protectedProcedure
    .input(listCharactersSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      return prisma.character.findMany({
        where: { projectId: input.projectId },
        orderBy: { name: "asc" },
      });
    }),

  createCharacter: protectedProcedure
    .input(createCharacterSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectEditAccess(input.projectId, ctx.user.id);
      return prisma.character.create({ data: input });
    }),

  updateCharacter: protectedProcedure
    .input(updateCharacterSchema)
    .mutation(async ({ ctx, input }) => {
      const char = await prisma.character.findFirst({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectEditAccess(char.projectId, ctx.user.id);

      const { id, ...data } = input;
      return prisma.character.update({ where: { id }, data });
    }),

  deleteCharacter: protectedProcedure
    .input(deleteCharacterSchema)
    .mutation(async ({ ctx, input }) => {
      const char = await prisma.character.findFirst({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!char) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectEditAccess(char.projectId, ctx.user.id);

      return prisma.character.delete({ where: { id: input.id } });
    }),

  // ============================================================
  // Locations
  // ============================================================
  listLocations: protectedProcedure
    .input(listLocationsSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      return prisma.location.findMany({
        where: { projectId: input.projectId },
        orderBy: { name: "asc" },
      });
    }),

  createLocation: protectedProcedure
    .input(createLocationSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectEditAccess(input.projectId, ctx.user.id);
      return prisma.location.create({ data: input });
    }),

  updateLocation: protectedProcedure
    .input(updateLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const loc = await prisma.location.findFirst({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!loc) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectEditAccess(loc.projectId, ctx.user.id);

      const { id, ...data } = input;
      return prisma.location.update({ where: { id }, data });
    }),

  deleteLocation: protectedProcedure
    .input(deleteLocationSchema)
    .mutation(async ({ ctx, input }) => {
      const loc = await prisma.location.findFirst({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!loc) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectEditAccess(loc.projectId, ctx.user.id);

      return prisma.location.delete({ where: { id: input.id } });
    }),

  // ============================================================
  // Terms
  // ============================================================
  listTerms: protectedProcedure
    .input(listTermsSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);
      return prisma.term.findMany({
        where: { projectId: input.projectId },
        orderBy: { term: "asc" },
      });
    }),

  createTerm: protectedProcedure
    .input(createTermSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectEditAccess(input.projectId, ctx.user.id);
      return prisma.term.create({ data: input });
    }),

  updateTerm: protectedProcedure
    .input(updateTermSchema)
    .mutation(async ({ ctx, input }) => {
      const t = await prisma.term.findFirst({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!t) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectEditAccess(t.projectId, ctx.user.id);

      const { id, ...data } = input;
      return prisma.term.update({ where: { id }, data });
    }),

  deleteTerm: protectedProcedure
    .input(deleteTermSchema)
    .mutation(async ({ ctx, input }) => {
      const t = await prisma.term.findFirst({
        where: { id: input.id },
        select: { projectId: true },
      });
      if (!t) throw new TRPCError({ code: "NOT_FOUND" });
      await assertProjectEditAccess(t.projectId, ctx.user.id);

      return prisma.term.delete({ where: { id: input.id } });
    }),
});
