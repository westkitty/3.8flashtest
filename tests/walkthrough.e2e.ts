import { test, expect } from '@playwright/test';

test.describe('Mnemonic World Engine Interactive Visitor Journey', () => {
  test('executes complete real-interaction visitor journey across surface, search, machine layer, orbit, mutation, and sanctuary', async ({ page }) => {
    const t0 = Date.now();
    const logStep = (name: string) => console.log(`[E2E STEP +${Date.now() - t0}ms] ${name}`);

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Fresh application bootstrap
    logStep('1. goto /');
    await page.goto('/');
    await page.waitForSelector('#webgl-canvas');
    await page.waitForSelector('#mnemonic-ui-root');

    expect(consoleErrors).toHaveLength(0);

    // 2. Verify engine readiness and canonical exhibit baseline
    logStep('2. verify baseline exhibits');
    const initialExhibitCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng?.mutationManager?.currentWorldData?.exhibits?.length;
    });
    expect(initialExhibitCount).toBe(35);

    // 3. Real visitor keyboard movement (Walk + Sprint forward)
    logStep('3. visitor movement');
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

    // 4. Real visitor spatial search interaction via consolidated Dock Find
    logStep('4. spatial search find');
    await page.click('#dock-btn-find');
    await page.waitForSelector('#search-nav-input', { state: 'visible' });

    const searchBox = page.locator('#search-nav-input');
    await searchBox.fill('Starsilk');
    await page.waitForTimeout(150);

    // Verify ranked results in modal list
    const firstResult = page.locator('.search-results-list .search-item').first();
    await expect(firstResult).toBeVisible();
    await expect(firstResult).toContainText('Starsilk');

    // Press Enter to navigate to first result
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);

    const searchTarget = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      const target = eng.searchNav.activeTarget;
      return target ? { id: target.id, title: target.title, wing: target.wing } : null;
    });
    expect(searchTarget).not.toBeNull();
    expect(searchTarget?.id).toBe('E01');
    expect(searchTarget?.wing).toBe('north');

    // Helper functions for idempotent drawer control
    const openMenuDrawer = async () => {
      const isOpen = await page.evaluate(() => {
        const d = document.querySelector('.menu-drawer');
        return d ? d.classList.contains('open') : false;
      });
      if (!isOpen) {
        await page.click('#dock-btn-menu', { force: true });
        await page.waitForSelector('.menu-drawer.open', { state: 'visible' });
      }
    };

    const closeMenuDrawer = async () => {
      const isOpen = await page.evaluate(() => {
        const d = document.querySelector('.menu-drawer');
        return d ? d.classList.contains('open') : false;
      });
      if (isOpen) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    };

    // 5. Real visitor timeline epoch shift via Menu / Lab drawer
    logStep('5. timeline epoch shift');
    await openMenuDrawer();

    const epochSelect = page.locator('#drawer-epoch-select');
    await epochSelect.selectOption('archaic');
    await page.waitForTimeout(150);

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
    await page.waitForTimeout(150);

    // 6. Real visitor descent into Subterranean Machine Layer
    logStep('6. descend machine layer');
    await page.click('#drawer-machine-btn');
    await page.waitForTimeout(400);

    const subStatus = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return {
        y: eng.player.position.y,
        isSubterranean: eng.player.isSubterranean,
        mode: eng.modeManager.currentMode
      };
    });
    expect(subStatus.isSubterranean).toBe(true);
    expect(subStatus.mode).toBe('machine');
    expect(subStatus.y).toBeLessThan(-30);

    // 7. Ascend back to Semantic Surface
    logStep('7. ascend surface');
    await openMenuDrawer();
    await page.click('#drawer-machine-btn');
    await page.waitForTimeout(400);

    const surfaceStatus = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return {
        y: eng.player.position.y,
        isSubterranean: eng.player.isSubterranean,
        mode: eng.modeManager.currentMode
      };
    });
    expect(surfaceStatus.isSubterranean).toBe(false);
    expect(surfaceStatus.mode).toBe('surface');
    expect(surfaceStatus.y).toBeGreaterThanOrEqual(0);

    // 8. Ascend to Orbital Macrocosm & reveal relational graph via Dock Connections
    logStep('8. orbital connections');
    await closeMenuDrawer();
    await page.click('#dock-btn-connections');
    await page.waitForTimeout(400);

    const orbitalStatus = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return {
        y: eng.player.position.y,
        isFreeFlight: eng.player.isFreeFlight,
        graphVisible: eng.graphRenderer.isVisible,
        mode: eng.modeManager.currentMode
      };
    });
    expect(orbitalStatus.y).toBeGreaterThan(100);
    expect(orbitalStatus.isFreeFlight).toBe(true);
    expect(orbitalStatus.graphVisible).toBe(true);
    expect(orbitalStatus.mode).toBe('connections');

    // Return to surface
    await page.click('#dock-btn-connections');
    await page.waitForTimeout(300);

    // 9. Speculative Mutation Workflow: Preview -> Apply -> Undo -> Reset
    logStep('9. speculative mutation workflow');
    await openMenuDrawer();
    await page.click('#drawer-mutate-btn');
    await page.waitForSelector('#patch-input-textarea', { state: 'visible' });

    // Click "Load Fixture"
    await page.click('#mutate-fixture-btn');
    await page.waitForTimeout(200);

    const textareaContent = await page.inputValue('#patch-input-textarea');
    expect(textareaContent.length).toBeGreaterThan(20);
    expect(textareaContent).toContain('patch-nebula-compiler');

    // Step A: Preview Speculation (Does NOT mutate canonical world)
    logStep('9A. preview speculation');
    await page.click('#mutate-preview-btn');
    await page.waitForSelector('#mutation-preview-panel', { state: 'visible' });
    const previewText = await page.textContent('#mutation-preview-panel');
    expect(previewText).toContain('SPECULATIVE TOPOLOGY PREVIEW');
    expect(previewText).toContain('Nebula Compiler');

    const preApplyCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(preApplyCount).toBe(35); // Still 35 before apply!

    // Step B: Apply Mutation
    logStep('9B. apply mutation');
    await page.click('#mutate-apply-btn');
    await page.waitForTimeout(400);

    const postMutationCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(postMutationCount).toBe(36);

    // Step C: Undo Last Mutation via Menu Drawer
    logStep('9C. undo mutation');
    await openMenuDrawer();
    await page.click('#drawer-undo-btn');
    await page.waitForTimeout(300);

    const postUndoCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(postUndoCount).toBe(35);

    // Re-apply for reset verification
    await page.click('#drawer-mutate-btn');
    await page.waitForSelector('#patch-input-textarea', { state: 'visible' });
    await page.click('#mutate-fixture-btn');
    await page.waitForTimeout(100);
    await page.click('#mutate-preview-btn');
    await page.waitForSelector('#mutate-apply-btn', { state: 'visible' });
    await page.click('#mutate-apply-btn');
    await page.waitForTimeout(400);

    // Step D: Reset to Canonical World with Confirmation Modal
    logStep('9D. canonical reset confirmation');
    await openMenuDrawer();
    await page.click('#drawer-reset-btn');
    await page.waitForSelector('#confirm-ok-btn', { state: 'visible' });
    await page.click('#confirm-ok-btn');
    await page.waitForTimeout(300);

    const postResetCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(postResetCount).toBe(35);

    // 10. Visit Dexter Sanctuary (Non-Project Constant)
    logStep('10. dexter sanctuary');
    await openMenuDrawer();
    await page.click('#drawer-sanctuary-btn');
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

    // 11. Audio mute toggle via Menu Drawer
    logStep('11. audio toggle');
    await openMenuDrawer();
    const audioBtn = page.locator('#drawer-audio-btn');
    await audioBtn.click();
    await page.waitForTimeout(100);
    const audioText = await audioBtn.textContent();
    expect(audioText).toContain('Audio: Active');

    // 12. Shadow Mode Toggle
    logStep('12. shadow mode toggle');
    const shadowBtn = page.locator('#drawer-shadow-btn');
    expect(await shadowBtn.textContent()).toContain('Shadows: High');

    // Cycle to Static
    await shadowBtn.click();
    await page.waitForTimeout(100);
    expect(await shadowBtn.textContent()).toContain('Shadows: Static');

    // Cycle to Off
    await shadowBtn.click();
    await page.waitForTimeout(100);
    expect(await shadowBtn.textContent()).toContain('Shadows: Off');

    // Cycle back to High
    await shadowBtn.click();
    await page.waitForTimeout(100);
    expect(await shadowBtn.textContent()).toContain('Shadows: High');

    // Close menu drawer
    await closeMenuDrawer();

    // Verify contained universe elements & parallax starfield in engine
    logStep('13. contained universe verification');
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

    // 14. Cinematic HUD Toggle Verification
    logStep('14. cinematic HUD toggle');
    const restorePill = page.locator('#hud-restore-pill');
    await expect(restorePill).toBeAttached();

    // Toggle Cinematic Mode via keyboard shortcut [H]
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(150);
    const isHudHiddenAfterKeyH = await page.locator('#mnemonic-ui-root').evaluate(el => el.classList.contains('hud-hidden'));
    expect(isHudHiddenAfterKeyH).toBe(true);

    // Restore HUD via top pill
    await restorePill.click();
    await page.waitForTimeout(150);
    const isHudRestoredAfterPill = await page.locator('#mnemonic-ui-root').evaluate(el => !el.classList.contains('hud-hidden'));
    expect(isHudRestoredAfterPill).toBe(true);

    // 15. Verification of Next-Gen Monumental Improvements
    logStep('15. next-gen engine verification');
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

    // 16. Interactive Lab Mechanics (Glider, Katamari, Cymatics)
    logStep('16. lab mechanics verification');
    await openMenuDrawer();

    // Toggle Glider
    const gliderBtn = page.locator('#lab-glider-btn');
    await gliderBtn.click({ force: true });
    await page.waitForTimeout(100);
    const isGliderActive = await page.evaluate(() => (window as any).__mnemonicEngine.mobility.isGliderActive);
    expect(isGliderActive).toBe(true);
    await gliderBtn.click({ force: true }); // turn off

    // Toggle Katamari
    const katamariBtn = page.locator('#lab-katamari-btn');
    await katamariBtn.click({ force: true });
    await page.waitForTimeout(100);
    const isKatamariActive = await page.evaluate(() => (window as any).__mnemonicEngine.mobility.isKatamariActive);
    expect(isKatamariActive).toBe(true);
    await katamariBtn.click({ force: true }); // turn off

    // Fire Cymatics
    const cymaticsBtn = page.locator('#lab-cymatics-btn');
    await cymaticsBtn.click({ force: true });
    await page.waitForTimeout(100);
    const cymaticWavesCount = await page.evaluate(() => (window as any).__mnemonicEngine.spatialSynth.cymaticRipples.length);
    expect(cymaticWavesCount).toBeGreaterThanOrEqual(1);

    await closeMenuDrawer();

    // Visual Proof Screenshot Artifact
    logStep('17. capture screenshot artifact');
    await page.screenshot({ path: 'test-results/consolidated-visitor-journey.png' });

    // Final check for console errors
    expect(consoleErrors).toHaveLength(0);
    logStep('18. test completed successfully');
  });
});
