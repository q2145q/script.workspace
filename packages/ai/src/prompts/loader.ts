import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TASKS_DIR = join(__dirname, "tasks");
const cache = new Map<string, string>();

/**
 * Load a task prompt from a .md file in the tasks/ directory.
 * Results are cached in memory for subsequent calls.
 */
export function loadTaskPrompt(taskName: string): string {
  if (cache.has(taskName)) return cache.get(taskName)!;

  const filePath = join(TASKS_DIR, `${taskName}.md`);
  const content = readFileSync(filePath, "utf-8");
  cache.set(taskName, content);
  return content;
}

/**
 * Clear the task prompt cache (useful for testing).
 */
export function clearPromptCache(): void {
  cache.clear();
}
