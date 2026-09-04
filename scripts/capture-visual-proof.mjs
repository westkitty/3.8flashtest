#!/usr/bin/env node
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdirSync } from 'node:fs';

mkdirSync('validation', { recursive: true });

async function runVisualAudit() {
  console.log('Starting local Vite dev server for visual proof capture...');
  const server = await createServer({
    server: { port: 5176, host: 'localhost' },
    preview: { port: 5176 }
  });
  await server.listen();
  console.log('Vite server running at http://localhost:5176');

  const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('http://localhost:5176');
  await page.waitForSelector('#webgl-canvas');
  await page.waitForTimeout(1500);

  // 1. SPAWN / FIRST IMPRESSION
  console.log('Capturing 1. Spawn / First Impression...');
  await page.screenshot({ path: 'validation/01_spawn_first_impression.png' });

  // 2. HERO REGION / LANDMARK (Starsilk Loom & Aether-Spire)
  console.log('Capturing 2. Hero Landmark (Starsilk Loom)...');
  await page.evaluate(() => {
    const eng = window.__mnemonicEngine;
    const ex = eng.mutationManager.currentWorldData.exhibits.find(e => e.id === 'E01');
    eng.player.teleport({ x: ex.position[0], y: ex.position[1] + 6, z: ex.position[2] + 28 }, { x: ex.position[0], y: ex.position[1] + 10, z: ex.position[2] });
    eng.ui.showInspect(ex);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'validation/02_hero_landmark_starsilk.png' });

  // 3. CROSS-REGION VISTA (From Causeway looking toward The Crucible & Kinetic Foundry)
  console.log('Capturing 3. Cross-Region Vista...');
  await page.evaluate(() => {
    const eng = window.__mnemonicEngine;
    eng.ui.hideInspect();
    eng.player.teleport({ x: 0, y: 16, z: 0 }, { x: 0, y: 10, z: 90 });
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'validation/03_cross_region_vista.png' });

  // 4. ARCHAEOLOGICAL DESCENT (West Wing: E09 Reliquary of Iterative Becoming Ruin)
  console.log('Capturing 4. Archaeological Descent...');
  await page.evaluate(() => {
    const eng = window.__mnemonicEngine;
    const ex = eng.mutationManager.currentWorldData.exhibits.find(e => e.id === 'E09');
    eng.player.teleport({ x: ex.position[0], y: ex.position[1] + 4, z: ex.position[2] + 16 }, { x: ex.position[0], y: ex.position[1] + 1, z: ex.position[2] });
    eng.ui.showInspect(ex);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'validation/04_archaeological_ruin_descent.png' });

  // 5. MACHINE UNDERWORLD
  console.log('Capturing 5. Machine Underworld...');
  await page.evaluate(() => {
    const eng = window.__mnemonicEngine;
    eng.ui.events.onMachineDescent();
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'validation/05_machine_underworld.png' });

  // 6. ORBITAL GRAPH REVEAL
  console.log('Capturing 6. Orbital Graph Reveal...');
  await page.evaluate(() => {
    const eng = window.__mnemonicEngine;
    eng.ui.events.onOrbitalToggle(true);
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'validation/06_orbital_graph_reveal.png' });

  // 7. KNOWLEDGE MUTATION DURING TRANSFORMATION
  console.log('Capturing 7. Live Knowledge Mutation...');
  await page.evaluate(async () => {
    const eng = window.__mnemonicEngine;
    const samplePatch = {
      id: "patch-visual-proof",
      title: "Hyper-Dimensional Starsilk Compiler",
      wing: "north",
      epoch: "emergent",
      summary: "A live synthesized stellar macro-compiler deforming regional topology.",
      tags: ["compiler", "hyper-dimensional"],
      relationships: [{ to: "E01", confidence: "explicit", reason: "Direct cosmological bridge" }]
    };
    eng.ui.events.onIngestPatch(JSON.stringify(samplePatch), true);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'validation/07_live_knowledge_mutation.png' });

  // 8. POST-MUTATION WORLD & CAUSAL RECURSION TRACE
  console.log('Capturing 8. Post-Mutation World & Causal Trace...');
  await page.evaluate(() => {
    const eng = window.__mnemonicEngine;
    eng.ui.events.onOrbitalToggle(false);
    const ex = eng.mutationManager.currentWorldData.exhibits.find(e => e.id === 'patch-visual-proof');
    if (ex) {
      eng.player.teleport({ x: ex.position[0], y: ex.position[1] + 4, z: ex.position[2] + 20 }, { x: ex.position[0], y: ex.position[1] + 6, z: ex.position[2] });
      eng.ui.showInspect(ex);
      eng.ui.events.onTraceToMachine(ex);
    }
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'validation/08_post_mutation_causal_trace.png' });

  // Close everything cleanly
  await browser.close();
  await server.close();

  if (consoleErrors.length > 0) {
    console.error(`Browser console errors encountered (${consoleErrors.length}):`, consoleErrors);
    process.exit(1);
  } else {
    console.log('✓ All 8 visual proof views rendered and captured cleanly with 0 console errors.');
  }
}

runVisualAudit().catch(err => {
  console.error('Visual proof capture failed:', err);
  process.exit(1);
});
