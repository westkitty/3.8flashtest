# The Living Reliquary // Mnemonic World Engine
**Gemini 3.8 Flash + Google Antigravity Extreme Visual Experiment**

An explorable 3D mnemonic world where physical geography is synthesized directly from the semantic structure of the Museum of Me corpus (64 project identities, 35 exhibits, 6 macro-regions), fused with a self-visualizing subterranean machine city that models this repository's own TypeScript architecture in real time.

---

### Experimental Status
- **Version**: `0.1.0-experiment.0` (Explicitly pre-1.0 experimental prototype)
- **Engine**: Three.js 0.185.1, Vite, TypeScript
- **Grammar**: 5 visitor verbs (`FIND`, `EXPLORE`, `INSPECT`, `REVEAL`, `MUTATE`)

---

### Visitor Interaction Grammar

The visitor-facing experience is organized strictly around 5 core verbs:

1. **FIND**: Ranked multi-field search across titles, exhibit IDs (e.g. `E01`), project IDs (e.g. `P009`), project names, and descriptive plaques, with an in-world navigation beacon.
2. **EXPLORE**: Fluid ground and aerial traversal of 6 semantic macro-regions, supported by dynamic Katamari rolling mechanics, autonomous drone ecosystems, and procedural audio.
3. **INSPECT**: Focused contextual inspect card revealing exhibit provenance, subproject identities, relational links, text-to-speech recitation, and a direct `Trace to Machine ↓` affordance.
4. **REVEAL**: Connections Mode illuminating the catenary relational graph across the landscape, distinguishing explicit, derived, and inferred relationships with color and dash patterns.
5. **MUTATE**: Speculative mutation workflow allowing visitors to preview candidate patches, inspect topological displacement, apply changes, undo mutations, or reset to canonical baseline.

---

### Architectural Systems

1. **The Mnemonic World**:
   - 6 macro-regions transformed into physical geography (Crystalline Badlands, Kinetic Foundry, Obsidian Scriptorium, Strata of Memory, Resonant Mezzanine, Sub-Surface Substrate).
   - Conceptual similarity generates spatial proximity and elevation.
   - History leaves physical ruins, stratified geology, and excavated predecessors (such as the submerged single-file artifact at the Museum Evolution excavation).

2. **The Subterranean Machine Layer**:
   - A self-visualizing architecture layer beneath the world (Y = -25 to -45).
   - Statically maps this repository's real modules and import conduits via `scripts/build-self-map.mjs`.
   - Runtime actions (player movement, spatial search, inspection, timeline shifting, knowledge mutation) physically pulse their owning subterranean machinery.

3. **Consolidation & Performance Engine**:
   - `ModeManager`: Authoritative mutual-exclusion state machine managing `surface`, `connections`, `machine`, `tour`, `mutation-preview`, and `lab`.
   - `PerformanceGovernor`: Rolling frame duration tracking with hysteresis tiers (`high`, `balanced`, `low`) ensuring smooth 60 FPS rendering.
   - `FrameScheduler`: Frequency-bucketed subsystem dispatch (`REALTIME`, `MEDIUM`, `LOW`).
   - `LayerActivityManager`: Mode and depth gating ensuring heavy subterranean updates sleep while exploring the surface.
   - `ResourceDisposer`: Recursive GPU resource disposal for clean memory reclamation.

4. **Honest Local Presence**:
   - Powered by browser `BroadcastChannel` for tab-to-tab synchronization on the local machine.
   - Throttled position broadcasts (&le;10 Hz, &gt;0.4m movement) with synthetic peers disabled by default.

5. **Dexter Sanctuary Anchor**:
   - An ontologically separate non-project constant at `[-38, y, 38]`.
   - Outside project numbering, ranking, scoring, and semantic clustering.

---

### Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Build semantic data & self-architecture map
npm run build:data
npm run build:selfmap

# 3. Launch local dev server
npm run dev
```

Visit `http://localhost:5173` in any modern browser with WebGL support.

---

### Controls & Interface

- **W, A, S, D / Arrow Keys**: Walk across the mnemonic landscape
- **Shift**: Sprint
- **Mouse**: Look around (Click canvas for pointer-lock)
- **E**: Inspect Provenance & Architecture of the focused landmark
- **Space / C**: Vertical Ascent / Descent (Active in Aerial / Subterranean modes)
- **Primary Dock**:
  - `Find`: Open ranked search modal with keyboard navigation
  - `Reveal Connections`: Toggle orbital relational graph
  - `Guided Tour`: Begin curated architectural journey
  - `Menu / Lab`: Open drawer for Timeline Epochs, Speculative Mutation Studio, Settings, and Help
  - `Mode Indicator`: Small non-interactive pill displaying current system mode

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
