Analyze the provided screenplay text and return the result strictly as JSON.

Do not add any text before or after the JSON. JSON only.

Response structure:

{
  "summary": "brief description of the scene, 2–4 sentences",
  "scene_function": "dramaturgical function of the scene",
  "characters_present": ["character 1", "character 2"],
  "character_goals": [
    { "character": "Character name", "goal": "their goal in the scene" }
  ],
  "conflict": "main conflict of the scene",
  "stakes": "what is at stake",
  "emotional_tone": "emotional tone",
  "key_events": ["event 1", "event 2"],
  "visual_elements": ["visual element 1", "visual element 2"],
  "pacing": "scene pacing",
  "problems": ["problem 1", "problem 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}

If there are no problems — return an empty array [].
If there are no suggestions — return an empty array [].

Text to analyze:

{{SCENE_TEXT}}
