const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function rgba(color, alpha, fallback = '77, 226, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sample(data, t) {
  if (!data?.length) return 0;
  const position = clamp(t) * (data.length - 1);
  const index = Math.floor(position);
  const next = Math.min(data.length - 1, index + 1);
  const mix = position - index;
  return (((data[index] || 0) * (1 - mix)) + ((data[next] || 0) * mix)) / 255;
}

function polygonPoint(cx, cy, radiusX, radiusY, sides, index, rotation, wobble) {
  const angle = rotation + index / sides * Math.PI * 2;
  const warp = 1 + Math.sin(angle * 3 + wobble) * .055 + Math.cos(angle * 2 - wobble * .7) * .035;
  return [
    cx + Math.cos(angle) * radiusX * warp,
    cy + Math.sin(angle) * radiusY * warp
  ];
}

function traceFrame(context, cx, cy, radiusX, radiusY, sides, rotation, wobble, style, lineWidth, alpha) {
  context.globalAlpha = alpha;
  context.strokeStyle = style;
  context.lineWidth = lineWidth;
  context.lineJoin = 'round';
  context.beginPath();
  for (let i = 0; i <= sides; i += 1) {
    const [x, y] = polygonPoint(cx, cy, radiusX, radiusY, sides, i % sides, rotation, wobble);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.globalAlpha = 1;
}

function depthFrame(context, width, height, depth, index, time, features, accent, accent2) {
  const { bass, mid, high, energy, punch } = features;
  const perspective = Math.pow(depth, 1.85);
  const vanishingX = width * (.5 + Math.sin(time * .21) * .055 + mid * .022);
  const vanishingY = height * (.47 + Math.cos(time * .17) * .025 - bass * .018);
  const nearScale = .18 + perspective * 1.18;
  const breathing = 1 + bass * .11 + punch * .10 * perspective;
  const radiusX = width * .44 * nearScale * breathing;
  const radiusY = height * .39 * nearScale * (1 + mid * .06);
  const driftX = Math.sin(index * 1.7 + time * .35) * width * .018 * perspective;
  const driftY = Math.cos(index * 1.21 - time * .28) * height * .018 * perspective;
  const cx = vanishingX + driftX;
  const cy = vanishingY + driftY;
  const rotation = time * (.07 + energy * .035) * (index % 2 ? 1 : -1) + index * .18 + mid * .15;
  const wobble = time * (.62 + high * .4) + index * .73;
  const sides = width < 760 ? 5 : 6;

  const frameColor = context.createLinearGradient(cx - radiusX, cy, cx + radiusX, cy);
  frameColor.addColorStop(0, rgba(accent, .88));
  frameColor.addColorStop(.42, 'rgba(218,251,255,.98)');
  frameColor.addColorStop(.58, 'rgba(244,248,255,.98)');
  frameColor.addColorStop(1, rgba(accent2 || accent, .88, '221,82,255'));

  const glowAlpha = .025 + perspective * .09 + energy * .035;
  traceFrame(context, cx, cy, radiusX, radiusY, sides, rotation, wobble, frameColor, 18 + perspective * 18, glowAlpha);
  traceFrame(context, cx, cy, radiusX, radiusY, sides, rotation, wobble, frameColor, 7 + perspective * 6, .08 + perspective * .16);
  traceFrame(context, cx, cy, radiusX, radiusY, sides, rotation, wobble, frameColor, 1.2 + perspective * 1.2, .45 + perspective * .48);
  traceFrame(context, cx, cy, radiusX, radiusY, sides, rotation, wobble, 'rgba(248,254,255,.98)', .42 + perspective * .28, .54 + perspective * .32);

  return { cx, cy, radiusX, radiusY, sides, rotation, wobble, perspective };
}

function drawConnectorRibs(context, previous, current, accent, accent2, high) {
  if (!previous || !current) return;
  const sides = Math.min(previous.sides, current.sides);
  for (let i = 0; i < sides; i += 1) {
    const p1 = polygonPoint(previous.cx, previous.cy, previous.radiusX, previous.radiusY, previous.sides, i, previous.rotation, previous.wobble);
    const p2 = polygonPoint(current.cx, current.cy, current.radiusX, current.radiusY, current.sides, i, current.rotation, current.wobble);
    const gradient = context.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
    gradient.addColorStop(0, rgba(accent, .06 + high * .045));
    gradient.addColorStop(.5, 'rgba(240,252,255,.08)');
    gradient.addColorStop(1, rgba(accent2 || accent, .06 + high * .045, '221,82,255'));
    context.strokeStyle = gradient;
    context.globalAlpha = .18 + current.perspective * .16;
    context.lineWidth = .6 + current.perspective * .6;
    context.beginPath();
    context.moveTo(p1[0], p1[1]);
    context.lineTo(p2[0], p2[1]);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawSpectralSparks(context, width, height, data, time, high, energy, accent, accent2) {
  const count = width < 760 ? 20 : 38;
  for (let i = 0; i < count; i += 1) {
    const t = (i + .5) / count;
    const raw = sample(data, t);
    if (raw < .22) continue;
    const phase = i * 2.37 + time * (.7 + energy * .5);
    const x = width * (.5 + Math.sin(phase * .41) * (.12 + t * .42));
    const y = height * (.5 + Math.cos(phase * .53) * (.08 + t * .34));
    const len = 4 + raw * (12 + high * 18);
    context.globalAlpha = .14 + raw * .35 + high * .12;
    context.strokeStyle = i % 3 === 0 ? rgba(accent2 || accent, .9, '221,82,255') : rgba(accent, .9);
    context.lineWidth = i % 7 === 0 ? 1.6 : .8;
    context.beginPath();
    context.moveTo(x - len * .6, y + len * .16);
    context.lineTo(x + len * .6, y - len * .16);
    context.stroke();
  }
  context.globalAlpha = 1;
}

export function drawPrismTunnelMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#02040a');
  background.addColorStop(.28, '#05101a');
  background.addColorStop(.52, '#08091b');
  background.addColorStop(.78, '#12091f');
  background.addColorStop(1, '#040208');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const centerGlow = context.createRadialGradient(width * .5, height * .48, 0, width * .5, height * .48, width * .5);
  centerGlow.addColorStop(0, rgba(accent, .13 + energy * .08));
  centerGlow.addColorStop(.28, rgba(accent2 || accent, .05 + mid * .025, '221,82,255'));
  centerGlow.addColorStop(.65, rgba(accent, .016));
  centerGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = centerGlow;
  context.fillRect(0, 0, width, height);

  const frameCount = width < 760 ? 9 : 13;
  const speed = .085 + energy * .11 + bass * .025;
  let previous = null;
  for (let i = 0; i < frameCount; i += 1) {
    const normalized = (i / frameCount + time * speed) % 1;
    const depth = .05 + normalized * .95;
    const current = depthFrame(
      context,
      width,
      height,
      depth,
      i,
      time,
      { bass, mid, high, energy, punch },
      accent,
      accent2
    );
    drawConnectorRibs(context, previous, current, accent, accent2, high);
    previous = current;
  }

  const pulsePhase = (time * (.58 + energy * .34)) % 1;
  const pulseDepth = clamp(pulsePhase + punch * .12);
  const pulse = depthFrame(
    context,
    width,
    height,
    pulseDepth,
    frameCount + 2,
    time + .17,
    { bass: clamp(bass + punch * .35), mid, high, energy: clamp(energy + punch * .3), punch },
    accent,
    accent2
  );
  traceFrame(
    context,
    pulse.cx,
    pulse.cy,
    pulse.radiusX * 1.02,
    pulse.radiusY * 1.02,
    pulse.sides,
    pulse.rotation,
    pulse.wobble,
    'rgba(255,255,255,.98)',
    .7 + punch * 1.6,
    .08 + punch * .42
  );

  drawSpectralSparks(context, width, height, data, time, high, energy, accent, accent2);

  const floor = context.createLinearGradient(0, height * .72, 0, height);
  floor.addColorStop(0, 'rgba(255,255,255,0)');
  floor.addColorStop(.72, rgba(accent2 || accent, .025 + bass * .02, '221,82,255'));
  floor.addColorStop(1, rgba(accent, .045 + energy * .025));
  context.fillStyle = floor;
  context.fillRect(0, height * .68, width, height * .32);

  const vignette = context.createRadialGradient(width * .5, height * .5, width * .08, width * .5, height * .5, width * .74);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.58)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
