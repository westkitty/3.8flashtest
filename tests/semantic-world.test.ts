import { describe, it, expect } from 'vitest';
import worldData from '../src/generated/semantic-world.json';
import archData from '../src/generated/self-architecture.json';
import patchFixture from './fixtures/knowledge-patch.json';
import { MutationManager } from '../src/mutation/MutationManager';
import { SemanticSpatialSolver } from '../src/world/SemanticSpatialSolver';
import { ProvenanceTracer } from '../src/provenance/ProvenanceTracer';
import type { SemanticWorldData, SelfArchitectureData } from '../src/types';

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

  it('verifies 14 distinct hero landmark archetypes exist', () => {
    const archetypes = new Set(worldData.exhibits.map(e => e.archetype));
    expect(archetypes.size).toBeGreaterThanOrEqual(14);
    expect(archetypes.has('starsilk_loom')).toBe(true);
    expect(archetypes.has('orbital_tomb_dismantler')).toBe(true);
    expect(archetypes.has('terraforming_vat')).toBe(true);
    expect(archetypes.has('heliocide_absence_lens')).toBe(true);
    expect(archetypes.has('smores_katamari_forge')).toBe(true);
    expect(archetypes.has('bigmac_server_monolith')).toBe(true);
  });
});

describe('Subterranean Machine Self-Architecture (AST-Parsed)', () => {
  it('maps real TypeScript/JavaScript modules in target repository via AST', () => {
    expect(archData.modules.length).toBeGreaterThanOrEqual(20);
    expect(archData.edges.length).toBeGreaterThanOrEqual(25);
    expect(archData.targetRepo).toBe('westkitty/3.8flashtest');
    for (const m of archData.modules) {
      expect(m.path.startsWith('node_modules')).toBe(false);
      expect(m.path.startsWith('dist')).toBe(false);
      expect(m.path.startsWith('.git')).toBe(false);
    }
  });

  it('traces world landmarks down to responsible code modules in the machine layer', () => {
    const tracer = new ProvenanceTracer(archData as unknown as SelfArchitectureData);
    const ex = worldData.exhibits.find(e => e.id === 'E01')!;
    const { chain, targetMachineModule } = tracer.traceLandmark(ex as any);
    expect(chain.length).toBe(5);
    expect(targetMachineModule).toBeDefined();
    expect(targetMachineModule.path.startsWith('src/')).toBe(true);
  });
});

describe('Semantic Spatial Solver & Dynamic Tectonics', () => {
  it('solves spatial equilibrium deterministically without collisions', () => {
    const exhibits = worldData.exhibits as any;
    const rels = worldData.relationships as any;
    const regions = worldData.regions as any;

    const solved1 = SemanticSpatialSolver.solve(exhibits, rels, regions);
    const solved2 = SemanticSpatialSolver.solve(exhibits, rels, regions);

    for (const [id, pos1] of solved1.entries()) {
      const pos2 = solved2.get(id)!;
      expect(pos1[0]).toBe(pos2[0]);
      expect(pos1[2]).toBe(pos2[2]);
    }
  });

  it('ingests structured patch fixture, mutates topology, and resets cleanly', () => {
    const mgr = new MutationManager(worldData as unknown as SemanticWorldData);
    expect(mgr.currentWorldData.exhibits).toHaveLength(35);
    expect(mgr.hasActiveMutation).toBe(false);

    const res = mgr.ingestPatch(JSON.stringify(patchFixture), true);
    expect(res.success).toBe(true);
    expect(mgr.hasActiveMutation).toBe(true);
    expect(mgr.currentWorldData.exhibits).toHaveLength(36);

    const newEx = mgr.currentWorldData.exhibits.find(e => e.id === patchFixture.id);
    expect(newEx).toBeDefined();
    expect(newEx?.title).toBe(patchFixture.title);
    expect(newEx?.isMutated).toBe(true);

    mgr.resetToCanonical();
    expect(mgr.currentWorldData.exhibits).toHaveLength(35);
    expect(mgr.hasActiveMutation).toBe(false);
  });
});
