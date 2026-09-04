import type { SemanticWorldData, SemanticExhibit } from '../types';

export class MutationManager {
  private initialWorldData: SemanticWorldData;
  public currentWorldData: SemanticWorldData;
  public hasActiveMutation = false;
  public mutatedExhibitId: string | null = null;

  constructor(worldData: SemanticWorldData) {
    this.initialWorldData = JSON.parse(JSON.stringify(worldData));
    this.currentWorldData = JSON.parse(JSON.stringify(worldData));
  }

  // Parse structured knowledge patch JSON or plain text markdown
  public ingestPatch(content: string, isJson: boolean): { success: boolean; message: string; patchExhibit?: SemanticExhibit } {
    try {
      if (isJson) {
        const patch = JSON.parse(content);
        if (!patch.id || !patch.title) {
          return { success: false, message: 'Invalid patch: missing required "id" or "title"' };
        }

        const newExhibit: SemanticExhibit = {
          id: patch.id,
          slug: patch.id.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          title: patch.title,
          wing: patch.wing || 'north',
          tier: 'A',
          archetype: patch.archetype || 'spire',
          isArchaeological: false,
          epoch: patch.epoch || 'emergent',
          startYear: 2026,
          position: patch.position || [20, 10, -100],
          scale: 1.5,
          projectIds: [patch.id],
          projects: [{
            id: patch.id,
            name: patch.title,
            family: 'Emergent Synthesis',
            kind: 'In-World Knowledge Mutation',
            status: 'Emergent Substrate',
            period: '2026',
            summary: patch.summary || 'A newly synthesized live knowledge mutation.',
            brief: patch.summary || '',
            lesson: 'When knowledge changes, the physical topology of the world mutates with it.',
            capabilities: patch.tags || [],
            repos: []
          }],
          copy: {
            subtitle: 'Live Ingested Knowledge Node',
            plaque: patch.summary || 'A live mutation in the world.',
            problem: 'The world needed to expand beyond its seeded perimeter.',
            made: 'A procedural architectural spire rising out of raw terrain.',
            interaction: 'Witness the physical graph edges illuminate.',
            explore: 'Compare the explicit versus inferred relationship links.'
          },
          isMutated: true
        };

        // Add to current exhibits
        this.currentWorldData.exhibits.push(newExhibit);

        // Add relationships
        if (patch.relationships && Array.isArray(patch.relationships)) {
          for (const r of patch.relationships) {
            this.currentWorldData.relationships.push({
              from: patch.id,
              to: r.to,
              type: r.type || 'mutated_link',
              confidence: r.confidence || 'explicit',
              reason: r.reason || 'Synthesized in-world knowledge link',
              isMutated: true
            });
          }
        }

        this.hasActiveMutation = true;
        this.mutatedExhibitId = patch.id;
        return { success: true, message: `Successfully ingested patch "${patch.title}"`, patchExhibit: newExhibit };
      } else {
        // Plain text / Markdown local deterministic lexical inference
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Emergent Markdown Concept';
        const id = 'patch-' + Math.random().toString(36).substring(2, 8);

        // Compute lexical similarity with existing exhibits
        const words = content.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
        const wordSet = new Set(words);

        let bestMatch = this.currentWorldData.exhibits[0];
        let bestScore = 0;

        for (const ex of this.currentWorldData.exhibits) {
          const exText = `${ex.title} ${ex.copy.plaque} ${ex.copy.made}`.toLowerCase();
          let count = 0;
          for (const w of wordSet) {
            if (exText.includes(w)) count++;
          }
          if (count > bestScore) {
            bestScore = count;
            bestMatch = ex;
          }
        }

        const newExhibit: SemanticExhibit = {
          id,
          slug: id,
          title,
          wing: bestMatch.wing,
          tier: 'B',
          archetype: 'spire',
          isArchaeological: false,
          epoch: 'emergent',
          startYear: 2026,
          position: [bestMatch.position[0] + 12, bestMatch.position[1] + 2, bestMatch.position[2] + 12],
          scale: 1.2,
          projectIds: [id],
          projects: [{
            id,
            name: title,
            family: 'Lexical Ingest',
            kind: 'Markdown Ingest',
            status: 'Inferred Mutation',
            period: '2026',
            summary: content.slice(0, 120) + '...',
            brief: content.slice(0, 300),
            lesson: 'Freeform inferred relationships must visibly distinguish INFERRED from EXPLICIT fact.',
            capabilities: Array.from(wordSet).slice(0, 5),
            repos: []
          }],
          copy: {
            subtitle: 'Locally Inferred Document',
            plaque: 'Inferred knowledge extracted from raw text.',
            problem: 'Unstructured text requires deterministic local parsing.',
            made: 'A localized structure linked to the closest semantic cluster.',
            interaction: 'Examine the amber dashed inferred relationship trace.',
            explore: 'Observe how confidence grading prevents false certainty.'
          },
          isMutated: true
        };

        this.currentWorldData.exhibits.push(newExhibit);
        // Add INFERRED relationship
        this.currentWorldData.relationships.push({
          from: id,
          to: bestMatch.id,
          type: 'lexical_concordance',
          confidence: 'inferred',
          reason: `Locally inferred lexical overlap score: ${bestScore} keywords`,
          isMutated: true
        });

        this.hasActiveMutation = true;
        this.mutatedExhibitId = id;
        return { success: true, message: `Inferred text ingested: linked to ${bestMatch.title} [LOW-CONFIDENCE]`, patchExhibit: newExhibit };
      }
    } catch (e: any) {
      return { success: false, message: `Error parsing patch: ${e.message}` };
    }
  }

  // Reset to canonical seeded world
  public resetToCanonical(): SemanticWorldData {
    this.currentWorldData = JSON.parse(JSON.stringify(this.initialWorldData));
    this.hasActiveMutation = false;
    this.mutatedExhibitId = null;
    return this.currentWorldData;
  }
}
