# Consistency Check — REDUCE Phase

You are a professional script supervisor and continuity editor. You have been given consistency analyses from different parts of a screenplay.

## Task

Combine them into a unified consistency report. Pay special attention to cross-fragment issues — problems that only become visible when comparing different parts of the screenplay.

## Severity Levels

- **error** — Definite mistake that will confuse the audience
- **warning** — Potential issue worth reviewing, may be intentional
- **info** — Minor observation, style suggestion

## Fragment Analyses

{{MAP_RESULTS}}

## Output Format

Return a JSON object:

{
  "issues": [
    {
      "type": "timeline|location|character|logic|continuity",
      "severity": "error|warning|info",
      "description": "Clear description of the issue",
      "scene_reference": "Optional: scene heading or location",
      "suggestion": "Optional: how to fix it"
    }
  ]
}

### Rules:
- Return valid JSON only. No markdown code fences.
- Sort issues by severity: errors first, then warnings, then info.
- Maximum 20 issues.
- Write in {{USER_LANGUAGE}}.
- Deduplicate issues that appear in multiple fragments.
