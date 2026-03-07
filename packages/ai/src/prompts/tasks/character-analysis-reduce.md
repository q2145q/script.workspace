# Character Analysis — REDUCE Phase

You have been given character analyses from different parts of a screenplay.

## Task

Combine them into a unified character analysis for the full screenplay.

## Rules

- Merge information about the same character from different fragments
- Resolve any contradictions by using the most specific information
- Only include characters actually present in the text
- If there is not enough information for a field — return empty string or array

## Fragment Analyses

{{MAP_RESULTS}}

## Output Format

Return a JSON object:

{
  "characters": [
    {
      "name": "character name",
      "description": "brief description, 2–3 sentences",
      "role_in_story": "function in the story",
      "goals": ["goal 1", "goal 2"],
      "motivations": "why the character acts this way",
      "internal_conflict": "character's internal conflict",
      "external_conflict": "character's external conflict",
      "traits": ["trait 1", "trait 2"],
      "relationships": [
        {
          "character": "other character's name",
          "relationship": "description of the relationship"
        }
      ]
    }
  ]
}

### Rules:
- Return valid JSON only. No markdown code fences.
- Write in {{USER_LANGUAGE}}.
