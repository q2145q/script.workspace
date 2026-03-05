import { getSystemPrompt } from "./system/index";
import { loadTaskPrompt } from "./loader";
import type { ProviderId } from "../types";

export type TemplateVars = Record<string, string>;

/**
 * Replace all `{{VARIABLE}}` placeholders in a template string.
 * Unmatched variables are replaced with empty string.
 */
export function fillTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

/**
 * Compose a full system prompt for a given provider + task.
 *
 * 1. Load provider system prompt (with {{TASK_INSTRUCTIONS}} slot)
 * 2. Load task prompt from .md file
 * 3. Fill all template variables
 */
export function composePrompt(
  providerId: ProviderId,
  taskName: string,
  variables: TemplateVars = {},
): string {
  const systemPrompt = getSystemPrompt(providerId);
  const rawTaskPrompt = loadTaskPrompt(taskName);

  // Two-pass replacement:
  // 1. Fill variables inside the task prompt (e.g. {{SCENE_TEXT}}, {{PROJECT_CONTEXT}})
  const filledTask = fillTemplate(rawTaskPrompt, variables);

  // 2. Inject the filled task into the system prompt, fill remaining variables
  return fillTemplate(systemPrompt, {
    TASK_INSTRUCTIONS: filledTask,
    ...variables,
  });
}
