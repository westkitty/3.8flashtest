# The Living Reliquary // Mnemonic World Engine
**Gemini 3.8 Flash + Google Antigravity Extreme Visual Experiment**

An explorable 3D mnemonic world where physical geography is synthesized directly from the semantic structure of the Museum of Me corpus (64 project identities, 35 exhibits, 6 macro-regions), fused with a self-visualizing subterranean machine city that models this repository's own TypeScript architecture in real time.

---

### Experimental Status
- **Version**: `0.1.0-experiment.0` (Explicitly pre-1.0 experimental prototype)
- **Engine**: Three.js 0.185.1, Vite, TypeScript

---

### Key Architectural Systems

1. **The Mnemonic World**:
   - 6 macro-regions transformed into physical geography (e.g. Crystalline Badlands & Aether-Spire, The Crucible & Kinetic Foundry, Obsidian Scriptorium, Strata of Memory, Resonant Mezzanine, Sub-Surface Substrate).
   - Conceptual similarity generates spatial proximity and elevation.
   - History leaves physical ruins, stratified geology, and excavated predecessors (such as the submerged single-file artifact at the Museum Evolution excavation).

2. **The Subterranean Machine Layer**:
   - A self-visualizing architecture layer beneath the world (Y = -25 to -45).
   - Statically maps this repository's real modules and import conduits via `scripts/build-self-map.mjs`.
   - Runtime actions (player movement, spatial search, inspection, timeline shifting, knowledge mutation) physically pulse their owning subterranean machinery.

3. **In-World Knowledge Mutation**:
   - Ingests structured JSON knowledge patches or freeform Markdown notes directly into the running simulation.
   - Automatically differentiates **EXPLICIT / SOURCE-GROUNDED** links from **INFERRED / LOW-CONFIDENCE** connections.
   - Animate topological growth, sprouting emergent spires and glowing relational bridges.
   - One-click reset restores the canonical world.

4. **Dexter Sanctuary Anchor**:
   - An ontologically separate non-project constant at `[-38, y, 38]`.
   - Outside project numbering, ranking, scoring, and semantic clustering.

5. **Orbital Perspective & Graph Reveal**:
   - Switch from first-person ground exploration to a grand orbital view.
   - Illuminates the hidden semantic graph across the entire landscape with catenary relation arcs.

---

### Quickstart

```bash
# 1. Install dependencies (or use existing local packages)
npm install

# 2. Build semantic data & self-architecture map
npm run build:data
npm run build:selfmap

# 3. Launch local dev server
npm run dev
```

Visit `http://localhost:5173` in any modern browser with WebGL support.

---

### Controls

- **W, A, S, D / Arrow Keys**: Walk across the mnemonic landscape
- **Shift**: Sprint
- **Mouse**: Look around (Click canvas for pointer-lock)
- **E**: Inspect Provenance & Architecture of the focused landmark
- **Space / C**: Vertical Ascent / Descent (Active in Orbital & Freeflight modes)
- **HUD Buttons**:
  - *Enter Orbital / Reveal Graph*: Rise into high orbit and unveil semantic arcs
  - *Descend to Machine Layer*: Descend into the subterranean software city
  - *Visit Dexter Sanctuary*: Navigate to the fixed non-project sanctuary
  - *Ingest Knowledge Patch*: Open the live in-world knowledge mutation modal
  - *Reset to Canonical World*: Restore the original baseline topology

---

### Verification & Testing

```bash
# Run unit tests
npm test

# Run privacy scanner (Strict RFC1918, credential, and path guard)
npm run validate:privacy

# TypeScript compilation check
npm run typecheck

# Lint check
npm run lint

# Production build
npm run build
```

---

### Privacy Boundary

This repository enforces strict sanitization via `scripts/validate-privacy.mjs`. No private filesystem paths, credentials, tokens, IP addresses, or internal hostnames are committed. All addresses and operational names are synthetic examples authored exclusively for this experiment.
