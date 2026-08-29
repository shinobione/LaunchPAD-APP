const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

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
  const position = clamp(t) * (data.length - 1);
  const index = Math.floor(position);
  const next = Math.min(data.length - 1, index + 1);
  const mix = position - index;
  return (((data[index] || 0) * (1 - mix)) + ((data[next] || 0) * mix)) / 255;
}

function waveformPoints(width, centerY, data, amplitude, time, energy, bass, punch) {
  const count = Math.min(260, Math.max(120, Math.floor(width / 8)));
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const raw = readBin(data, t);
    const side = readBin(data, clamp(t + .01));
    const local = Math.pow(raw * .8 + side * .2, 1.8);
    const lowBias = Math.pow(1 - t, 1.5) * bass * .18;
    const transient = Math.pow(Math.max(0, Math.sin(t * Math.PI * 8 - time * .42)), 10) * punch * .22;
    const envelope = (local + lowBias + transient) * (0.8 + energy * .56);
    const signedCarrier = Math.sin(t * 34 + time * 2.05) * .72 + Math.sin(t * 79 - time * 1.16) * .28;
    const fine = Math.sin(t * 163 + time * 3.2) * local * .06;
    const quiet = Math.sin(t * 22 + time * .72) * .006;
    const y = centerY + (signedCarrier * envelope + fine + quiet) * amplitude;
    points.push([t * width, y]);
  }
  return points;
}

function strokeWave(context, points, style, width, alpha = 1) {
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
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const centerY = height * .5;
  const amplitude = height * (.13 + bass * .29 + punch * .18);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#010308');
  background.addColorStop(.42, '#02070d');
  background.addColorStop(.5, '#04111a');
  background.addColorStop(.58, '#02070d');
  background.addColorStop(1, '#010207');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const horizontalAura = context.createLinearGradient(0, centerY - height * .22, 0, centerY + height * .22);
  horizontalAura.addColorStop(0, rgba(accent, 0));
  horizontalAura.addColorStop(.32, rgba(accent, .02));
  horizontalAura.addColorStop(.45, rgba(accent, .085 + energy * .035));
  horizontalAura.addColorStop(.5, 'rgba(185,241,255,.16)');
  horizontalAura.addColorStop(.55, rgba(accent, .085 + energy * .035));
  horizontalAura.addColorStop(.68, rgba(accent, .02));
  horizontalAura.addColorStop(1, rgba(accent, 0));
  context.fillStyle = horizontalAura;
  context.fillRect(0, centerY - height * .24, width, height * .48);

  const aura = context.createRadialGradient(width * .5, centerY, 0, width * .5, centerY, width * .56);
  aura.addColorStop(0, rgba(accent, .13 + energy * .07));
  aura.addColorStop(.34, rgba(accent, .06));
  aura.addColorStop(.76, rgba(accent, .015));
  aura.addColorStop(1, rgba(accent, 0));
  context.fillStyle = aura;
  context.fillRect(0, centerY - height * .34, width, height * .68);

  const points = waveformPoints(width, centerY, data, amplitude, time, energy, bass, punch);
  const color = context.createLinearGradient(0, 0, width, 0);
  color.addColorStop(0, rgba(accent, .86));
  color.addColorStop(.22, 'rgba(86,226,255,.98)');
  color.addColorStop(.5, 'rgba(226,249,255,1)');
  color.addColorStop(.78, 'rgba(81,222,255,.98)');
  color.addColorStop(1, rgba(accent, .84));

  strokeWave(context, points, color, 40 + punch * 18, .024 + energy * .012);
  strokeWave(context, points, color, 24 + punch * 12, .045 + energy * .02);
  strokeWave(context, points, color, 12 + punch * 6, .10 + energy * .035);
  strokeWave(context, points, color, 5.5 + punch * 1.8, .28 + energy * .08);
  strokeWave(context, points, color, 2.0, .96);
  strokeWave(context, points, 'rgba(244,253,255,.99)', .72, .98);

  const ghost = points.map(([x, y]) => [x, centerY + (centerY - y) * .34]);
  strokeWave(context, ghost, color, 1.05, .10 + high * .08);

  const baseline = context.createLinearGradient(0, 0, width, 0);
  baseline.addColorStop(0, 'rgba(126,226,255,0)');
  baseline.addColorStop(.1, rgba(accent, .38));
  baseline.addColorStop(.5, 'rgba(236,252,255,.83)');
  baseline.addColorStop(.9, rgba(accent, .38));
  baseline.addColorStop(1, 'rgba(126,226,255,0)');
  context.strokeStyle = baseline;
  context.lineWidth = .65;
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.stroke();

  const vignette = context.createRadialGradient(width * .5, centerY, width * .1, width * .5, centerY, width * .74);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.58)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
