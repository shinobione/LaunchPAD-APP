# Build 127 — AudioLAB reactivity correction + Aurora Field

Build: `2026.08.29.127`
Release: `audiolab-reactivity-aurora-20260829`
Cache: `shinobi-launchpad-v127`

This corrective pass follows the Build 126 review and screen recording.

- Prism Tunnel is rejected and its active compatibility slot now renders **Aurora Field**, a simpler full-canvas layered light field with no tunnel geometry, central object, typography or travelling sweep.
- The historical internal id `gravity-lens` and historical renderer export name are retained for saved-setting/source compatibility.
- Pulse Line keeps the approved visual direction but now has a short analyser-dropout hold/decay so a transient zero FFT frame cannot instantly collapse the waveform to a flat line while playback continues.
- Chroma Spectrum remains on its Build 126 visual direction.
- Neon Ribbon stays the default and the sanctuary-protected Spectrum renderer remains unchanged.
- Shared AudioLAB analyser only; no second AudioContext, renderer-owned requestAnimationFrame, setInterval, Math.random, shapeMotionTarget or visualizer typography.
