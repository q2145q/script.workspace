export interface Chunk {
  text: string;
  index: number;
  sceneRange: string; // e.g. "scenes 1-3" or "scene 5"
}

/** Scene heading pattern (English + Russian) */
const SCENE_HEADING_RE = /^(INT\.|EXT\.|INT\/EXT\.|ИНТ\.|ЭКСТ\.|НАТ\.).+/im;

/** Max chars per chunk (~15K chars ≈ 3.5–7.5K tokens depending on language) */
const MAX_CHUNK_CHARS = 15_000;

/**
 * Split screenplay text into chunks by scene headings.
 * Small adjacent scenes are grouped together (up to MAX_CHUNK_CHARS).
 * Oversized scenes are split by paragraphs.
 */
export function chunkByScenes(fullText: string): Chunk[] {
  if (!fullText.trim()) return [];

  // Split text into scenes
  const scenes = splitBySceneHeadings(fullText);

  if (scenes.length === 0) {
    // No scene headings found — treat as single chunk or split by paragraphs
    return chunkPlainText(fullText);
  }

  // Group small scenes into chunks
  const chunks: Chunk[] = [];
  let currentText = "";
  let currentStart = -1;
  let currentEnd = -1;
  let chunkIndex = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // If scene itself is too large, flush current + split the scene
    if (scene.text.length > MAX_CHUNK_CHARS) {
      // Flush accumulated scenes
      if (currentText) {
        chunks.push({
          text: currentText,
          index: chunkIndex++,
          sceneRange: formatRange(currentStart, currentEnd),
        });
        currentText = "";
      }

      // Split large scene by paragraphs
      const subChunks = splitByParagraphs(scene.text, MAX_CHUNK_CHARS);
      for (const sub of subChunks) {
        chunks.push({
          text: sub,
          index: chunkIndex++,
          sceneRange: `scene ${scene.sceneNumber} (part)`,
        });
      }
      currentStart = -1;
      currentEnd = -1;
      continue;
    }

    // Would adding this scene exceed the limit?
    if (currentText && currentText.length + scene.text.length > MAX_CHUNK_CHARS) {
      // Flush current chunk
      chunks.push({
        text: currentText,
        index: chunkIndex++,
        sceneRange: formatRange(currentStart, currentEnd),
      });
      currentText = "";
      currentStart = -1;
      currentEnd = -1;
    }

    // Add scene to current chunk
    if (!currentText) {
      currentStart = scene.sceneNumber;
    }
    currentText += (currentText ? "\n\n" : "") + scene.text;
    currentEnd = scene.sceneNumber;
  }

  // Flush remaining
  if (currentText) {
    chunks.push({
      text: currentText,
      index: chunkIndex++,
      sceneRange: formatRange(currentStart, currentEnd),
    });
  }

  return chunks;
}

interface SceneSegment {
  sceneNumber: number;
  text: string;
}

function splitBySceneHeadings(text: string): SceneSegment[] {
  const lines = text.split("\n");
  const scenes: SceneSegment[] = [];
  let currentLines: string[] = [];
  let sceneNumber = 0;
  let foundFirst = false;

  for (const line of lines) {
    if (SCENE_HEADING_RE.test(line.trim())) {
      if (foundFirst && currentLines.length > 0) {
        scenes.push({
          sceneNumber,
          text: currentLines.join("\n").trim(),
        });
      }
      sceneNumber++;
      foundFirst = true;
      currentLines = [line];
    } else {
      if (foundFirst) {
        currentLines.push(line);
      } else {
        // Text before the first scene heading — still include it
        currentLines.push(line);
      }
    }
  }

  // If no scene headings found, return nothing (caller handles this)
  if (!foundFirst) return [];

  // Push content before first scene heading as "scene 0" if non-empty
  // Actually let's re-check: content before first heading already accumulated

  // Flush last scene
  if (currentLines.length > 0) {
    scenes.push({
      sceneNumber,
      text: currentLines.join("\n").trim(),
    });
  }

  return scenes;
}

function splitByParagraphs(text: string, maxSize: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const result: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current && current.length + para.length + 2 > maxSize) {
      result.push(current.trim());
      current = "";
    }
    current += (current ? "\n\n" : "") + para;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result.length > 0 ? result : [text];
}

function chunkPlainText(text: string): Chunk[] {
  const parts = splitByParagraphs(text, MAX_CHUNK_CHARS);
  return parts.map((part, i) => ({
    text: part,
    index: i,
    sceneRange: `part ${i + 1}`,
  }));
}

function formatRange(start: number, end: number): string {
  if (start === end) return `scene ${start}`;
  return `scenes ${start}-${end}`;
}
