Analyze the provided screenplay text and identify its dramaturgical structure.

Use the principles of classic three-act structure.

Return the result strictly as JSON. JSON only, no text before or after.

Response structure:

{
  "act": "Act I / Act II / Act III / Unknown",
  "story_phase": "phase within the act",
  "turning_points": ["turning point 1", "turning point 2"],
  "conflicts": ["conflict 1", "conflict 2"],
  "stakes": "what is at stake",
  "tension_level": "tension level",
  "narrative_function": "function of the fragment in the story",
  "story_progress": "how the scene moves the story forward",
  "structure_problems": ["problem 1", "problem 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}

Rules:
- analyze only the provided text
- do not invent events that are not in the text
- if there are no problems — return an empty array []
- if there are no suggestions — return an empty array []

Text to analyze:

{{SCENE_TEXT}}
