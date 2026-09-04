import type { SemanticWorldData, SemanticExhibit, WingId } from '../types';
import { SemanticSpatialSolver } from '../world/SemanticSpatialSolver';

export class MutationManager {
  private initialWorldData: SemanticWorldData;
  public currentWorldData: SemanticWorldData;
  public hasActiveMutation = false;
  public mutatedExhibitId: string | null = null;
  public lastAffectedRegions: string[] = [];

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

        if (this.currentWorldData.exhibits.some(e => e.id === patch.id)) {
          return { success: false, message: `Invalid patch: exhibit ID "${patch.id}" already exists.` };
        }

        const wing = (patch.wing || 'north') as WingId;
        const targetRegion = this.currentWorldData.regions[wing] || this.currentWorldData.regions.north;

        let posX = targetRegion.center[0] + 16;
        let posY = targetRegion.elevation + 2;
        let posZ = targetRegion.center[2] + 16;
        if (Array.isArray(patch.position) && patch.position.length === 3) {
          const [px, py, pz] = patch.position;
          if (typeof px === 'number' && !isNaN(px) && isFinite(px) &&
              typeof py === 'number' && !isNaN(py) && isFinite(py) &&
              typeof pz === 'number' && !isNaN(pz) && isFinite(pz)) {
            posX = Math.max(-160, Math.min(160, px));
            posY = Math.max(-40, Math.min(100, py));
            posZ = Math.max(-160, Math.min(160, pz));
          }
        }

        const newExhibit: SemanticExhibit = {
          id: patch.id,
          slug: patch.id.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          title: patch.title,
          wing,
          tier: 'A',
          archetype: patch.archetype || 'spire',
          isArchaeological: false,
          epoch: patch.epoch || 'emergent',
          startYear: 2026,
          position: [posX, posY, posZ],
          scale: 1.6,
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

        this.currentWorldData.exhibits.push(newExhibit);

        if (patch.relationships && Array.isArray(patch.relationships)) {
          for (const r of patch.relationships) {
            if (r && typeof r.to === 'string' && this.currentWorldData.exhibits.some(e => e.id === r.to)) {
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
        }

        // Re-solve spatial equilibrium deterministically
        const newPositions = SemanticSpatialSolver.solve(
          this.currentWorldData.exhibits,
          this.currentWorldData.relationships,
          this.currentWorldData.regions
        );

        for (const ex of this.currentWorldData.exhibits) {
          const solved = newPositions.get(ex.id);
          if (solved) {
            ex.position = solved;
          }
        }

        this.hasActiveMutation = true;
        this.mutatedExhibitId = patch.id;
        this.lastAffectedRegions = [wing];
        return { success: true, message: `Successfully ingested patch "${patch.title}". Spatial solver relaxed topology.`, patchExhibit: newExhibit };
      } else {
        // Plain text / Markdown local deterministic lexical inference
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Emergent Markdown Concept';

        // Deterministic hash ID from title and content
        let hash = 0;
        const seedStr = `${title}:${content}`;
        for (let i = 0; i < seedStr.length; i++) {
          hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
          hash |= 0;
        }
        const id = 'patch-md-' + Math.abs(hash).toString(36).slice(0, 8);

        if (this.currentWorldData.exhibits.some(e => e.id === id)) {
          return { success: false, message: `Markdown concept "${title}" has already been ingested.` };
        }

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
          position: [bestMatch.position[0] + 14, bestMatch.position[1] + 2, bestMatch.position[2] + 14],
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

        this.currentWorldData.relationships.push({
          from: id,
          to: bestMatch.id,
          type: 'lexical_concordance',
          confidence: 'inferred',
          reason: `Locally inferred lexical overlap score: ${bestScore} keywords`,
          isMutated: true
        });

        // Re-solve spatial equilibrium
        const newPositions = SemanticSpatialSolver.solve(
          this.currentWorldData.exhibits,
          this.currentWorldData.relationships,
          this.currentWorldData.regions
        );

        for (const ex of this.currentWorldData.exhibits) {
          const solved = newPositions.get(ex.id);
          if (solved) {
            ex.position = solved;
          }
        }

        this.hasActiveMutation = true;
        this.mutatedExhibitId = id;
        this.lastAffectedRegions = [bestMatch.wing];
        return { success: true, message: `Inferred text ingested: linked to ${bestMatch.title} [LOW-CONFIDENCE]. Spatial solver relaxed topology.`, patchExhibit: newExhibit };
      }
    } catch (e: any) {
      return { success: false, message: `Error parsing patch: ${e.message}` };
    }
  }

  public resetToCanonical(): SemanticWorldData {
    this.currentWorldData = JSON.parse(JSON.stringify(this.initialWorldData));
    this.hasActiveMutation = false;
    this.mutatedExhibitId = null;
    this.lastAffectedRegions = [];
    return this.currentWorldData;
  }
}
