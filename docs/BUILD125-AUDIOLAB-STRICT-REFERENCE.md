# Build 125 — AudioLAB strict reference pass

Build: `2026.08.29.125`  
Cache: `shinobi-launchpad-v125`  
Revision: `audiolab-strict-reference`  
Release: `audiolab-strict-reference-20260829`

This pass responds directly to the supplied reference videos and removes the over-designed elements introduced in Build 124.

## Pulse Line
- One dominant cyan/white waveform centered on a dark field.
- Strong white core and broad controlled cyan bloom.
- Signed waveform motion above and below the center line.
- Stronger transient peaks with quieter sections returning to a thin line.
- Only a faint ghost/reflection remains.
- No moving flare, no ticks-as-decoration, no center text.

## Chroma Spectrum
- Dense fine bars inspired by the supplied cyan-to-magenta spectrum reference.
- 176 desktop bars / 92 mobile bars for a much finer visual grain.
- Cyan → white → violet → magenta horizontal color field.
- Subtle peak memory and restrained reflection.
- No title in the middle and no travelling luminous sweep.
- The sanctuary `Spectrum` renderer remains untouched.

## Cyber Scene
The previous poster-like Cyber Scene is discarded. The compatibility id remains `gravity-lens`, but the renderer is rebuilt as a cyber light stage inspired by the third reference:
- no humanoid/android figure;
- no central typography;
- cyan upper lighting with warm orange lower lighting;
- layered metallic/mechanical architecture rather than a character;
- diagonal light beams and high-frequency streak detail;
- orange lower-left audio spectrum and reactive energy core;
- bass/punch drive the core and structure scale, highs drive streak density.

## Guardrails
- Neon Ribbon remains the default preset.
- Spectrum remains sanctuary-protected and unchanged.
- Existing shared AudioLAB FFT/analyser only.
- No renderer-owned `requestAnimationFrame`, `setInterval`, `Math.random`, or second AudioContext.
- Historical internal ids remain stable for saved preferences and routing compatibility.
