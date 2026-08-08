function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function colorWithAlpha(color, alpha) {
  const value = clamp(alpha);
  const six = /^#([0-9a-f]{6})$/i.exec(color);
  if (six) {
    const number = Number.parseInt(six[1], 16);
    return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${value})`;
  }
  const three = /^#([0-9a-f]{3})$/i.exec(color);
  if (three) {
    const [red, green, blue] = three[1].split('').map(part => Number.parseInt(part + part, 16));
    return `rgba(${red},${green},${blue},${value})`;
  }
  return color;
}

function average(data, start, end) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  let total = 0;
  for (let index = from; index < to; index += 1) total += data[index] || 0;
  return total / Math.max(1, to - from) / 255;
}

function sampleAt(data, progress) {
  if (!data?.length) return 0;
  const normalized = ((progress % 1) + 1) % 1;
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(normalized * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function feature(features, name) {
  const value = Number(features?.[name]);
  return Number.isFinite(value) ? clamp(value) : 0;
}

function mobileVisualDevice(width) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

/**
 * Pulse Reactor
 *
 * A signal-first reactor visual: bass/kicks compress and expand the core,
 * mids open segmented orbital rings, highs fire radial needles. Time only
 * adds a tiny energy-gated drift, so silence produces a stable image.
 */
export function drawPulseReactorMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  const rawBass = average(data, 0, data.length * .16);
  const rawMid = average(data, data.length * .16, data.length * .58);
  const rawHigh = average(data, data.length * .58, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = clamp(Math.max(feature(features, 'bass'), Math.pow(rawBass, .7) * 1.26));
  const mid = clamp(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.18));
  const high = clamp(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.26));
  const energy = clamp(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .76) * 1.2));
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');
  const activity = clamp(energy * .72 + bass * .3 + high * .18 + kick * .22);
  const impact = clamp(Math.pow(bass, .66) * .72 + kick * .95 + peak * .26 + dynamics * .22);
  const drift = time * activity * .075;

  const ringCount = mobile ? 3 : 5;
  const segmentCount = mobile ? 18 : 32;
  const spokeCount = mobile ? 16 : 30;
  const shadowCap = mobile ? 5 : 13;

  const atmosphereRadius = minSide * (.48 + impact * .08);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .055 + impact * .13));
  atmosphere.addColorStop(.34, colorWithAlpha(accent2, .025 + mid * .08));
  atmosphere.addColorStop(.72, colorWithAlpha(accent, .012 + high * .04));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const coreRadius = minSide * (.048 + bass * .034 + kick * .052 + peak * .018);
  const coreGlowRadius = coreRadius * (2.7 + impact * .75);
  const coreGlow = context.createRadialGradient(cx, cy, 0, cx, cy, coreGlowRadius);
  coreGlow.addColorStop(0, colorWithAlpha('#ffffff', .72 + high * .22));
  coreGlow.addColorStop(.12, colorWithAlpha(accent2, .68 + impact * .24));
  coreGlow.addColorStop(.38, colorWithAlpha(accent, .2 + bass * .2));
  coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = coreGlow;
  context.beginPath();
  context.arc(cx, cy, coreGlowRadius, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  for (let ring = 0; ring < ringCount; ring += 1) {
    const direction = ring % 2 ? -1 : 1;
    const ringProgress = ring / Math.max(1, ringCount - 1);
    const baseRadius = minSide * (.105 + ringProgress * .205);
    const ringPulse = minSide * (impact * (.022 + ringProgress * .018) + mid * .012);
    const radius = baseRadius + ringPulse;
    const rotation = direction * (drift * (.7 + ringProgress * .55) + mid * .075 + impact * .028);

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const progress = (segment + .5) / segmentCount;
      const spectral = Math.pow(sampleAt(data, progress * (.78 + ringProgress * .22)), .64);
      const localDrive = clamp(spectral * .82 + mid * .24 + high * ringProgress * .22 + impact * (1 - ringProgress) * .2);
      const gap = .022 + (1 - localDrive) * .018;
      const segmentSpan = Math.PI * 2 / segmentCount;
      const start = segment * segmentSpan + rotation + gap;
      const end = start + segmentSpan * (.58 + localDrive * .34) - gap;

      context.beginPath();
      context.arc(0, 0, radius + spectral * minSide * .013, start, end);
      context.strokeStyle = colorWithAlpha(
        (segment + ring) % 2 ? accent2 : accent,
        .07 + localDrive * .52 + impact * .11
      );
      context.lineWidth = .7 + localDrive * 2.35 + (1 - ringProgress) * impact * 1.05;
      context.shadowColor = (segment + ring) % 2 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, 1.5 + localDrive * shadowCap);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const progress = (spoke + .5) / spokeCount;
    const highSample = Math.pow(sampleAt(data, .46 + progress * .54), .58);
    const midSample = Math.pow(sampleAt(data, .18 + progress * .42), .7);
    const drive = clamp(highSample * .82 + high * .42 + midSample * .2 + kick * .13);
    const angle = progress * Math.PI * 2 - Math.PI / 2 + drift * .18;
    const inner = minSide * (.105 + impact * .035);
    const outer = inner + minSide * (.035 + drive * .17 + peak * .025);

    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.strokeStyle = colorWithAlpha(spoke % 3 ? accent : '#ffffff', .035 + drive * .48);
    context.lineWidth = .45 + drive * 1.55;
    context.stroke();
  }

  for (let wave = 0; wave < 2; wave += 1) {
    const waveRadius = minSide * (.09 + wave * .075 + impact * (.065 + wave * .022));
    context.beginPath();
    context.arc(0, 0, waveRadius, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(wave ? accent2 : accent, .03 + impact * (.26 - wave * .06));
    context.lineWidth = .55 + impact * (1.55 - wave * .3);
    context.stroke();
  }

  context.restore();

  const innerCore = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  innerCore.addColorStop(0, colorWithAlpha('#ffffff', .92));
  innerCore.addColorStop(.18, colorWithAlpha(accent2, .78 + high * .16));
  innerCore.addColorStop(.58, colorWithAlpha(accent, .48 + bass * .28));
  innerCore.addColorStop(1, colorWithAlpha(accent, .02));
  context.fillStyle = innerCore;
  context.beginPath();
  context.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  context.fill();
}
