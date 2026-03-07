# Knowledge Graph — MAP Phase

You are analyzing ONE FRAGMENT of a larger screenplay. Extract entities and relationships for a knowledge graph.

## Extract

- **Characters**: name, description, role
- **Locations**: name, description
- **Objects**: important plot objects
- **Organizations**: groups, companies, factions
- **Relationships**: connections between entities
- **Events**: key actions or situations

## Rules

- Extract only entities actually present in the text
- Do not invent new elements
- Use consistent IDs (e.g., character_ivan, location_apartment)
- Write in English (internal processing step)

## Fragment Information

This fragment covers: {{CHUNK_RANGE}}

## Output Format

Return a JSON object:

{
  "entities": [
    {
      "id": "unique_id",
      "type": "character|location|object|organization|concept",
      "name": "Entity name",
      "description": "Brief description, 1-2 sentences"
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
- Keep descriptions brief.
