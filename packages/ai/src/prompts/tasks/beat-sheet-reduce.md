# Beat Sheet — REDUCE Phase

You are a professional story structure analyst. You have been given beat analyses from different parts of a screenplay.

## Task

Combine them into a complete Save the Cat beat sheet with all 15 beats.

## The 15 Beats

1. Opening Image, 2. Theme Stated, 3. Setup, 4. Catalyst, 5. Debate,
6. Break into Two, 7. B Story, 8. Fun and Games, 9. Midpoint,
10. Bad Guys Close In, 11. All Is Lost, 12. Dark Night of the Soul,
13. Break into Three, 14. Finale, 15. Final Image

## Status Assessment

For each beat:
- **present** — Clearly identifiable
- **weak** — Exists but could be stronger
- **missing** — Not found

## Fragment Analyses

{{MAP_RESULTS}}

## Output Format

Return a JSON object:

{
  "beats": [
    {
      "beat_name": "Opening Image",
      "page_range": "1-2",
      "description": "Description of how this beat manifests",
      "scene_reference": "Optional: specific scene heading",
      "status": "present|weak|missing"
    }
  ],
  "notes": "Optional: overall structural observations"
}

### Rules:
- Return valid JSON only. No markdown code fences.
- Always return exactly 15 beats in standard order.
- Write descriptions in {{USER_LANGUAGE}}.
