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

function waveformPoints(width, centerY, data, amplitude, time, energy, bass, mid, high, punch) {
  const count = Math.min(300, Math.max(140, Math.floor(width / 7)));
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const a = readBin(data, t);
    const b = readBin(data, clamp(t + .008));
    const c = readBin(data, clamp(t - .008));
    const raw = a * .58 + b * .21 + c * .21;
    const shaped = Math.pow(raw, 1.72);
    const lowBias = Math.pow(1 - t, 1.65) * bass * .16;
    const transientWindow = Math.pow(Math.max(0, Math.sin(t * Math.PI * 9 - time * .58)), 12);
    const transient = transientWindow * punch * (.16 + shaped * .18);
    const envelope = clamp((shaped + lowBias + transient) * (.82 + energy * .62));

    const primary = Math.sin(t * 31 + time * (1.7 + energy * .45));
    const secondary = Math.sin(t * 71 - time * (1.02 + mid * .55));
    const tertiary = Math.sin(t * 143 + time * (2.8 + high * 1.5));
    const carrier = primary * .64 + secondary * .26 + tertiary * .10;
    const asym = Math.sin(t * 5.4 + time * .34) * mid * .1;
    const micro = Math.sin(t * 197 - time * 3.4) * high * shaped * .045;
    const quiet = Math.sin(t * 18 + time * .63) * .0045;
    const y = centerY + (carrier * envelope + asym * shaped + micro + quiet) * amplitude;
    points.push([t * width, y, shaped]);
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

function strongestPeaks(points, count = 7) {
  return [...points]
    .filter((_, index) => index % 5 === 0)
    .sort((a, b) => b[2] - a[2])
    .slice(0, count);
}

export function drawPulseLineMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const centerY = height * .5;
  const amplitude = height * (.145 + bass * .31 + punch * .21);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#010207');
  background.addColorStop(.38, '#02070e');
  background.addColorStop(.5, '#04131d');
  background.addColorStop(.62, '#02070e');
  background.addColorStop(1, '#010106');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const horizontalAura = context.createLinearGradient(0, centerY - height * .26, 0, centerY + height * .26);
  horizontalAura.addColorStop(0, rgba(accent, 0));
  horizontalAura.addColorStop(.34, rgba(accent, .016));
  horizontalAura.addColorStop(.45, rgba(accent, .07 + energy * .045));
  horizontalAura.addColorStop(.5, 'rgba(210,247,255,.16)');
  horizontalAura.addColorStop(.55, rgba(accent, .07 + energy * .045));
  horizontalAura.addColorStop(.66, rgba(accent, .016));
  horizontalAura.addColorStop(1, rgba(accent, 0));
  context.fillStyle = horizontalAura;
  context.fillRect(0, centerY - height * .27, width, height * .54);

  const aura = context.createRadialGradient(width * .5, centerY, 0, width * .5, centerY, width * .57);
  aura.addColorStop(0, rgba(accent, .13 + energy * .07));
  aura.addColorStop(.28, rgba(accent, .065));
  aura.addColorStop(.72, rgba(accent, .014));
  aura.addColorStop(1, rgba(accent, 0));
  context.fillStyle = aura;
  context.fillRect(0, centerY - height * .36, width, height * .72);

  const points = waveformPoints(width, centerY, data, amplitude, time, energy, bass, mid, high, punch);
  const color = context.createLinearGradient(0, 0, width, 0);
  color.addColorStop(0, rgba(accent, .88));
  color.addColorStop(.18, 'rgba(65,222,255,.99)');
  color.addColorStop(.42, 'rgba(143,241,255,1)');
  color.addColorStop(.5, 'rgba(246,254,255,1)');
  color.addColorStop(.58, 'rgba(145,241,255,1)');
  color.addColorStop(.82, 'rgba(64,218,255,.99)');
  color.addColorStop(1, rgba(accent, .86));

  strokeWave(context, points, color, 54 + punch * 24, .015 + energy * .01);
  strokeWave(context, points, color, 34 + punch * 18, .028 + energy * .018);
  strokeWave(context, points, color, 20 + punch * 11, .055 + energy * .025);
  strokeWave(context, points, color, 10 + punch * 5, .13 + energy * .045);
  strokeWave(context, points, color, 4.8 + punch * 1.8, .34 + energy * .08);
  strokeWave(context, points, color, 1.8, .98);
  strokeWave(context, points, 'rgba(248,254,255,.995)', .62, 1);

  const ghost = points.map(([x, y, shaped]) => [x, centerY + (centerY - y) * .28, shaped]);
  strokeWave(context, ghost, color, 1.15, .08 + high * .07);

  const echo = points.map(([x, y, shaped]) => [x, centerY + (y - centerY) * .72 + Math.sin(x * .018 + time * 1.2) * 2, shaped]);
  strokeWave(context, echo, rgba(accent2 || accent, .55), .9, .055 + mid * .045);

  strongestPeaks(points, width < 800 ? 4 : 7).forEach(([x, y, shaped], index) => {
    if (shaped < .22) return;
    const radius = 10 + shaped * (26 + punch * 18);
    const bloom = context.createRadialGradient(x, y, 0, x, y, radius);
    bloom.addColorStop(0, `rgba(255,255,255,${.12 + shaped * .18})`);
    bloom.addColorStop(.18, rgba(accent, .12 + shaped * .16));
    bloom.addColorStop(1, rgba(accent, 0));
    context.fillStyle = bloom;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    if (index % 2 === 0) {
      context.globalAlpha = .18 + high * .22;
      context.strokeStyle = 'rgba(235,252,255,.85)';
      context.lineWidth = .7;
      context.beginPath();
      context.moveTo(x, y - 5 - shaped * 8);
      context.lineTo(x, y + 5 + shaped * 8);
      context.stroke();
      context.globalAlpha = 1;
    }
  });

  const baseline = context.createLinearGradient(0, 0, width, 0);
  baseline.addColorStop(0, 'rgba(126,226,255,0)');
  baseline.addColorStop(.1, rgba(accent, .28));
  baseline.addColorStop(.5, 'rgba(236,252,255,.72)');
  baseline.addColorStop(.9, rgba(accent, .28));
  baseline.addColorStop(1, 'rgba(126,226,255,0)');
  context.strokeStyle = baseline;
  context.lineWidth = .55;
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
