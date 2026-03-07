import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@script/db";
import { exportOptionsSchema } from "@script/types";
import { generatePDF } from "../export/pdf-generator";
import { generateDOCX } from "../export/docx-generator";
import { generateFDX } from "../export/fdx-generator";

export const exportRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(exportOptionsSchema)
    .mutation(async ({ ctx, input }) => {
      // Fetch document with project info + members
      const document = await prisma.document.findFirst({
        where: {
          id: input.documentId,
          deletedAt: null,
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
              members: {
                where: { role: { in: ["OWNER", "EDITOR"] } },
                include: { user: true },
              },
            },
          },
        },
      });

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      // Use custom title page data if saved, otherwise auto-generate
      const titlePageData = document.project.titlePage as Record<string, unknown> | null;
      let metadata;

      if (titlePageData && titlePageData.title) {
        metadata = {
          title: String(titlePageData.title || document.project.title),
          authors: Array.isArray(titlePageData.authors) ? titlePageData.authors.map(String) : [document.project.owner.name],
          contact: titlePageData.contact ? String(titlePageData.contact) : undefined,
          company: titlePageData.company ? String(titlePageData.company) : undefined,
        };
      } else {
        // Auto-generate from project data
        const authors: string[] = [document.project.owner.name];
        for (const member of document.project.members) {
          if (member.userId !== document.project.ownerId && member.user.name) {
            authors.push(member.user.name);
          }
        }
        metadata = {
          title: document.project.title,
          authors,
          contact: document.project.owner.email,
          company: undefined as string | undefined,
        };
      }

      const content = document.content as Record<string, unknown>;

      if (input.format === "pdf") {
        const buffer = await generatePDF(content, input, metadata);
        return {
          data: buffer.toString("base64"),
          filename: `${document.project.title}.pdf`,
          mimeType: "application/pdf",
        };
      } else if (input.format === "fdx") {
        const buffer = await generateFDX(content, input, metadata);
        return {
          data: buffer.toString("base64"),
          filename: `${document.project.title}.fdx`,
          mimeType: "application/xml",
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
