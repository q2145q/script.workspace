import * as Y from "yjs";
import {
  prosemirrorJSONToYDoc,
  yDocToProsemirrorJSON,
} from "y-prosemirror";
import { prisma } from "@script/db";
import { getScreenplaySchema } from "@script/editor/schema";

const schema = getScreenplaySchema();

function parseDocumentName(documentName: string): {
  type: "document" | "bible" | "note";
  id: string;
} {
  const [type, id] = documentName.split(":");
  if ((type !== "document" && type !== "bible" && type !== "note") || !id) {
    throw new Error(`Invalid document name: ${documentName}`);
  }
  return { type, id };
}

export async function loadDocument({
  documentName,
}: {
  documentName: string;
}): Promise<Uint8Array | null> {
  const { type, id } = parseDocumentName(documentName);

  if (type === "document") {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return null;

    if (doc.yjsState) {
      return new Uint8Array(doc.yjsState);
    }

    // Lazy migration: convert JSONContent → Y.Doc
    const ydoc = prosemirrorJSONToYDoc(schema, doc.content as Record<string, unknown>);
    const state = Y.encodeStateAsUpdate(ydoc);

    await prisma.document.update({
      where: { id },
      data: { yjsState: Buffer.from(state) },
    });

    return state;
  }

  if (type === "bible") {
    const bible = await prisma.projectBible.findUnique({
      where: { projectId: id },
    });
    if (!bible) return null;

    if (bible.yjsState) {
      return new Uint8Array(bible.yjsState);
    }

    const ydoc = prosemirrorJSONToYDoc(schema, bible.content as Record<string, unknown>);
    const state = Y.encodeStateAsUpdate(ydoc);

    await prisma.projectBible.update({
      where: { projectId: id },
      data: { yjsState: Buffer.from(state) },
    });

    return state;
  }

  if (type === "note") {
    const note = await prisma.projectNote.findUnique({ where: { id } });
    if (!note) return null;

    if (note.yjsState) {
      return new Uint8Array(note.yjsState);
    }

    // Lazy migration: convert JSONContent → Y.Doc
    const ydoc = prosemirrorJSONToYDoc(schema, note.content as Record<string, unknown>);
    const state = Y.encodeStateAsUpdate(ydoc);

    await prisma.projectNote.update({
      where: { id },
      data: { yjsState: Buffer.from(state) },
    });

    return state;
  }

  return null;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
): Promise<T> {
  const delays = [1000, 2000, 4000];
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(
          `[persistence] ${label}: failed after ${maxRetries + 1} attempts`,
          error,
        );
        throw error;
      }
      const delay = delays[attempt] ?? 4000;
      console.warn(
        `[persistence] ${label}: attempt ${attempt + 1} failed, retrying in ${delay}ms`,
        error instanceof Error ? error.message : error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("unreachable");
}

export async function storeDocument({
  documentName,
  state,
}: {
  documentName: string;
  state: Uint8Array;
}): Promise<void> {
  const { type, id } = parseDocumentName(documentName);

  // Convert Y.Doc → JSONContent for backward compat (AI, export, etc.)
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, state);
  const jsonContent = yDocToProsemirrorJSON(ydoc);

  const label = `store(${documentName})`;

  if (type === "document") {
    await withRetry(
      () =>
        prisma.document.update({
          where: { id },
          data: {
            yjsState: Buffer.from(state),
            content: jsonContent,
          },
        }),
      label,
    );
  } else if (type === "bible") {
    await withRetry(
      () =>
        prisma.projectBible.update({
          where: { projectId: id },
          data: {
            yjsState: Buffer.from(state),
            content: jsonContent,
          },
        }),
      label,
    );
  } else if (type === "note") {
    await withRetry(
      () =>
        prisma.projectNote.update({
          where: { id },
          data: {
            yjsState: Buffer.from(state),
            content: jsonContent,
          },
        }),
      label,
    );
  }
}
