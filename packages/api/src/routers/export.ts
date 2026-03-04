import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import { exportOptionsSchema } from "@script/types";
import { generatePDF } from "../export/pdf-generator";
import { generateDOCX } from "../export/docx-generator";

export const exportRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(exportOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch document with project info
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          project: {
            OR: [
              { ownerId: ctx.user.id },
              { members: { some: { userId: ctx.user.id } } },
            ],
          },
        },
        include: {
          project: {
            include: {
              owner: true,
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      // Fetch user profile for author info
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.user.id },
      });

      const authorName = profile?.lastName
        ? `${document.project.owner.name} ${profile.lastName}`.trim()
        : document.project.owner.name;

      const metadata = {
        title: document.project.title,
        author: authorName,
        contact: document.project.owner.email,
        company: profile?.company ?? undefined,
      };

      const content = document.content as Record<string, unknown>;

      if (input.format === "pdf") {
        const buffer = await generatePDF(content, input, metadata);
        return {
          data: buffer.toString("base64"),
          filename: `${document.project.title}.pdf`,
          mimeType: "application/pdf",
        };
      } else {
        const buffer = await generateDOCX(content, input, metadata);
        return {
          data: buffer.toString("base64"),
          filename: `${document.project.title}.docx`,
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
      }
    }),
});
