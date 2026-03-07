# Knowledge Graph — REDUCE Phase

You have been given knowledge graph extractions from different parts of a screenplay. Each extraction contains entities, relationships, and events in JSON format.

## Task

Merge all extractions into a single unified knowledge graph. Deduplicate entities that refer to the same character, location, or object across fragments.

## Merge Rules

- Combine entities with the same name or obviously referring to the same entity
- Keep the most detailed description when merging
- Preserve all unique relationships
- Merge events, keeping all unique ones
- Use consistent IDs across the merged result

## Fragment Extractions

{{MAP_RESULTS}}

## Output Format

Return a single merged JSON object:

{
  "entities": [
    {
      "id": "unique_id",
      "type": "character|location|object|organization|concept",
      "name": "Entity name",
      "description": "Brief description"
    }
  ],
  "relationships": [
    {
      "from": "entity_id",
      "to": "entity_id",
      "type": "relationship|conflict|knows|works_with|family|enemy|mentor|owns|located_in|related_to",
      "description": "brief description"
    }
  ],
  "events": [
    {
      "id": "event_id",
      "name": "Event name",
      "description": "Brief description",
      "participants": ["entity_id"],
      "location": "location_id or empty",
      "importance": "low|medium|high"
    }
  ]
}

### Rules:
- Return valid JSON only. No markdown code fences.
- Deduplicate aggressively — same entity should appear only once.
- Keep IDs consistent between entities and relationships.
