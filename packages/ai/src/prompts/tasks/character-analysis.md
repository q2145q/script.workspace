Analyze the provided screenplay text and extract information about the characters.

Return the result strictly as JSON. JSON only, no text before or after.

Response structure:

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

Rules:
- include only characters that are actually present in the text
- do not invent facts that are not in the text
- if there is not enough information for a field — return an empty string "" or an empty array []

Text to analyze:

{{SCENE_TEXT}}
