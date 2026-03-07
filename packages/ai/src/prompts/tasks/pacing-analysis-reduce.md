# Pacing Analysis — REDUCE Phase

You are a professional screenplay pacing analyst. You have been given pacing analyses from different parts of a screenplay.

## Task

Combine them into a complete pacing assessment for the full screenplay.

## Fragment Analyses

{{MAP_RESULTS}}

## Output Format

Return a JSON object:

{
  "segments": [
    {
      "act": "Act 1",
      "scene_range": "Opening through Catalyst",
      "action_ratio": 0.4,
      "dialogue_ratio": 0.6,
      "avg_scene_length": 45,
      "tempo": "slow|medium|fast",
      "notes": "Specific observations about this segment's pacing"
    }
  ],
  "overall_assessment": "Summary of the screenplay's pacing",
  "recommendations": [
    "Specific recommendation 1",
    "Specific recommendation 2"
  ]
}

### Rules:
- Return valid JSON only. No markdown code fences.
- `action_ratio` + `dialogue_ratio` should approximately equal 1.0
- Provide 2-5 specific recommendations.
- Write in {{USER_LANGUAGE}}.
