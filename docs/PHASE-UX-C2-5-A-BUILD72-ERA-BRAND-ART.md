# PHASE UX C2.5-A — Build 72 Era affordance + brand art

## Why this corrective build exists

Real-user smoke of Build 71 confirmed that the virtual Era queue itself worked, but three presentation claims did not hold strongly enough in the real UI:

- the contextual `Play Era` action appeared too quietly in the Era header and was easy to miss;
- the mobile carousel used wider cards and snap scrolling, but did not communicate horizontal navigation clearly enough, and recentering could run before the catalog filter had actually settled;
- the current LaunchPAD identity still used the white sidebar wordmark while new supplied SHINOBIWAN artwork was available in the repository.

Build 72 corrects those issues without changing queue semantics, catalog authority or backend contracts.

## Era UX

- `Play Era · N tracks` now lives in a dedicated **Selected Era** action strip below the carousel, immediately before the catalog filters.
- The strip appears only when exactly one Era is selected; `All eras` keeps it hidden.
- Mobile Era cards are reduced to `min(54vw, 188px)` so multiple cards/continuation remain visible.
- Explicit Previous / Next controls accompany a `Swipe or use arrows to explore eras` instruction.
- The selected mobile card receives a stronger border/background and a visible `SELECTED` badge.
- Recentering is now driven from the real `shinobi:catalog-filtered` / history state after two animation frames, using the carousel's own `scrollTo()` rather than `scrollIntoView()`. This avoids moving the page and ensures the active card exists before centering.
- Existing reconstructible `era:` queue semantics are unchanged.

## Brand artwork

The repository-provided assets are now used deliberately:

- `assets/Lune-ShinoBiWan.png` replaces the generated gold wordmark in the About card;
- the sidebar SHINOBIWAN wordmark is slightly larger and rendered with the established gold gradient mask instead of white;
- `assets/NinJa-ShinoBiWan.png` is used as subtle desktop-only character art in the unused third column of the Home hero. It is hidden below the wide-desktop breakpoint so mobile/tablet layout does not become crowded.

The original `assets/logo.png` remains the source mask for the compact gold sidebar identity and is not replaced globally.

## Safety boundary

Build 72 is frontend-only. It changes no Track Manager route, Worker source/deployment, R2 object, canonical Album schema, track manifest, `catalog/index.json`, SonicTrace runtime or Phase 7 scope.

Safety ref before the work: `safety/pre-build72-era-brand-art-20260809-2128`.
