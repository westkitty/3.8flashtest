import { describe, it, expect } from 'vitest';
import worldData from '../src/generated/semantic-world.json';
import archData from '../src/generated/self-architecture.json';
import patchFixture from './fixtures/knowledge-patch.json';
import { MutationManager } from '../src/mutation/MutationManager';
import type { SemanticWorldData } from '../src/types';

describe('Semantic World Model Contract', () => {
  it('contains all 35 canonical exhibits across 6 macro-regions', () => {
    expect(worldData.exhibits).toHaveLength(35);
    const regions = new Set(worldData.exhibits.map(e => e.wing));
    expect(regions.size).toBe(6);
    expect(regions.has('north')).toBe(true);
    expect(regions.has('south')).toBe(true);
    expect(regions.has('east')).toBe(true);
    expect(regions.has('west')).toBe(true);
    expect(regions.has('media')).toBe(true);
    expect(regions.has('infra')).toBe(true);
  });

  it('maps all 64 project identities across exhibits without omissions', () => {
    const allProjectIds = new Set<string>();
    for (const ex of worldData.exhibits) {
      for (const p of ex.projects) {
        allProjectIds.add(p.id);
      }
    }
    expect(allProjectIds.size).toBe(64);
  });

  it('preserves Dexter Sanctuary as an ontologically separate non-project anchor', () => {
    expect(worldData.sanctuary).toBeDefined();
    expect(worldData.sanctuary.id).toBe('dexter-sanctuary');
    expect(worldData.sanctuary.ontologicalClass).toBe('NON_PROJECT_ANCHOR');
    // Ensure Dexter is not counted among exhibits
    const match = worldData.exhibits.find(e => e.id === 'dexter-sanctuary');
    expect(match).toBeUndefined();
  });

  it('distinguishes explicit versus inferred confidence on relationships', () => {
    const confidences = new Set(worldData.relationships.map(r => r.confidence));
    expect(confidences.has('explicit')).toBe(true);
    expect(confidences.has('strongly_derived')).toBe(true);
    for (const r of worldData.relationships) {
      expect(['explicit', 'strongly_derived', 'inferred', 'unknown']).toContain(r.confidence);
    }
  });
});

describe('Subterranean Machine Self-Architecture', () => {
  it('maps real TypeScript/JavaScript modules in target repository', () => {
    expect(archData.modules.length).toBeGreaterThanOrEqual(15);
    expect(archData.edges.length).toBeGreaterThan(0);
    expect(archData.targetRepo).toBe('westkitty/3.8flashtest');
    // Ensure excluded directories are completely absent
    for (const m of archData.modules) {
      expect(m.path.startsWith('node_modules')).toBe(false);
      expect(m.path.startsWith('dist')).toBe(false);
      expect(m.path.startsWith('.git')).toBe(false);
    }
  });
});

describe('Live Knowledge Mutation Engine', () => {
  it('ingests structured patch fixture, mutates world topology, and resets cleanly', () => {
    const mgr = new MutationManager(worldData as unknown as SemanticWorldData);
    expect(mgr.currentWorldData.exhibits).toHaveLength(35);
    expect(mgr.hasActiveMutation).toBe(false);

    // Ingest patch fixture
    const res = mgr.ingestPatch(JSON.stringify(patchFixture), true);
    expect(res.success).toBe(true);
    expect(mgr.hasActiveMutation).toBe(true);
    expect(mgr.currentWorldData.exhibits).toHaveLength(36);

    const newEx = mgr.currentWorldData.exhibits.find(e => e.id === patchFixture.id);
    expect(newEx).toBeDefined();
    expect(newEx?.title).toBe(patchFixture.title);
    expect(newEx?.isMutated).toBe(true);

    // Verify mutated relationships added
    const mutatedRel = mgr.currentWorldData.relationships.filter(r => r.from === patchFixture.id);
    expect(mutatedRel.length).toBe(patchFixture.relationships.length);

    // Reset to canonical
    mgr.resetToCanonical();
    expect(mgr.currentWorldData.exhibits).toHaveLength(35);
    expect(mgr.hasActiveMutation).toBe(false);
    const resetCheck = mgr.currentWorldData.exhibits.find(e => e.id === patchFixture.id);
    expect(resetCheck).toBeUndefined();
  });

  it('ingests plain text markdown with deterministic local lexical inference', () => {
    const mgr = new MutationManager(worldData as unknown as SemanticWorldData);
    const markdown = `# Quantum Starsilk Resonance\nStarsilk macros experiencing deep cosmological turbulence in the high orbit observatories.`;
    const res = mgr.ingestPatch(markdown, false);
    expect(res.success).toBe(true);
    expect(mgr.hasActiveMutation).toBe(true);

    const mutatedRel = mgr.currentWorldData.relationships.find(r => r.from === mgr.mutatedExhibitId);
    expect(mutatedRel).toBeDefined();
    expect(mutatedRel?.confidence).toBe('inferred'); // Strict confidence boundary
  });
});
