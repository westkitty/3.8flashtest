import type {
  SemanticWorldData,
  SemanticExhibit,
  SemanticRelationship,
  WingId,
  MutationPreviewResult,
  MutationResult
} from '../types';
import { SemanticSpatialSolver } from '../world/SemanticSpatialSolver';

export class MutationManager {
  private initialWorldData: SemanticWorldData;
  public currentWorldData: SemanticWorldData;
  public hasActiveMutation = false;
  public mutatedExhibitId: string | null = null;
  public lastAffectedRegions: string[] = [];

  // Undo history stack
  private historyStack: SemanticWorldData[] = [];

  constructor(worldData: SemanticWorldData) {
    this.initialWorldData = JSON.parse(JSON.stringify(worldData));
    this.currentWorldData = JSON.parse(JSON.stringify(worldData));
  }

  public get canUndo(): boolean {
    return this.historyStack.length > 0;
  }

  public get mutationCount(): number {
    return this.currentWorldData.exhibits.filter(e => e.isMutated).length;
  }

  /**
   * Stage 1: Parse and validate input, returning speculative candidate preview
   * WITHOUT modifying currentWorldData.
   */
  public previewPatch(content: string, isJson = true): { success: boolean; message: string; preview?: MutationPreviewResult } {
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

        const candidateExhibit: SemanticExhibit = {
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

        const candidateRelationships: SemanticRelationship[] = [];
        let explicitCount = 0;
        let inferredCount = 0;

        if (patch.relationships && Array.isArray(patch.relationships)) {
          for (const r of patch.relationships) {
            if (r && typeof r.to === 'string' && this.currentWorldData.exhibits.some(e => e.id === r.to)) {
              const conf = r.confidence || 'explicit';
              if (conf === 'inferred') inferredCount++;
              else explicitCount++;

              candidateRelationships.push({
                from: patch.id,
                to: r.to,
                type: r.type || 'mutated_link',
                confidence: conf,
                reason: r.reason || 'Synthesized in-world knowledge link',
                isMutated: true
              });
            }
          }
        }

        // Simulate spatial solver displacement
        const simExhibits = [...this.currentWorldData.exhibits, candidateExhibit];
        const simRels = [...this.currentWorldData.relationships, ...candidateRelationships];
        const simPositions = SemanticSpatialSolver.solve(simExhibits, simRels, this.currentWorldData.regions);

        let totalDisplacement = 0;
        for (const ex of this.currentWorldData.exhibits) {
          const newPos = simPositions.get(ex.id);
          if (newPos) {
            totalDisplacement += Math.hypot(newPos[0] - ex.position[0], newPos[2] - ex.position[2]);
          }
        }
        const solvedCandidatePos = simPositions.get(candidateExhibit.id);
        if (solvedCandidatePos) {
          candidateExhibit.position = solvedCandidatePos;
        }

        return {
          success: true,
          message: `Preview generated for "${patch.title}" in ${targetRegion.name}.`,
          preview: {
            candidateExhibit,
            candidateRelationships,
            targetRegion,
            explicitCount,
            inferredCount,
            displacementScore: Math.round(totalDisplacement * 10) / 10,
            message: `Structured patch proposes 1 exhibit and ${candidateRelationships.length} relationships.`
          }
        };
      } else {
        // Plain text / Markdown local deterministic inference
        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : 'Emergent Markdown Concept';

        // Deterministic hash ID
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

        const targetRegion = this.currentWorldData.regions[bestMatch.wing] || this.currentWorldData.regions.north;

        const candidateExhibit: SemanticExhibit = {
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

        const candidateRelationships: SemanticRelationship[] = [{
          from: id,
          to: bestMatch.id,
          type: 'lexical_concordance',
          confidence: 'inferred',
          reason: `Locally inferred lexical overlap score: ${bestScore} keywords`,
          isMutated: true
        }];

        const simExhibits = [...this.currentWorldData.exhibits, candidateExhibit];
        const simRels = [...this.currentWorldData.relationships, ...candidateRelationships];
        const simPositions = SemanticSpatialSolver.solve(simExhibits, simRels, this.currentWorldData.regions);

        let totalDisplacement = 0;
        for (const ex of this.currentWorldData.exhibits) {
          const newPos = simPositions.get(ex.id);
          if (newPos) {
            totalDisplacement += Math.hypot(newPos[0] - ex.position[0], newPos[2] - ex.position[2]);
          }
        }
        const solvedCandidatePos = simPositions.get(candidateExhibit.id);
        if (solvedCandidatePos) {
          candidateExhibit.position = solvedCandidatePos;
        }

        return {
          success: true,
          message: `Inferred preview generated: cluster with ${bestMatch.title} in ${targetRegion.name}.`,
          preview: {
            candidateExhibit,
            candidateRelationships,
            targetRegion,
            explicitCount: 0,
            inferredCount: 1,
            displacementScore: Math.round(totalDisplacement * 10) / 10,
            message: `Lexical analysis linked concept to ${bestMatch.title} [LOW CONFIDENCE / INFERRED].`
          }
        };
      }
    } catch (e: any) {
      return { success: false, message: `Error generating preview: ${e.message}` };
    }
  }

  /**
   * Stage 2: Commit a previewed mutation to the active world.
   */
  public applyMutation(preview: MutationPreviewResult): MutationResult {
    // Snapshot current state for undo
    this.historyStack.push(JSON.parse(JSON.stringify(this.currentWorldData)));

    this.currentWorldData.exhibits.push(preview.candidateExhibit);
    for (const rel of preview.candidateRelationships) {
      this.currentWorldData.relationships.push(rel);
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
    this.mutatedExhibitId = preview.candidateExhibit.id;
    this.lastAffectedRegions = [preview.candidateExhibit.wing];

    return {
      success: true,
      message: `Mutation applied: "${preview.candidateExhibit.title}". Topology updated.`,
      patchExhibit: preview.candidateExhibit
    };
  }

  /**
   * Stage 3: Undo the last applied mutation.
   */
  public undoLastMutation(): { success: boolean; message: string; restoredExhibit?: SemanticExhibit } {
    if (this.historyStack.length === 0) {
      return { success: false, message: 'No mutations to undo.' };
    }

    const previousState = this.historyStack.pop()!;
    this.currentWorldData = previousState;
    this.hasActiveMutation = this.currentWorldData.exhibits.some(e => e.isMutated);
    const lastMutated = this.currentWorldData.exhibits.find(e => e.isMutated);
    this.mutatedExhibitId = lastMutated ? lastMutated.id : null;

    return {
      success: true,
      message: 'Reverted last mutation. Topology restored.'
    };
  }

  /**
   * Convenience combined method for direct or programmatic ingestion.
   */
  public ingestPatch(content: string, isJson: boolean): { success: boolean; message: string; patchExhibit?: SemanticExhibit } {
    const previewRes = this.previewPatch(content, isJson);
    if (!previewRes.success || !previewRes.preview) {
      return { success: false, message: previewRes.message };
    }
    return this.applyMutation(previewRes.preview);
  }

  /**
   * Reset world to original canonical baseline.
   */
  public resetToCanonical(): SemanticWorldData {
    this.currentWorldData = JSON.parse(JSON.stringify(this.initialWorldData));
    this.historyStack = [];
    this.hasActiveMutation = false;
    this.mutatedExhibitId = null;
    this.lastAffectedRegions = [];
    return this.currentWorldData;
  }
}
