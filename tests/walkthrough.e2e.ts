import { test, expect } from '@playwright/test';

test.describe('Mnemonic World Engine Interactive Visitor Journey', () => {
  test('executes complete real-interaction visitor journey across surface, search, machine layer, orbit, mutation, and sanctuary', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Fresh application bootstrap
    await page.goto('/');
    await page.waitForSelector('#webgl-canvas');
    await page.waitForSelector('#mnemonic-ui-root');

    expect(consoleErrors).toHaveLength(0);

    // 2. Verify engine readiness and canonical exhibit baseline
    const initialExhibitCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng?.mutationManager?.currentWorldData?.exhibits?.length;
    });
    expect(initialExhibitCount).toBe(35);

    // 3. Real visitor keyboard movement (Walk + Sprint forward)
    const initialPos = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return { x: eng.player.position.x, z: eng.player.position.z };
    });

    await page.keyboard.down('KeyW');
    await page.keyboard.down('ShiftLeft');
    await page.waitForTimeout(300);
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up('KeyW');

    const movedPos = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return { x: eng.player.position.x, z: eng.player.position.z };
    });
    // Player moved in space
    const moveDist = Math.hypot(movedPos.x - initialPos.x, movedPos.z - initialPos.z);
    expect(moveDist).toBeGreaterThan(0.2);

    // 4. Real visitor spatial search interaction
    const searchBox = page.locator('input.search-box');
    await searchBox.fill('Starsilk');
    await page.waitForTimeout(100);

    const searchTarget = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      const target = eng.searchNav.activeTarget;
      return target ? { id: target.id, title: target.title, wing: target.wing } : null;
    });
    expect(searchTarget).not.toBeNull();
    expect(searchTarget?.id).toBe('E01');
    expect(searchTarget?.wing).toBe('north');

    // Clear search
    await searchBox.fill('');
    await page.waitForTimeout(50);

    // 5. Real visitor timeline epoch shift via select dropdown
    const epochSelect = page.locator('select.search-box');
    await epochSelect.selectOption('archaic');
    await page.waitForTimeout(100);

    const archaicVisibleCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      let count = 0;
      for (const lm of eng.landmarks.values()) {
        if (lm.visible) count++;
      }
      return count;
    });
    expect(archaicVisibleCount).toBeLessThan(35);

    // Restore full timeline
    await epochSelect.selectOption('all');
    await page.waitForTimeout(100);

    // 6. Real visitor descent into Subterranean Machine Underworld
    await page.click('button:has-text("Descend to Machine Underworld")');
    await page.waitForTimeout(400);

    const subStatus = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return {
        y: eng.player.position.y,
        isSubterranean: eng.player.isSubterranean
      };
    });
    expect(subStatus.isSubterranean).toBe(true);
    expect(subStatus.y).toBeLessThan(-30);

    // 7. Ascend back to Semantic Surface
    await page.click('button:has-text("Ascend to Semantic Surface")');
    await page.waitForTimeout(300);

    const surfaceStatus = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return {
        y: eng.player.position.y,
        isSubterranean: eng.player.isSubterranean
      };
    });
    expect(surfaceStatus.isSubterranean).toBe(false);
    expect(surfaceStatus.y).toBeGreaterThanOrEqual(0);

    // 8. Ascend to Orbital Macrocosm & reveal relational graph
    await page.click('button:has-text("Ascend to Orbital")');
    await page.waitForTimeout(400);

    const orbitalStatus = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return {
        y: eng.player.position.y,
        isFreeFlight: eng.player.isFreeFlight,
        graphVisible: eng.graphRenderer.isVisible
      };
    });
    expect(orbitalStatus.y).toBeGreaterThan(100);
    expect(orbitalStatus.isFreeFlight).toBe(true);
    expect(orbitalStatus.graphVisible).toBe(true);

    // Return to surface
    await page.click('button:has-text("Return to Surface Walk")');
    await page.waitForTimeout(300);

    // 9. Real visitor Ingest Knowledge Patch via modal
    await page.click('button:has-text("Ingest Knowledge Patch")');
    await page.waitForSelector('.modal', { state: 'visible' });

    // Click "Load Fixture Patch" to test static runtime fixture fetch
    await page.click('#modal-sample');
    await page.waitForTimeout(300);

    const textareaContent = await page.inputValue('#patch-input');
    expect(textareaContent.length).toBeGreaterThan(20);
    expect(textareaContent).toContain('patch-nebula-compiler');

    // Submit mutation
    await page.click('#modal-submit');
    await page.waitForTimeout(500);

    // Verify toast notification appears
    await page.waitForSelector('.hud-toast.show', { timeout: 3000 });

    const postMutationCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(postMutationCount).toBe(36);

    // 10. Verify inspection card and trace to machine
    await page.waitForSelector('.inspect-card', { state: 'visible' });
    const inspectCardTitle = await page.textContent('.inspect-card h2');
    expect(inspectCardTitle).toContain('Nebula Compiler');

    // Click TRACE TO MACHINE
    await page.click('#trace-btn');
    await page.waitForSelector('.trace-step', { timeout: 3000 });
    const traceSteps = await page.locator('.trace-step').count();
    expect(traceSteps).toBeGreaterThanOrEqual(5);

    // Close inspect card via close button
    await page.click('#inspect-close-btn');
    await page.waitForTimeout(100);

    // 11. Reset to Canonical World
    await page.click('button:has-text("Reset to Canonical World")');
    await page.waitForTimeout(300);

    const postResetCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(postResetCount).toBe(35);

    // 12. Visit Dexter Sanctuary (Non-Project Constant)
    await page.click('button:has-text("Visit Dexter Sanctuary")');
    await page.waitForTimeout(300);

    const sanctuaryCardVisible = await page.isVisible('.inspect-card');
    expect(sanctuaryCardVisible).toBe(true);

    const sanctuaryInvariant = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      const s = eng.mutationManager.currentWorldData.sanctuary;
      return {
        id: s.id,
        ontologicalClass: s.ontologicalClass,
        isExhibit: eng.mutationManager.currentWorldData.exhibits.some((e: any) => e.id === s.id)
      };
    });
    expect(sanctuaryInvariant.id).toBe('dexter-sanctuary');
    expect(sanctuaryInvariant.ontologicalClass).toBe('NON_PROJECT_ANCHOR');
    expect(sanctuaryInvariant.isExhibit).toBe(false);

    // Close inspect card via close button
    await page.click('#sanctuary-close-btn');
    const isClosed = await page.locator('.inspect-card').evaluate(el => el.style.display === 'none');
    expect(isClosed).toBe(true);

    // 13. Audio mute toggle
    await page.click('button:has-text("Audio:")');
    const audioText = await page.textContent('button:has-text("Audio:")');
    expect(audioText).toContain('Audio: Active');

    // 14. Shadow Mode Toggle & Contained Universe Environment Verification
    const shadowBtn = page.locator('#shadow-toggle-btn');
    expect(await shadowBtn.textContent()).toContain('Shadows: Reactive High');

    // Cycle to Static Standard
    await shadowBtn.click();
    await page.waitForTimeout(100);
    expect(await shadowBtn.textContent()).toContain('Shadows: Static Standard');

    // Cycle to Off
    await shadowBtn.click();
    await page.waitForTimeout(100);
    expect(await shadowBtn.textContent()).toContain('Shadows: Off');

    // Cycle back to Reactive High
    await shadowBtn.click();
    await page.waitForTimeout(100);
    expect(await shadowBtn.textContent()).toContain('Shadows: Reactive High');

    // Verify contained universe elements & parallax starfield in engine
    const cosmosVerification = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      const bubble = eng.terrain.group.getObjectByName('containment_bubble_membrane');
      const distantPlane = eng.terrain.group.getObjectByName('distant_cosmic_plane');
      const hasTier1 = eng.weather.tier1Group.children.length > 0;
      const hasTier2 = eng.weather.tier2Group.children.length > 0;
      const hasTier3 = eng.weather.tier3Group.children.length > 0;
      const shadowMapEnabled = eng.rendererHost.renderer.shadowMap.enabled;
      const isShadowReactive = eng.rendererHost.quality.shadowMode === 'reactive';

      return {
        hasBubble: !!bubble,
        hasDistantPlane: !!distantPlane,
        hasTier1,
        hasTier2,
        hasTier3,
        shadowMapEnabled,
        isShadowReactive
      };
    });

    expect(cosmosVerification.hasBubble).toBe(true);
    expect(cosmosVerification.hasDistantPlane).toBe(true);
    expect(cosmosVerification.hasTier1).toBe(true);
    expect(cosmosVerification.hasTier2).toBe(true);
    expect(cosmosVerification.hasTier3).toBe(true);
    expect(cosmosVerification.shadowMapEnabled).toBe(true);
    expect(cosmosVerification.isShadowReactive).toBe(true);

    // 15. Fullscreen and Cinematic HUD Toggle Verification
    const fullscreenBtn = page.locator('#fullscreen-toggle-btn');
    await expect(fullscreenBtn).toBeVisible();
    expect(await fullscreenBtn.textContent()).toContain('Fullscreen');

    const cinematicBtn = page.locator('#cinematic-toggle-btn');
    await expect(cinematicBtn).toBeVisible();

    const restorePill = page.locator('#hud-restore-pill');
    await expect(restorePill).toBeAttached();

    // Toggle Cinematic Mode via button
    await cinematicBtn.click();
    await page.waitForTimeout(100);
    const isHudHiddenAfterBtn = await page.locator('#mnemonic-ui-root').evaluate(el => el.classList.contains('hud-hidden'));
    expect(isHudHiddenAfterBtn).toBe(true);

    // Restore HUD via top pill
    await restorePill.click();
    await page.waitForTimeout(100);
    const isHudRestoredAfterPill = await page.locator('#mnemonic-ui-root').evaluate(el => !el.classList.contains('hud-hidden'));
    expect(isHudRestoredAfterPill).toBe(true);

    // Toggle Cinematic Mode via keyboard shortcut [H]
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(100);
    const isHudHiddenAfterKeyH = await page.locator('#mnemonic-ui-root').evaluate(el => el.classList.contains('hud-hidden'));
    expect(isHudHiddenAfterKeyH).toBe(true);

    // Restore HUD via keyboard shortcut [H]
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(100);
    const isHudRestoredAfterKeyH = await page.locator('#mnemonic-ui-root').evaluate(el => !el.classList.contains('hud-hidden'));
    expect(isHudRestoredAfterKeyH).toBe(true);

    // Press KeyF for fullscreen trigger without errors
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(100);

    // 16. Verification of 25 Next-Gen Monumental Improvements
    const nextGenVerification = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return {
        hasSingularity: !!eng.postProcessing.singularityGroup,
        hasPostProcessing: !!eng.postProcessing.composer,
        hasMercuryStreams: !!eng.terrain.group.getObjectByName('liquid_mercury_streams'),
        hasCelestialCosmos: !!eng.celestialCosmos,
        hasLivingAST: !!eng.livingAST,
        hasHeapTopography: !!eng.heapTopography,
        hasMaglevTransit: !!eng.maglevTransit,
        hasMobility: !!eng.mobility,
        hasEcosystem: !!eng.ecosystem,
        hasSpatialSynth: !!eng.spatialSynth,
        hasCollaborativePresence: !!eng.collaborativePresence,
        hasDrone: !!eng.ecosystem.group.getObjectByName('code_archaeologist_drone_0'),
        hasMantaRay: !!eng.ecosystem.group.getObjectByName('celestial_manta_ray_0'),
        hasMaglevTrain: !!eng.maglevTransit.group.getObjectByName('subterranean_maglev_train')
      };
    });

    expect(nextGenVerification.hasSingularity).toBe(true);
    expect(nextGenVerification.hasPostProcessing).toBe(true);
    expect(nextGenVerification.hasMercuryStreams).toBe(true);
    expect(nextGenVerification.hasCelestialCosmos).toBe(true);
    expect(nextGenVerification.hasLivingAST).toBe(true);
    expect(nextGenVerification.hasHeapTopography).toBe(true);
    expect(nextGenVerification.hasMaglevTransit).toBe(true);
    expect(nextGenVerification.hasMobility).toBe(true);
    expect(nextGenVerification.hasEcosystem).toBe(true);
    expect(nextGenVerification.hasSpatialSynth).toBe(true);
    expect(nextGenVerification.hasCollaborativePresence).toBe(true);
    expect(nextGenVerification.hasDrone).toBe(true);
    expect(nextGenVerification.hasMantaRay).toBe(true);
    expect(nextGenVerification.hasMaglevTrain).toBe(true);

    // Interactive Glider toggle
    await page.keyboard.press('KeyG');
    await page.waitForTimeout(100);
    const isGliderActive = await page.evaluate(() => (window as any).__mnemonicEngine.mobility.isGliderActive);
    expect(isGliderActive).toBe(true);
    await page.keyboard.press('KeyG'); // turn off

    // Interactive Katamari toggle
    await page.keyboard.press('KeyK');
    await page.waitForTimeout(100);
    const isKatamariActive = await page.evaluate(() => (window as any).__mnemonicEngine.mobility.isKatamariActive);
    expect(isKatamariActive).toBe(true);
    await page.keyboard.press('KeyK'); // turn off

    // Interactive Cymatic blast
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(100);
    const cymaticWavesCount = await page.evaluate(() => (window as any).__mnemonicEngine.spatialSynth.cymaticRipples.length);
    expect(cymaticWavesCount).toBeGreaterThanOrEqual(1);

    // Final check for console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
