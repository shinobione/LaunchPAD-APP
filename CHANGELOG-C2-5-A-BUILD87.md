# C2.5-A · Build 87

Release: `2026.08.10.87` · `phase-ux-c2-5-a-global-touch-polish-20260810`

## Added
- Global touch-highlight suppression for coarse/no-hover pointers.
- Preservation of existing `:focus-visible` keyboard accessibility.
- Regression guard `scripts/test-build87-global-touch.mjs`.

## Preserved
- Build 86 mobile player fixes and Favorite/Queue behavior.
- Build 85 passive Studio loop parity.
- Build 84 Show Track layout-only behavior.
- Track Video, seek, Lyrics autoscroll, MediaSession and all backend/Worker/R2 boundaries.

## Not addressed
- The brief black paint frame still observable in Collapsed Studio at a Canvas native-loop boundary is documented but intentionally not touched by this presentation-only build.
