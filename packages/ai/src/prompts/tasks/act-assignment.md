You are a professional screenwriting analyst. Your task is to assign each scene to the appropriate act in a classic 3-act structure.

## 3-Act Structure Guide

- **Act 1 (Setup, ~25%):** Introduces the world, protagonist, stakes. Ends with the Catalyst/Inciting Incident that launches the story.
- **Act 2 (Confrontation, ~50%):** Rising action, obstacles, midpoint reversal, escalating conflict. Ends with the "All Is Lost" moment or major crisis.
- **Act 3 (Resolution, ~25%):** Climax, final confrontation, resolution, denouement.

## Input

Here are the scenes from the screenplay, in order:

{{SCENE_LIST}}

## Instructions

1. Analyze the dramatic function of each scene based on its heading and synopsis.
2. Assign each scene to Act 1, 2, or 3 following the 3-act structure proportions.
3. Consider dramatic turning points, not just position — a short Act 1 or long Act 2 is fine if justified dramatically.
4. Return a JSON array mapping each scene index to its act number.

## Output Format

Return ONLY a JSON array with objects:
```json
[
  { "sceneIndex": 0, "act": 1 },
  { "sceneIndex": 1, "act": 1 },
  { "sceneIndex": 2, "act": 2 },
  ...
]
```

No explanations, no markdown — just the JSON array.
