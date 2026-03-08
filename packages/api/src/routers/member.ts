import { TRPCError } from "@trpc/server";
import { prisma } from "@script/db";
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
} from "@script/types";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { logger } from "../logger";

async function assertProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
  });
  if (!project) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the project owner can perform this action" });
  }
  return project;
}

export const memberRouter = createTRPCRouter({
  /** List all members of a project (owner + members) */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          OR: [
            { ownerId: ctx.user.id },
            { members: { some: { userId: ctx.user.id } } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, email: true, image: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return {
        owner: project.owner,
        members: project.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          user: m.user,
          createdAt: m.createdAt,
        })),
      };
    }),

  /** Invite a user by email */
  invite: protectedProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);

      // Find user by email
      const targetUser = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, name: true, email: true },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation sent. If the user is registered, they will see it.",
        });
      }

      // Can't invite yourself
      if (targetUser.id === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You are already the owner" });
      }

      // Check if already a member
      const existing = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: input.projectId, userId: targetUser.id },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "User is already a member of this project" });
      }

      await prisma.projectMember.create({
        data: {
          projectId: input.projectId,
          userId: targetUser.id,
          role: input.role,
        },
      });

      // Audit log
      await prisma.activityLog.create({
        data: {
          projectId: input.projectId,
          userId: ctx.user.id,
          action: "member_invited",
          details: { targetEmail: input.email, targetUserId: targetUser.id, role: input.role },
        },
      }).catch((err) => logger.error({ err }, "Audit log failed"));

      return { success: true, user: targetUser };
    }),

  /** Update a member's role */
  updateRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwner(input.projectId, ctx.user.id);

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: input.projectId, userId: input.userId },
        },
      });

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      const oldRole = member.role;
      await prisma.projectMember.update({
        where: { id: member.id },
        data: { role: input.role },
      });

      // Audit log
      await prisma.activityLog.create({
        data: {
          projectId: input.projectId,
          userId: ctx.user.id,
          action: "member_role_changed",
          details: { targetUserId: input.userId, oldRole, newRole: input.role },
        },
      }).catch((err) => logger.error({ err }, "Audit log failed"));

      return { success: true };
    }),

  /** Remove a member (owner can remove anyone, member can remove themselves) */
  remove: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId },
        select: { ownerId: true },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const isOwner = project.ownerId === ctx.user.id;
      const isSelf = input.userId === ctx.user.id;

      // Cannot remove the project owner
      if (input.userId === project.ownerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove the project owner" });
      }

      if (!isOwner && !isSelf) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can remove members" });
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: { projectId: input.projectId, userId: input.userId },
        },
      });

      // Audit log
      await prisma.activityLog.create({
        data: {
          projectId: input.projectId,
          userId: ctx.user.id,
          action: isSelf ? "member_left" : "member_removed",
          details: { targetUserId: input.userId },
        },
      }).catch((err) => logger.error({ err }, "Audit log failed"));

      return { success: true };
    }),
});
