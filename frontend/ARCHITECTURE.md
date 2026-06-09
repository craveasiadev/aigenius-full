# wp-aigenius — `mobile` branch architecture & roadmap

This document is the **single source of truth** for the refactor happening on
the `mobile` branch. Skim it before changing anything in this branch so we
don't churn or duplicate work.

## North-star

Ship an AIpreneur web app that:

1. Loads under 3 seconds on a mid-range Android phone (4G).
2. Feels native when wrapped in a Capacitor APK / iOS app — full safe-area
   handling, 44-px+ tap targets, PWA installability.
3. Replaces the legacy 2D Phaser shop **and** the heavy 3D Rapier scene
   with one **isometric view** that runs the entire experience (city → shop
   exterior → shop interior → NPCs).
4. Is informative for first-time visitors — the landing page explains what
   the product is, not a 3-second demo splash.

## Tech-stack decisions on the `mobile` branch

| Concern | Choice | Why |
|---------|--------|-----|
| Isometric renderer | **Three.js + r3f with `OrthographicCamera` locked to a 30°/45° iso angle** | Already in deps. Real depth-sorting, real shadows if wanted, easy to mix sprite-billboards with low-poly meshes, switch between exterior city ↔ interior shop by swapping scene state, not engines. PixiJS was the alternative but doubles our dep surface. |
| Physics | **None** (kinematic, hand-rolled) | Already removed Rapier on this branch. Iso games don't need real physics — just AABB collision against tile bounds. |
| Player controller | Custom kinematic (already exists in `lite-physics/LitePlayer.tsx`) — refit for iso camera | Already debugged this turn (camera bounds, A/D fix). Will port to ortho cam. |
| Asset format | **glTF for characters + custom-baked low-poly mesh primitives for tiles** generated procedurally at module init | The Quaternius avatars we already have look great in iso projection; tiles can be `BoxGeometry` + `MeshBasicMaterial` colour-coded by zone. No PNG sprite sheets to ship. |
| 2D fallback (Phaser) | **DELETED** | The whole `ShopGame.tsx` + `phaser` dep goes away. The `ShopSimulator/index.tsx` shell collapses into a thin route wrapper. |
| 3D world (Rapier/Ecctrl) | **DELETED** | `ShopGame3D.tsx` becomes the iso scene module. Rapier + Ecctrl deps drop out of `package.json`. |
| Auth | **Single sign-in page**, no role picker | The `RoleCard` selection in GeniusAuth goes away. Backend determines the role from the user record. |
| Landing | **New static landing**, not the demo | Mocked-up hero + feature carousel + "Sign in / Create account" CTA. No more "Demo 3D" route. |
| Module pages | Wrapped in `MobileLayout` + `MobileHeader` (built earlier) for consistent PWA chrome | Already exist in `src/components/mobile/`; just need to be applied. |

## Phased plan

Each phase = one focused turn. Numbered in execution order.

### Phase 0 — Cleanup ✅ (this turn)

- [x] Create `mobile` branch from `main`.
- [x] Delete 10 stale `.md` docs at repo root (kept only `README.md`).
- [x] Delete `demo.html.bak`, two `nul` artefacts (Windows shell redirect mistakes).
- [x] Delete 4 unused root-level PNGs (`building.png`, `icecreampng.png`,
      `plant (1).png`, `uman1.png` — duplicates of files still in `public/`).
- [x] Audit confirms public/`*.png` are still used by the 2D Phaser shop and
      can't be deleted until Phase 4.

### Phase 1 — New landing page (locked: parent-facing professional)

Tone: **clean cards, screenshots, testimonials** — parent decides, kid uses.
Visual reference: Khan Academy / Duolingo for Parents, not Roblox marketing.

Sections, top-to-bottom:
- Sticky nav: logo · "Features" · "How it works" · "Sign in" · "Get started"
- **Hero**: "Your child runs a real business by age 12" + sub-headline +
  primary CTA + screenshot of the shop simulator (no autoplay video).
- **Trust bar**: "Used by parents in 50+ countries" + small partner/award
  badges (placeholder squares for now until real assets land).
- **What it teaches**: 3 clean cards — Design real shop / Run marketing /
  Track P&L. Each card is icon + 2-line copy, no marketing fluff.
- **How it works**: 3 numbered steps with a matching screenshot per step.
- **Testimonials**: 3 quoted parent photos + names + child-age (synthetic
  placeholders until real reviews come in).
- **Stats**: 10,000+ young entrepreneurs · 50,000+ shops created · 4.9/5
  parent rating · 100+ skills covered.
- **FAQ accordion**: 5-6 common parent questions ("What ages?", "Is it
  safe?", "Does it teach real business or just gamify?", "Subscription?",
  "Mobile/tablet?", "Data privacy?").
- **CTA footer**: secondary "Get started free" + small print + legal links.

Demo button removed. Old `/demo` route still works during the transition
(serves the legacy `ShopGame3D` so no regression), but **no nav element
points at it** any more.

### Phase 2 — Single-page auth (locked: keep Genius-ID)

- New `pages/Login.tsx` replaces the `/login` route handler. Single form
  with a segmented control at the top: **Email | Genius ID**. Same
  password field below. Same "Sign in" button.
  - Email → existing `api.post('/auth/login', { email, password })` path.
  - Genius ID → existing `geniusLogin(geniusId, password)` path.
- Old `pages/GeniusAuth.tsx` stays on disk for one phase so the role-picker
  reference is still here while testing, but it's no longer reachable from
  any route. Deleted in Phase 4 with the rest of the dead code.
- `/register` route still serves `RegisterStudent` (the most common case);
  Teacher/Parent variants stay reachable from explicit `/register/teacher`
  and `/register/parent` URLs but aren't surfaced as nav choices on the
  new login page (one Genius-Auth-shaped link: "Don't have an account?
  Create one"). Polishing those forms is part of Phase 5.
- `MobileLayout` + `MobileHeader` chrome wraps the new pages so safe-area
  insets + 44 px tap targets land for free.

### Phase 3 — Isometric renderer foundation

Build the iso scene engine in `src/components/iso/` (replaces both
`ShopSimulator/` and `ShopSimulator3D/` over time):

```
src/components/iso/
├── IsoScene.tsx           // The Canvas wrapper + OrthographicCamera setup
├── IsoPlayer.tsx          // The avatar + kinematic controller (port LitePlayer)
├── IsoCity.tsx            // City tile grid + shop-card spawners
├── IsoShop.tsx            // A single shop tile / building
├── IsoShopInterior.tsx    // Interior view when player enters
├── IsoNPC.tsx             // Walking NPC with simple path-find
├── IsoTile.tsx            // Reusable ground tile primitive
├── tiles/
│   ├── road.ts            // Procedural road tile generation
│   ├── grass.ts           // Procedural grass tile
│   └── plaza.ts
├── npcs/
│   ├── paths.ts           // Way-point definitions for NPC walking
│   └── spawn.ts
└── index.ts               // Barrel
```

Key constraints:
- One `<Canvas>` per route; never two iso views mounted at once.
- All ground geometry shared (one `BoxGeometry`, one `MeshBasicMaterial` per
  tile colour) so the GPU draws thousands of tiles with a few hundred draw calls.
- Player avatar reused from existing GLB cache (`modelCache.ts`).
- Mobile-first sizing: viewport fills, joystick + jump button overlay the
  bottom (already built in `lite-physics/LiteJoystick.tsx`).
- Optional: `THREE.InstancedMesh` for repeated tile types if the perf gain is
  worth the complexity (defer decision until profiling Phase 3 first cut).

Visual reference (verbal): Habbo Hotel × Animal Crossing × Two Point Hospital.
A 1024×768 viewport with the city centred, the user's shop highlighted by
a gold ring, NPCs walking along the sidewalk. Tap a shop to walk towards
its door; cross the threshold to "enter" — camera transitions to the
interior iso view (same camera angle, different scene root).

### Phase 4 — Remove dead code

After Phase 3 ships a working iso scene:

- Delete `src/components/ShopSimulator/` (Phaser 2D shell + Phaser game).
- Delete `src/components/ShopSimulator3D/` *except* `modelCache.ts`,
  `performance.ts`, `textureCache.ts`, `assetPath.ts`, `lite-physics/` —
  port the useful bits into `src/components/iso/`.
- Remove from `package.json`:
  - `phaser`
  - `@react-three/rapier`
  - `@dimforge/rapier3d-compat`
  - `ecctrl`
- Update `vite.config.ts` to drop the rapier/ecctrl/phaser manualChunks rules.
- Delete now-unused public assets: `frame.png`, `plant.png`, `uman1.png`,
  `image.png`, `building.png` (currently only the 2D Phaser shop uses them).

Expected bundle reduction: **another ~4 MB of code/WASM removed**.

### Phase 5 — Module page PWA polish

Apply `MobileLayout` + `MobileHeader` + `TouchButton` to:

- `MarketingModule`, `FinancePage`, `ShopAnalyticsPage`, `MyOnlineStorePage`
- `ManageShopPage`, `PublicShopPage`, `ExploreShopsPage`, `AITokensPage`
- `SettingsPage`, `TokenHistoryPage`
- The Admin pages (`AdminLogin.tsx` already done in a previous turn)

Pattern per page (~15 min of work each):
1. Wrap root in `<MobileLayout header={<MobileHeader … />}>`.
2. Replace bare `<button>` with `<TouchButton>`.
3. Add `min-h-[44px]` to any inline tappable element (badges, chips).
4. Constrain any `absolute`-positioned modal popup to `max-h-[90vh] overflow-y-auto`.

### Phase 6 — Camera capture UX overhaul

`SelfieCapture.tsx` + `SignboardDrawing.tsx` get the same mobile-card treatment.
On desktop, the camera preview is constrained to a phone-shaped frame
(`max-w-sm mx-auto`) — never full-bleed-fullscreen — so the UX is identical
to what the user will see in the APK.

### Phase 7 — Capacitor build smoke-test

- `npx cap sync && npx cap open android` — produce a debug APK.
- Verify: status bar, safe area, splash screen, camera permission prompt,
  Filesystem plugin save (if needed for shop-image capture).

## Day-1 acceptance criteria for the iso scene (Phase 3)

You should be able to do all of these without seeing a frame drop:

1. Land on the dashboard route → city view loads in <2 s, player visible.
2. Push joystick / WASD → player walks. NPCs walking the sidewalks in
   parallel. >50 fps on a desktop GPU, >30 fps on a mid-range phone.
3. Walk up to a shop tile → tile highlights, prompt appears.
4. Cross the door threshold → scene fades to interior; back button returns
   to city.
5. Pinch/scroll-wheel zoom works in both views; never zooms below the floor.

## Branch hygiene

- Each phase is its own focused commit set on `mobile`.
- The `mobile` branch will be force-rebased before being merged back to
  `main` so the history reads as a single coherent refactor, not 30 fixup
  commits. (When that happens, only do it after explicit human confirmation —
  rebasing is destructive.)
- The old `main`-branch code stays untouched and shippable in parallel
  during the refactor.
