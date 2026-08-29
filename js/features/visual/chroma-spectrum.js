const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const PEAKS = new WeakMap();

function rgba(color, alpha, fallback = '74, 220, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawChromaSpectrumMode(context, width, height, data, accent, accent2, time, features = {}) {
  const energy = clamp(features.energy || 0);
  const bass = clamp(features.bass || 0);
  const high = clamp(features.high || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const mobile = width < 760;
  const barCount = mobile ? 54 : 104;
  const baseline = height * .82;
  const maxHeight = height * (.52 + bass * .16 + punch * .08);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#030712');
  background.addColorStop(.48, '#06081a');
  background.addColorStop(1, '#11051a');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const atmosphere = context.createRadialGradient(width * .54, baseline * .72, 0, width * .54, baseline * .72, width * .52);
  atmosphere.addColorStop(0, rgba(accent2, .12, '198, 66, 255'));
  atmosphere.addColorStop(.38, rgba(accent, .09));
  atmosphere.addColorStop(1, rgba(accent, 0));
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  let peaks = PEAKS.get(context);
  if (!peaks || peaks.length !== barCount) {
    peaks = new Float32Array(barCount);
    PEAKS.set(context, peaks);
  }

  const gap = mobile ? 2 : 2.5;
  const totalGap = gap * (barCount - 1);
  const barWidth = Math.max(1.5, (width - totalGap) / barCount);
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, rgba(accent, .98));
  gradient.addColorStop(.32, 'rgba(112,236,255,.98)');
  gradient.addColorStop(.52, 'rgba(248,250,255,1)');
  gradient.addColorStop(.72, 'rgba(198,92,255,.98)');
  gradient.addColorStop(1, rgba(accent2, .98, '255,70,210'));

  for (let i = 0; i < barCount; i += 1) {
    const t = i / (barCount - 1);
    const index = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[index] || 0) / 255;
    const shaped = Math.pow(raw, 1.45);
    const centerLift = .78 + Math.sin(Math.PI * t) * .28;
    const target = clamp(shaped * centerLift * (1 + energy * .34));
    peaks[i] = Math.max(target, peaks[i] * (.955 - high * .02));

    const h = Math.max(2, target * maxHeight);
    const x = i * (barWidth + gap);
    const y = baseline - h;

    context.globalAlpha = .12 + energy * .08;
    context.fillStyle = gradient;
    context.fillRect(x - 1, y - 10, barWidth + 2, h + 20);

    context.globalAlpha = .98;
    context.fillStyle = gradient;
    context.fillRect(x, y, barWidth, h);

    const peakY = baseline - peaks[i] * maxHeight;
    context.globalAlpha = .8;
    context.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.95)' : gradient;
    context.fillRect(x, peakY - 3, barWidth, 2);
  }
  context.globalAlpha = 1;

  const floorGlow = context.createLinearGradient(0, baseline - 12, 0, baseline + height * .12);
  floorGlow.addColorStop(0, 'rgba(255,255,255,.18)');
  floorGlow.addColorStop(.18, rgba(accent, .12));
  floorGlow.addColorStop(1, rgba(accent2, 0, '255,70,210'));
  context.fillStyle = floorGlow;
  context.fillRect(0, baseline - 12, width, height - baseline + 12);

  context.globalAlpha = .16 + high * .08;
  context.save();
  context.translate(0, baseline * 2 + height * .045);
  context.scale(1, -0.28);
  context.fillStyle = gradient;
  for (let i = 0; i < barCount; i += 1) {
    const t = i / (barCount - 1);
    const index = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[index] || 0) / 255;
    const h = Math.max(1, Math.pow(raw, 1.5) * maxHeight * .48);
    const x = i * (barWidth + gap);
    context.fillRect(x, baseline - h, barWidth, h);
  }
  context.restore();
  context.globalAlpha = 1;

  const sweepX = ((time * (.07 + high * .06)) % 1) * width;
  const sweep = context.createLinearGradient(sweepX - width * .08, 0, sweepX + width * .08, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)');
  sweep.addColorStop(.5, `rgba(255,255,255,${.08 + high * .14})`);
  sweep.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = sweep;
  context.fillRect(sweepX - width * .08, 0, width * .16, baseline);
}
