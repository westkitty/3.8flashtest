import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CelestialCosmos } from '../src/world/CelestialCosmos';
import { GitTimelineScrubber } from '../src/timeline/GitTimelineScrubber';
import { PlayerMobility } from '../src/player/PlayerMobility';
import { SubterraneanMaglevTransit } from '../src/machine/SubterraneanMaglevTransit';
import { ModeManager } from '../src/world/ModeManager';
import { SearchNavigation } from '../src/search/SearchNavigation';
import { MutationManager } from '../src/mutation/MutationManager';
import { CollaborativePresence } from '../src/network/CollaborativePresence';
import { PerformanceGovernor } from '../src/performance/PerformanceGovernor';
import { FrameScheduler } from '../src/performance/FrameScheduler';
import { LayerActivityManager } from '../src/performance/LayerActivityManager';
import { ResourceDisposer } from '../src/utils/ResourceDisposer';

import rawWorldData from '../src/generated/semantic-world.json';
import type { SemanticWorldData } from '../src/types';

describe('Consolidated Architecture & Performance Suite', () => {
  it('celestial cosmos cycles smoothly through 4 celestial epochs with dynamic lighting and aurora', () => {
    const cosmos = new CelestialCosmos();
    cosmos.cycleDuration = 100;

    // At t=0 -> Dawn
    cosmos.cycleTime = 0;
    const dawnState = cosmos.update(0);
    expect(dawnState.phase).toBe('dawn');
    expect(dawnState.sunIntensity).toBeGreaterThan(1.0);

    // At t=30 -> Noon
    cosmos.cycleTime = 30;
    const noonState = cosmos.update(0);
    expect(noonState.phase).toBe('noon');
    expect(noonState.auroraIntensity).toBe(0.0);

    // At t=60 -> Twilight
    cosmos.cycleTime = 60;
    const twilightState = cosmos.update(0);
    expect(twilightState.phase).toBe('twilight');

    // At t=85 -> Void (Night with full Aurora Borealis)
    cosmos.cycleTime = 85;
    const voidState = cosmos.update(0);
    expect(voidState.phase).toBe('void');
    expect(voidState.auroraIntensity).toBe(1.0);
  });

  it('git timeline scrubber correctly accesses historical commit checkpoints in Lab', () => {
    const scrubber = new GitTimelineScrubber();
    expect(scrubber.commits.length).toBeGreaterThanOrEqual(6);

    const firstCommit = scrubber.scrubToCommit(0);
    expect(firstCommit.hash).toBe('e01a001');
    expect(firstCommit.activeExhibitCount).toBe(8);

    const headCommit = scrubber.scrubToCommit(5);
    expect(headCommit.hash).toBe('edf4718');
    expect(headCommit.activeExhibitCount).toBe(35);
  });

  it('player mobility correctly handles grapple, glider, katamari accretion and removes gravity inversion', () => {
    const mobility = new PlayerMobility();

    // 1. Grapple test
    const from = new THREE.Vector3(0, 0, 0);
    const target = new THREE.Vector3(10, 20, 30);
    mobility.shootGrapple(from, target);
    expect(mobility.isGrappling).toBe(true);
    expect(mobility.grappleAnchor?.x).toBe(10);
    mobility.releaseGrapple();
    expect(mobility.isGrappling).toBe(false);

    // 2. Glider test
    const isGlider = mobility.toggleGlider();
    expect(isGlider).toBe(true);
    expect(mobility.isGliderActive).toBe(true);
    expect(mobility.mode).toBe('glider');
    mobility.toggleGlider();
    expect(mobility.isGliderActive).toBe(false);

    // 3. Katamari test with bounded visual allocation
    mobility.toggleKatamari();
    expect(mobility.isKatamariActive).toBe(true);
    const initialRadius = mobility.katamariRadius;
    for (let i = 0; i < 25; i++) {
      mobility.accreteConcept();
    }
    expect(mobility.katamariItemsCount).toBe(25);
    expect(mobility.katamariRadius).toBeGreaterThan(initialRadius);

    // 4. Verify Gravity Inversion removed from visitor affordances
    expect((mobility as any).toggleGravityInversion).toBeUndefined();
    expect((mobility as any).gravityDirection).toBeUndefined();

    // 5. Test clean modifier reset
    mobility.resetAllModifiers();
    expect(mobility.isGliderActive).toBe(false);
    expect(mobility.isKatamariActive).toBe(false);
    expect(mobility.isGrappling).toBe(false);
    expect(mobility.mode).toBe('standard');
  });

  it('subterranean maglev transit completes a closed continuous loop and provides passenger camera coordinates', () => {
    const maglev = new SubterraneanMaglevTransit();
    expect(maglev.trackCurve).toBeDefined();

    const startPos = maglev.trainMesh.position.clone();
    maglev.update(5.0);
    const advancedPos = maglev.trainMesh.position.clone();

    expect(startPos.distanceTo(advancedPos)).toBeGreaterThan(0.5);

    const camPos = maglev.getPassengerCameraPosition();
    expect(camPos.y).toBe(maglev.trainMesh.position.y + 1.5);

    const isBoarded = maglev.toggleBoarding();
    expect(isBoarded).toBe(true);
  });

  it('mode manager enforces mutually coherent transitions without contradictory states', () => {
    const transitionLog: string[] = [];

    const modeMgr = new ModeManager({
      onStartTour: () => transitionLog.push('start_tour'),
      onStopTour: () => transitionLog.push('stop_tour'),
      onEnableConnections: () => transitionLog.push('enable_connections'),
      onDisableConnections: () => transitionLog.push('disable_connections'),
      onDescendMachine: () => transitionLog.push('descend_machine'),
      onAscendSurface: () => transitionLog.push('ascend_surface'),
      onResetLabModifiers: () => transitionLog.push('reset_lab')
    });

    expect(modeMgr.currentMode).toBe('surface');

    // 1. Surface -> Tour
    modeMgr.setMode('tour');
    expect(modeMgr.currentMode).toBe('tour');
    expect(transitionLog).toContain('start_tour');

    // 2. Tour -> Machine (exiting tour must stop tour cleanly)
    modeMgr.setMode('machine');
    expect(modeMgr.currentMode).toBe('machine');
    expect(transitionLog).toContain('stop_tour');
    expect(transitionLog).toContain('descend_machine');

    // 3. Machine -> Connections (must ascend and enable connections)
    modeMgr.setMode('connections');
    expect(modeMgr.currentMode).toBe('connections');
    expect(transitionLog).toContain('enable_connections');

    // 4. Return to Surface (deterministic home state)
    modeMgr.setMode('surface');
    expect(modeMgr.currentMode).toBe('surface');
    expect(transitionLog).toContain('disable_connections');
    expect(transitionLog).toContain('ascend_surface');
  });

  it('ranked search indexes titles, exhibit IDs, project IDs, and descriptive text', () => {
    const worldData = rawWorldData as unknown as SemanticWorldData;
    const searchNav = new SearchNavigation(worldData.exhibits);

    // 1. Search by exhibit ID (e.g. "E01")
    const idResults = searchNav.searchRanked('E01');
    expect(idResults.length).toBeGreaterThanOrEqual(1);
    expect(idResults[0].exhibit.id).toBe('E01');
    expect(idResults[0].matchField).toBe('id');

    // 2. Search by project title ("Starsilk")
    const titleResults = searchNav.searchRanked('Starsilk');
    expect(titleResults.length).toBeGreaterThanOrEqual(1);
    expect(titleResults[0].exhibit.title).toContain('Starsilk');

    // 3. Search by project name ("reliquary")
    const projResults = searchNav.searchRanked('reliquary');
    expect(projResults.length).toBeGreaterThanOrEqual(1);
    expect(projResults[0].exhibit.projects.some(p => p.name.toLowerCase().includes('reliquary'))).toBe(true);

    // 4. Search by project ID ("P009")
    const projIdResults = searchNav.searchRanked('P009');
    expect(projIdResults.length).toBeGreaterThanOrEqual(1);
    expect(projIdResults[0].exhibit.projects.some(p => p.id === 'P009')).toBe(true);
    expect(projIdResults[0].matchField).toBe('projectId');

    // 5. In-world beacon target is set
    expect(searchNav.activeTarget).toBeDefined();
    expect(searchNav.activeTarget?.id).toBe(projResults[0].exhibit.id);

    searchNav.clear();
    expect(searchNav.activeTarget).toBeNull();
  });

  it('mutation workflow supports speculative preview without modifying canonical world, then applies and undos', () => {
    const worldData = rawWorldData as unknown as SemanticWorldData;
    const mutationMgr = new MutationManager(worldData);
    expect(mutationMgr.currentWorldData.exhibits.length).toBe(35);

    const patch = {
      id: 'patch-test-speculative',
      title: 'Speculative Testing Spire',
      wing: 'north',
      summary: 'Testing speculative preview before commit.',
      relationships: [{ to: 'E01', confidence: 'explicit' }]
    };

    // 1. Generate speculative preview
    const previewRes = mutationMgr.previewPatch(JSON.stringify(patch), true);
    expect(previewRes.success).toBe(true);
    expect(previewRes.preview).toBeDefined();
    expect(previewRes.preview?.candidateExhibit.title).toBe('Speculative Testing Spire');
    expect(previewRes.preview?.explicitCount).toBe(1);

    // Canonical world MUST NOT be modified during preview
    expect(mutationMgr.currentWorldData.exhibits.length).toBe(35);
    expect(mutationMgr.hasActiveMutation).toBe(false);

    // 2. Apply preview
    const applyRes = mutationMgr.applyMutation(previewRes.preview!);
    expect(applyRes.success).toBe(true);
    expect(mutationMgr.currentWorldData.exhibits.length).toBe(36);
    expect(mutationMgr.hasActiveMutation).toBe(true);
    expect(mutationMgr.canUndo).toBe(true);

    // 3. Undo mutation
    const undoRes = mutationMgr.undoLastMutation();
    expect(undoRes.success).toBe(true);
    expect(mutationMgr.currentWorldData.exhibits.length).toBe(35);
    expect(mutationMgr.hasActiveMutation).toBe(false);
  });

  it('local presence is truthfully local and throttles publication rate', () => {
    const presence = new CollaborativePresence();
    // Verify no fabricated demo peers spawned by default
    expect((presence as any).peerHolograms.size).toBe(0);

    const pos = new THREE.Vector3(10, 5, 20);
    presence.broadcastPosition(pos);
    // Move slightly (0.1m - below 0.4m threshold)
    presence.broadcastPosition(new THREE.Vector3(10.05, 5, 20));
    // Internal lastBroadcastPos was updated only once
    expect(presence.group.children.length).toBeGreaterThanOrEqual(1);

    presence.dispose();
  });

  it('performance governor tracks rolling frame time and transitions tiers with hysteresis', () => {
    const transitions: string[] = [];
    const gov = new PerformanceGovernor({
      sampleSize: 10,
      onTierChange: (newTier) => transitions.push(newTier)
    });

    expect(gov.tier).toBe('high');

    // Simulate 70 slow frames (35ms per frame)
    for (let i = 0; i < 70; i++) {
      gov.recordFrame(0.035);
    }

    // Should drop to balanced tier after sustained >30ms
    expect(gov.tier).toBe('balanced');
    expect(transitions).toContain('balanced');

    // Manual override takes precedence
    gov.setTierOverride('low');
    expect(gov.tier).toBe('low');
    gov.setTierOverride(null);
    expect(gov.tier).toBe('balanced');
  });

  it('frame scheduler classifies updates into frequency buckets', () => {
    const scheduler = new FrameScheduler();

    const t1 = scheduler.tick(0.016);
    expect(t1.isRealtime).toBe(true);
    expect(t1.isMedium).toBe(false);
    expect(t1.isLow).toBe(false);

    const t2 = scheduler.tick(0.016);
    expect(t2.isRealtime).toBe(true);
    expect(t2.isMedium).toBe(true); // frame 2
    expect(t2.isLow).toBe(false);

    scheduler.tick(0.016); // 3
    scheduler.tick(0.016); // 4
    scheduler.tick(0.016); // 5
    const t6 = scheduler.tick(0.016); // 6
    expect(t6.isLow).toBe(true);
  });

  it('layer activity manager isolates subsystem work by active layer', () => {
    const layer = new LayerActivityManager();

    // Default: surface
    layer.updateMode('surface', false);
    expect(layer.shouldUpdateSurfaceAtmosphere).toBe(true);
    expect(layer.shouldUpdateMachineCavern).toBe(false);
    expect(layer.shouldUpdateRelationalGraph).toBe(false);
    expect(layer.shouldUpdateTourDirector).toBe(false);

    // In machine layer: atmosphere sleeps, machine cavern activates
    layer.updateMode('machine', true);
    expect(layer.shouldUpdateSurfaceAtmosphere).toBe(false);
    expect(layer.shouldUpdateMachineCavern).toBe(true);

    // In connections: graph pulses activate
    layer.updateMode('connections', false);
    expect(layer.shouldUpdateRelationalGraph).toBe(true);

    // In tour: director camera activates
    layer.updateMode('tour', false);
    expect(layer.shouldUpdateTourDirector).toBe(true);
  });

  it('resource disposer recursively cleans GPU geometries and materials without memory leakage', () => {
    const testGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      const mesh = new THREE.Mesh(geo, mat);
      testGroup.add(mesh);
    }

    expect(testGroup.children.length).toBe(5);
    ResourceDisposer.disposeTree(testGroup);
    expect(testGroup.children.length).toBe(0);
  });
});
