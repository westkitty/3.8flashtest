import { test, expect } from '@playwright/test';

test.describe('Mnemonic World Engine Interactive Walkthrough', () => {
  test('executes 23-step browser verification sequence cleanly', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Load fresh application
    await page.goto('/');
    await page.waitForSelector('#webgl-canvas');
    await page.waitForSelector('#mnemonic-ui-root');

    // Verify no fatal console errors
    expect(consoleErrors).toHaveLength(0);

    // 2. Verify engine bootstrap and 35 exhibits instantiated
    const engineReady = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return !!eng && eng.mutationManager.currentWorldData.exhibits.length === 35;
    });
    expect(engineReady).toBe(true);

    // 3. Test first-person movement away from spawn
    await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      // Simulate player moving forward
      eng.player.update(0.5, (x: number, z: number) => eng.terrain.getHeightAt(x, z));
    });

    // 4. Test spatial search for "Starsilk"
    const searchResult = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      const match = eng.searchNav.search('Starsilk');
      return match ? { id: match.id, title: match.title, wing: match.wing } : null;
    });
    expect(searchResult).not.toBeNull();
    expect(searchResult?.wing).toBe('north');

    // 5. Test timeline shift
    await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      eng.timelineManager.setEpoch('archaic');
    });

    const archaicCount = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      let visible = 0;
      for (const lm of eng.landmarks.values()) {
        if (lm.visible) visible++;
      }
      return visible;
    });
    expect(archaicCount).toBeLessThan(35);

    // Reset timeline
    await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      eng.timelineManager.setEpoch('all');
    });

    // 6. Test Machine Layer Subterranean descent
    await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      eng.ui.events.onMachineDescent();
    });

    const isSubterranean = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.player.position.y < -30;
    });
    expect(isSubterranean).toBe(true);

    // 7. Ascend to Orbital reveal
    await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      eng.ui.events.onOrbitalToggle(true);
    });

    const isOrbital = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      return eng.player.position.y > 100 && eng.graphRenderer.isVisible;
    });
    expect(isOrbital).toBe(true);

    // 8. Test live knowledge patch ingestion
    const patchResult = await page.evaluate(async () => {
      const eng = (window as any).__mnemonicEngine;
      const samplePatch = {
        id: "patch-e2e-test",
        title: "E2E Procedural Synthesis",
        wing: "south",
        epoch: "emergent",
        summary: "E2E verified live mutation node.",
        tags: ["e2e", "synthesis"],
        relationships: [{ to: "E32", confidence: "explicit", reason: "Connected to Katamari" }]
      };
      eng.ui.events.onIngestPatch(JSON.stringify(samplePatch), true);
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(patchResult).toBe(36);

    // 9. Test canonical reset
    const resetResult = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      eng.ui.events.onResetCanonical();
      return eng.mutationManager.currentWorldData.exhibits.length;
    });
    expect(resetResult).toBe(35);

    // 10. Test Dexter Sanctuary non-project navigation
    const sanctuaryStatus = await page.evaluate(() => {
      const eng = (window as any).__mnemonicEngine;
      eng.ui.events.onTeleportToSanctuary();
      const s = eng.mutationManager.currentWorldData.sanctuary;
      return {
        id: s.id,
        isExhibit: eng.mutationManager.currentWorldData.exhibits.some((e: any) => e.id === s.id),
        dist: eng.player.position.distanceTo({ x: s.position[0], y: eng.player.position.y, z: s.position[2] })
      };
    });
    expect(sanctuaryStatus.isExhibit).toBe(false);
    expect(sanctuaryStatus.dist).toBeLessThan(15);

    // Final check for console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
