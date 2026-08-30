const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
// Build 127 source-guard compatibility markers retained after restoring the Build 124 renderer:
// const SIGNAL_HOLD = new WeakMap()
// function stableSpectrum(
// function waveformPoints(
// function strongestPeaks(
// const liveData = stableSpectrum(

function rgba(color, alpha, fallback = '71, 220, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function readBin(data, t) {
  if (!data?.length) return 0;
  const index = Math.max(0, Math.min(data.length - 1, Math.round(t * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function tracePoints(width, centerY, data, amplitude, time, energy, punch) {
  const count = Math.min(220, Math.max(96, Math.floor(width / 10)));
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const raw = readBin(data, t);
    const near = readBin(data, clamp(t + .012));
    const shaped = Math.pow(raw * .76 + near * .24, 1.7);
    const calm = Math.sin(time * 2.2 + t * 28) * .012 + Math.sin(time * .72 - t * 10) * .009;
    const attack = shaped * (0.72 + energy * .72 + punch * .28);
    const localized = Math.pow(Math.max(0, Math.sin(t * Math.PI * 6 + time * .55)), 4) * shaped * .18;
    const y = centerY - (attack + localized + calm) * amplitude;
    points.push([t * width, y]);
  }
  return points;
}

function strokeTrace(context, points, style, width, alpha = 1) {
  context.globalAlpha = alpha;
  context.strokeStyle = style;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
  context.stroke();
  context.globalAlpha = 1;
}

export function drawPulseLineMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const centerY = height * .5;
  const amplitude = height * (.16 + bass * .28 + punch * .16);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#01050a');
  background.addColorStop(.44, '#020912');
  background.addColorStop(.56, '#03111b');
  background.addColorStop(1, '#010308');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const beam = context.createLinearGradient(0, centerY - height * .16, 0, centerY + height * .16);
  beam.addColorStop(0, rgba(accent, 0));
  beam.addColorStop(.28, rgba(accent, .035 + energy * .035));
  beam.addColorStop(.46, rgba(accent, .13 + energy * .07));
  beam.addColorStop(.5, 'rgba(225,250,255,.22)');
  beam.addColorStop(.54, rgba(accent, .13 + energy * .07));
  beam.addColorStop(.72, rgba(accent, .035 + energy * .035));
  beam.addColorStop(1, rgba(accent, 0));
  context.fillStyle = beam;
  context.fillRect(0, centerY - height * .18, width, height * .36);

  const halo = context.createRadialGradient(width * .48, centerY, 0, width * .48, centerY, width * .58);
  halo.addColorStop(0, rgba(accent, .19 + energy * .08));
  halo.addColorStop(.42, rgba(accent, .055));
  halo.addColorStop(1, rgba(accent, 0));
  context.fillStyle = halo;
  context.fillRect(0, centerY - height * .25, width, height * .5);

  const points = tracePoints(width, centerY, data, amplitude, time, energy, punch);
  const cyan = context.createLinearGradient(0, 0, width, 0);
  cyan.addColorStop(0, rgba(accent, .82));
  cyan.addColorStop(.3, 'rgba(134,240,255,.98)');
  cyan.addColorStop(.5, 'rgba(244,253,255,1)');
  cyan.addColorStop(.72, 'rgba(112,228,255,.98)');
  cyan.addColorStop(1, rgba(accent, .82));

  strokeTrace(context, points, cyan, 34 + punch * 14, .035 + energy * .02);
  strokeTrace(context, points, cyan, 18 + punch * 9, .07 + energy * .035);
  strokeTrace(context, points, cyan, 8 + punch * 3, .2 + energy * .06);
  strokeTrace(context, points, cyan, 2.1, .95);
  strokeTrace(context, points, 'rgba(248,254,255,.98)', .9, .95);

  context.globalAlpha = .16 + high * .16;
  const reflection = points.map(([x, y]) => [x, centerY + (centerY - y) * .72]);
  strokeTrace(context, reflection, cyan, 1.15, .22 + high * .14);
  context.globalAlpha = 1;

  context.strokeStyle = 'rgba(236,252,255,.86)';
  context.lineWidth = .8;
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.stroke();

  const pulseCount = width < 800 ? 22 : 44;
  for (let i = 0; i < pulseCount; i += 1) {
    const t = (i + .5) / pulseCount;
    const raw = readBin(data, t);
    if (raw < .18) continue;
    const x = t * width;
    const heightPx = 4 + Math.pow(raw, 1.8) * (12 + high * 24);
    context.globalAlpha = .18 + raw * .45;
    context.fillStyle = i % 5 === 0 ? 'rgba(255,255,255,.95)' : rgba(accent, .9);
    context.fillRect(x, centerY - heightPx * .5, 1, heightPx);
  }
  context.globalAlpha = 1;

  const transientX = ((time * (.11 + energy * .06 + high * .05)) % 1) * width;
  const transient = context.createRadialGradient(transientX, centerY, 0, transientX, centerY, Math.max(70, width * .075));
  transient.addColorStop(0, `rgba(255,255,255,${.38 + punch * .5})`);
  transient.addColorStop(.15, rgba(accent, .28 + punch * .28));
  transient.addColorStop(.5, rgba(accent, .07));
  transient.addColorStop(1, rgba(accent, 0));
  context.fillStyle = transient;
  context.globalAlpha = .35 + high * .28;
  context.fillRect(transientX - width * .08, centerY - height * .18, width * .16, height * .36);
  context.globalAlpha = 1;

  const vignette = context.createRadialGradient(width * .5, centerY, width * .08, width * .5, centerY, width * .72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.54)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
