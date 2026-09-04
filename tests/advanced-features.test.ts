import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CelestialCosmos } from '../src/world/CelestialCosmos';
import { GitTimelineScrubber } from '../src/timeline/GitTimelineScrubber';
import { PlayerMobility } from '../src/player/PlayerMobility';
import { SubterraneanMaglevTransit } from '../src/machine/SubterraneanMaglevTransit';

describe('25 Monumental Improvements Architecture & Math Suite', () => {
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

  it('git timeline scrubber correctly accesses historical commit checkpoints', () => {
    const scrubber = new GitTimelineScrubber();
    expect(scrubber.commits.length).toBeGreaterThanOrEqual(6);

    const firstCommit = scrubber.scrubToCommit(0);
    expect(firstCommit.hash).toBe('e01a001');
    expect(firstCommit.activeExhibitCount).toBe(8);

    const headCommit = scrubber.scrubToCommit(5);
    expect(headCommit.hash).toBe('edf4718');
    expect(headCommit.activeExhibitCount).toBe(35);
  });

  it('player mobility correctly handles grapple, glider, and katamari accretion', () => {
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

    // 3. Katamari test
    mobility.toggleKatamari();
    expect(mobility.isKatamariActive).toBe(true);
    const initialRadius = mobility.katamariRadius;
    mobility.accreteConcept();
    expect(mobility.katamariItemsCount).toBe(1);
    expect(mobility.katamariRadius).toBeGreaterThan(initialRadius);

    // 4. Gravity Inversion test
    const inverted = mobility.toggleGravityInversion();
    expect(inverted).toBe(true);
    expect(mobility.gravityDirection.y).toBe(1);
    mobility.toggleGravityInversion();
    expect(mobility.gravityDirection.y).toBe(-1);
  });

  it('subterranean maglev transit completes a closed continuous loop and provides passenger camera coordinates', () => {
    const maglev = new SubterraneanMaglevTransit();
    expect(maglev.trackCurve).toBeDefined();

    const startPos = maglev.trainMesh.position.clone();
    maglev.update(5.0); // advance 5 seconds along track
    const advancedPos = maglev.trainMesh.position.clone();

    expect(startPos.distanceTo(advancedPos)).toBeGreaterThan(0.5);

    const camPos = maglev.getPassengerCameraPosition();
    expect(camPos.y).toBe(maglev.trainMesh.position.y + 1.5);

    const isBoarded = maglev.toggleBoarding();
    expect(isBoarded).toBe(true);
  });
});
