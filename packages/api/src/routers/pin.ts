import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import {
  createPinSchema,
  deletePinSchema,
  listPinsSchema,
  reorderPinsSchema,
} from "@script/types";

/** Verify user has access to the project */
async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  });
  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found or no access" });
  }
  return project;
}

export const pinRouter = createTRPCRouter({
  /** List all pins for a project */
  list: protectedProcedure
    .input(listPinsSchema)
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      return prisma.contextPin.findMany({
        where: { projectId: input.projectId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  /** Create a new pin */
  create: protectedProcedure
    .input(createPinSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      // Get max sortOrder to append at end
      const lastPin = await prisma.contextPin.findFirst({
        where: { projectId: input.projectId },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const label = input.label || input.content.slice(0, 60) + (input.content.length > 60 ? "..." : "");

      return prisma.contextPin.create({
        data: {
          projectId: input.projectId,
          userId: ctx.user.id,
          type: input.type,
          content: input.content,
          label,
          sortOrder: (lastPin?.sortOrder ?? -1) + 1,
        },
      });
    }),

  /** Delete a pin */
  delete: protectedProcedure
    .input(deletePinSchema)
    .mutation(async ({ ctx, input }) => {
      const pin = await prisma.contextPin.findUnique({
        where: { id: input.id },
        select: { projectId: true, userId: true },
      });
      if (!pin) throw new TRPCError({ code: "NOT_FOUND" });

      await assertProjectAccess(pin.projectId, ctx.user.id);

      // Only the pin creator or project owner can delete
      if (pin.userId !== ctx.user.id) {
        const project = await prisma.project.findFirst({
          where: { id: pin.projectId, ownerId: ctx.user.id },
        });
        if (!project) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own pins" });
        }
      }

      await prisma.contextPin.delete({ where: { id: input.id } });
      return { id: input.id };
    }),

  /** Reorder pins */
  reorder: protectedProcedure
    .input(reorderPinsSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.user.id);

      await prisma.$transaction(
        input.pinIds.map((id, index) =>
          prisma.contextPin.update({
            where: { id },
            data: { sortOrder: index },
          })
        )
      );

      return { success: true };
    }),
});
