import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MutationManager } from '../src/mutation/MutationManager';
import { TimelineManager } from '../src/timeline/TimelineManager';
import { SearchNavigation } from '../src/search/SearchNavigation';
import { LandmarkBuilder } from '../src/world/LandmarkBuilder';
import { Terrain } from '../src/world/Terrain';
import { GraphRenderer } from '../src/world/GraphRenderer';
import { MachineCity } from '../src/machine/MachineCity';
import { ModeManager } from '../src/world/ModeManager';
import { LayerActivityManager } from '../src/performance/LayerActivityManager';

import worldData from '../src/generated/semantic-world.json';
import archData from '../src/generated/self-architecture.json';
import patchFixture from './fixtures/knowledge-patch.json';
import type { SemanticWorldData, SelfArchitectureData } from '../src/types';

describe('Headless Full-Journey Visitor Simulation', () => {
  it('executes end-to-end 5-verb visitor journey through the consolidated engine', () => {
    // -------------------------------------------------------------------------
    // 0. World Initialization & Authoritative Mode Setup
    // -------------------------------------------------------------------------
    const mutationMgr = new MutationManager(worldData as unknown as SemanticWorldData);
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(35);

    const modeManager = new ModeManager();
    const layerManager = new LayerActivityManager();
    layerManager.updateMode(modeManager.getMode(), false);
    expect(modeManager.getMode()).toBe('surface');
    expect(layerManager.shouldUpdateMachineCavern).toBe(false);
    expect(layerManager.shouldUpdateSurfaceAtmosphere).toBe(true);

    // -------------------------------------------------------------------------
    // 1. VERB: EXPLORE — Surface walk, deterministic terrain, landmark registry
    // -------------------------------------------------------------------------
    const terrain = new Terrain(mutationMgr.currentWorldData);
    const spawnY = terrain.getHeightAt(0, 30);
    expect(spawnY).toBeGreaterThanOrEqual(0);

    const landmarks = new Map<string, THREE.Group>();
    for (const ex of mutationMgr.currentWorldData.exhibits) {
      const lm = LandmarkBuilder.buildLandmark(ex);
      const gy = terrain.getHeightAt(ex.position[0], ex.position[2]);
      lm.position.set(ex.position[0], gy, ex.position[2]);
      landmarks.set(ex.id, lm);
    }
    expect(landmarks.size).toBe(35);

    // Verify key regional anchors exist
    expect(landmarks.get('E01')).toBeDefined(); // North / Starsilk
    expect(landmarks.get('E09')).toBeDefined(); // West / Ruin
    expect(landmarks.get('E32')).toBeDefined(); // South / Katamari
    expect(landmarks.get('E34')).toBeDefined(); // East / BigMac

    // -------------------------------------------------------------------------
    // 2. VERB: FIND — Ranked search navigation & beacon targeting
    // -------------------------------------------------------------------------
    const searchNav = new SearchNavigation(mutationMgr.currentWorldData.exhibits);

    // Search by title prefix/term
    const titleResults = searchNav.searchRanked('Starsilk');
    expect(titleResults.length).toBeGreaterThanOrEqual(1);
    expect(titleResults[0].exhibit.id).toBe('E01');
    expect(titleResults[0].matchField).toBe('title');

    // Search by canonical project ID
    const projIdResults = searchNav.searchRanked('P009');
    expect(projIdResults.length).toBeGreaterThanOrEqual(1);
    expect(projIdResults[0].exhibit.id).toBe('E09');
    expect(projIdResults[0].matchField).toBe('projectId');

    // Verify beacon target selection
    expect(searchNav.activeTarget?.id).toBe('E09');
    searchNav.clear();
    expect(searchNav.activeTarget).toBeNull();

    // -------------------------------------------------------------------------
    // 3. VERB: INSPECT — Exhibit metadata card & relational link resolution
    // -------------------------------------------------------------------------
    const targetExhibit = mutationMgr.currentWorldData.exhibits.find(e => e.id === 'E01')!;
    expect(targetExhibit).toBeDefined();
    expect(targetExhibit.title).toContain('Starsilk');
    expect(targetExhibit.projects.length).toBeGreaterThan(0);

    // Find outgoing relationships from E01 for contextual links
    const outgoingRels = mutationMgr.currentWorldData.relationships.filter(r => r.from === 'E01' || r.to === 'E01');
    expect(outgoingRels.length).toBeGreaterThan(0);

    // Contextual affordance: Trace to Machine subterranean infrastructure
    expect(targetExhibit.id).toBe('E01');

    // -------------------------------------------------------------------------
    // 4. TRANSITION: Trace to Machine & Subterranean Exploration
    // -------------------------------------------------------------------------
    modeManager.transitionTo('machine', 'Trace to Machine button clicked');
    layerManager.updateMode(modeManager.getMode(), true);
    expect(modeManager.getMode()).toBe('machine');
    expect(layerManager.shouldUpdateMachineCavern).toBe(true);
    expect(layerManager.shouldUpdateSurfaceAtmosphere).toBe(false);

    const machineCity = new MachineCity(archData as unknown as SelfArchitectureData);
    expect(machineCity.group.children.length).toBeGreaterThanOrEqual(20);

    // Subterranean runtime event dispatches
    machineCity.handleRuntimeEvent({ type: 'MOVE', velocity: 8 });
    machineCity.handleRuntimeEvent({ type: 'SEARCH', query: 'Starsilk' });

    // Ascend back to Surface
    modeManager.transitionTo('surface', 'Ascend to surface clicked');
    layerManager.updateMode(modeManager.getMode(), false);
    expect(modeManager.getMode()).toBe('surface');
    expect(layerManager.shouldUpdateMachineCavern).toBe(false);
    expect(layerManager.shouldUpdateSurfaceAtmosphere).toBe(true);

    // -------------------------------------------------------------------------
    // 5. VERB: REVEAL — Connections Mode (Graph Topology)
    // -------------------------------------------------------------------------
    modeManager.transitionTo('connections', 'Dock Connections button clicked');
    expect(modeManager.getMode()).toBe('connections');

    const graphRenderer = new GraphRenderer(
      mutationMgr.currentWorldData.relationships,
      mutationMgr.currentWorldData.exhibits
    );
    expect(graphRenderer.isVisible).toBe(false);
    graphRenderer.setVisibility(true);
    expect(graphRenderer.isVisible).toBe(true);
    expect(graphRenderer.group.children.length).toBe(mutationMgr.currentWorldData.relationships.length);

    // Verify explicit vs. derived confidence rendering differentiation
    const hasExplicit = mutationMgr.currentWorldData.relationships.some(r => r.confidence === 'explicit');
    const hasDerived = mutationMgr.currentWorldData.relationships.some(r => r.confidence === 'strongly_derived');
    expect(hasExplicit).toBe(true);
    expect(hasDerived).toBe(true);

    // Return to surface
    modeManager.transitionTo('surface', 'Dock Connections toggle off');
    expect(modeManager.getMode()).toBe('surface');

    // -------------------------------------------------------------------------
    // 6. TRANSITION: Guided Tour Sequence
    // -------------------------------------------------------------------------
    modeManager.transitionTo('tour', 'Dock Guided Tour button clicked');
    expect(modeManager.getMode()).toBe('tour');
    // Exit tour back to surface
    modeManager.transitionTo('surface', 'Exit tour button');
    expect(modeManager.getMode()).toBe('surface');

    // -------------------------------------------------------------------------
    // 7. VERB: MUTATE — Speculative Preview, Apply, Undo, and Reset Workflow
    // -------------------------------------------------------------------------
    // Step A: Speculative Preview (does NOT modify world)
    const patchJson = JSON.stringify(patchFixture);
    const previewResult = mutationMgr.previewPatch(patchJson, true);
    expect(previewResult.success).toBe(true);
    expect(previewResult.preview).toBeDefined();
    expect(previewResult.preview?.candidateExhibit.id).toBe('patch-nebula-compiler');
    expect(previewResult.preview?.inferredCount).toBe(1);
    expect(previewResult.preview?.explicitCount).toBe(2);
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(35); // Still 35 canonical exhibits

    modeManager.transitionTo('mutation-preview', 'Previewing speculative mutation patch');
    expect(modeManager.getMode()).toBe('mutation-preview');

    // Step B: Apply Mutation
    const applyResult = mutationMgr.applyMutation(previewResult.preview!);
    expect(applyResult.success).toBe(true);
    expect(applyResult.patchExhibit?.id).toBe('patch-nebula-compiler');
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(36);

    modeManager.transitionTo('surface', 'Applied mutation, return to surface');
    expect(modeManager.getMode()).toBe('surface');

    // Step C: Undo Last Mutation
    const undoResult = mutationMgr.undoLastMutation();
    expect(undoResult.success).toBe(true);
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(35);

    // Step D: Ingest and Reset
    mutationMgr.ingestPatch(patchJson, true);
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(36);
    mutationMgr.resetToCanonical();
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(35);

    // -------------------------------------------------------------------------
    // 8. CRITICAL INVARIANT: Dexter Sanctuary Isolation
    // -------------------------------------------------------------------------
    const sanctuary = mutationMgr.currentWorldData.sanctuary;
    expect(sanctuary).toBeDefined();
    expect(sanctuary.id).toBe('dexter-sanctuary');
    expect(sanctuary.ontologicalClass).toBe('NON_PROJECT_ANCHOR');
    // Sanctuary MUST never be listed in the project exhibits array
    expect(mutationMgr.currentWorldData.exhibits.some(e => e.id === sanctuary.id)).toBe(false);

    // -------------------------------------------------------------------------
    // 9. TIMELINE EPOCH FILTERING (Contextual affordance in Menu/Lab)
    // -------------------------------------------------------------------------
    const timelineMgr = new TimelineManager(mutationMgr.currentWorldData.exhibits, landmarks);
    timelineMgr.setEpoch('archaic');
    expect(landmarks.get('E02')?.visible).toBe(false);
    expect(landmarks.get('E01')?.visible).toBe(true);
    timelineMgr.setEpoch('all');
    expect(landmarks.get('E02')?.visible).toBe(true);
  });
});
