import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { MutationManager } from '../src/mutation/MutationManager';
import { TimelineManager } from '../src/timeline/TimelineManager';
import { SearchNavigation } from '../src/search/SearchNavigation';
import { LandmarkBuilder } from '../src/world/LandmarkBuilder';
import { Terrain } from '../src/world/Terrain';
import { GraphRenderer } from '../src/world/GraphRenderer';
import { MachineCity } from '../src/machine/MachineCity';

import worldData from '../src/generated/semantic-world.json';
import archData from '../src/generated/self-architecture.json';
import patchFixture from './fixtures/knowledge-patch.json';
import type { SemanticWorldData, SelfArchitectureData } from '../src/types';

describe('Headless Full-Journey Simulation', () => {
  it('executes end-to-end 23-point spatial journey through the engine', () => {
    // 1. Fresh World State
    const mutationMgr = new MutationManager(worldData as unknown as SemanticWorldData);
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(35);

    // 2. Terrain & Spatial Positioning
    const terrain = new Terrain(mutationMgr.currentWorldData);
    const spawnY = terrain.getHeightAt(0, 30);
    expect(spawnY).toBeGreaterThanOrEqual(0);

    // 3. Landmark Construction across 6 regions
    const landmarks = new Map<string, THREE.Group>();
    for (const ex of mutationMgr.currentWorldData.exhibits) {
      const lm = LandmarkBuilder.buildLandmark(ex);
      const gy = terrain.getHeightAt(ex.position[0], ex.position[2]);
      lm.position.set(ex.position[0], gy, ex.position[2]);
      landmarks.set(ex.id, lm);
    }
    expect(landmarks.size).toBe(35);

    // 4. Verify distinct landmarks can be resolved from spawn
    const e01 = landmarks.get('E01');
    const e32 = landmarks.get('E32');
    const e34 = landmarks.get('E34');
    expect(e01).toBeDefined();
    expect(e32).toBeDefined();
    expect(e34).toBeDefined();

    // 5. Spatial Search for distant landmark
    const searchNav = new SearchNavigation(mutationMgr.currentWorldData.exhibits);
    const searchResult = searchNav.search('S\'mores Katamari');
    expect(searchResult).toBeDefined();
    expect(searchResult?.id).toBe('E32');
    expect(searchResult?.wing).toBe('south');

    // 6. Timeline Chronology Shift
    const timelineMgr = new TimelineManager(mutationMgr.currentWorldData.exhibits, landmarks);
    timelineMgr.setEpoch('archaic');
    // Archaic epoch hides contemporary structures, leaving archaic/ruins
    const contemporaryExhibit = landmarks.get('E02');
    const archaicExhibit = landmarks.get('E01');
    expect(contemporaryExhibit?.visible).toBe(false);
    expect(archaicExhibit?.visible).toBe(true);

    // Revert epoch
    timelineMgr.setEpoch('all');
    expect(contemporaryExhibit?.visible).toBe(true);

    // 7. Subterranean Machine Layer
    const machineCity = new MachineCity(archData as unknown as SelfArchitectureData);
    expect(machineCity.group.children.length).toBeGreaterThanOrEqual(20);

    // Trigger runtime events
    machineCity.handleRuntimeEvent({ type: 'MOVE', velocity: 12 });
    machineCity.handleRuntimeEvent({ type: 'SEARCH', query: 'Starsilk' });
    machineCity.handleRuntimeEvent({ type: 'ORBITAL_TOGGLE', active: true });

    // 8. Orbital Perspective & Graph Reveal
    const graphRenderer = new GraphRenderer(
      mutationMgr.currentWorldData.relationships,
      mutationMgr.currentWorldData.exhibits
    );
    expect(graphRenderer.isVisible).toBe(false);
    graphRenderer.setVisibility(true);
    expect(graphRenderer.isVisible).toBe(true);
    expect(graphRenderer.group.children.length).toBe(mutationMgr.currentWorldData.relationships.length);

    // 9. Live In-World Knowledge Mutation
    const ingestRes = mutationMgr.ingestPatch(JSON.stringify(patchFixture), true);
    expect(ingestRes.success).toBe(true);
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(36);

    // 10. Canonical Reset
    mutationMgr.resetToCanonical();
    expect(mutationMgr.currentWorldData.exhibits).toHaveLength(35);

    // 11. Dexter Sanctuary Isolation
    const s = mutationMgr.currentWorldData.sanctuary;
    expect(s.ontologicalClass).toBe('NON_PROJECT_ANCHOR');
    expect(mutationMgr.currentWorldData.exhibits.some(e => e.id === s.id)).toBe(false);
  });
});
