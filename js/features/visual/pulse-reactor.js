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

function hash(index, seed = 0) {
  const value = Math.sin(index * 83.173 + seed * 29.731) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Pulse Reactor — readable hierarchy pass.
 *
 * Bass/kicks drive the dominant core and ring expansion. Mids articulate
 * segmented rings. Highs only reveal selected needles. Strong peaks break a
 * subset of segments/shards instead of making the entire frame noisy.
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
  const high = clamp(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.24));
  const energy = clamp(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .76) * 1.18));
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');
  const activity = clamp(energy * .7 + bass * .32 + high * .12 + kick * .24);
  const impact = clamp(Math.pow(bass, .66) * .72 + kick * .98 + peak * .24 + dynamics * .2);
  const fracture = clamp(
    Math.max(0, impact - .5) * 1.7
    + Math.max(0, bass - .64) * 1.15
    + kick * .2
    + Math.max(0, peak - .64) * .28
  );
  const drift = time * activity * .055;

  // Less simultaneous geometry than Build 53: larger, clearer gestures.
  const ringCount = mobile ? 3 : 4;
  const segmentCount = mobile ? 14 : 24;
  const spokeCount = mobile ? 10 : 18;
  const shardCount = mobile ? 4 : 7;
  const shadowCap = mobile ? 4 : 10;

  const atmosphereRadius = minSide * (.46 + impact * .1);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .04 + impact * .12));
  atmosphere.addColorStop(.38, colorWithAlpha(accent2, .018 + mid * .055));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const coreRadius = minSide * (.062 + bass * .038 + kick * .055 - fracture * .006);
  const coreGlowRadius = coreRadius * (2.25 + impact * .6);
  const coreGlow = context.createRadialGradient(cx, cy, 0, cx, cy, coreGlowRadius);
  coreGlow.addColorStop(0, colorWithAlpha('#ffffff', .76 + high * .16));
  coreGlow.addColorStop(.14, colorWithAlpha(accent2, .62 + impact * .22));
  coreGlow.addColorStop(.44, colorWithAlpha(accent, .15 + bass * .18));
  coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = coreGlow;
  context.beginPath();
  context.arc(cx, cy, coreGlowRadius, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  for (let ring = 0; ring < ringCount; ring += 1) {
    const ringProgress = ring / Math.max(1, ringCount - 1);
    const direction = ring % 2 ? -1 : 1;
    const baseRadius = minSide * (.13 + ringProgress * .22);
    const ringPulse = minSide * (impact * (.026 + ringProgress * .018) + mid * .012);
    const rotation = direction * (drift * (.55 + ringProgress * .35) + mid * .052 + impact * .018);
    const hierarchy = 1 - ringProgress * .38;

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const progress = (segment + .5) / segmentCount;
      const spectral = Math.pow(sampleAt(data, progress * (.8 + ringProgress * .18)), .64);
      const localDrive = clamp(spectral * .8 + mid * .22 + impact * hierarchy * .18 + high * ringProgress * .12);
      const personality = hash(segment, ring + 1) * 2 - 1;
      const breakMask = clamp((hash(segment, ring + 23) - .48) * 2.45);
      const segmentFracture = fracture * breakMask;
      const radialBreak = segmentFracture * minSide * (.012 + Math.abs(personality) * .02) * hierarchy;
      const tangentialBreak = personality * segmentFracture * .038;
      const span = Math.PI * 2 / segmentCount;
      const gap = span * (.12 + (1 - localDrive) * .07 + segmentFracture * .08);
      const start = segment * span + rotation + gap + tangentialBreak;
      const end = start + span * (.68 + localDrive * .17 - segmentFracture * .09);
      const radius = baseRadius + ringPulse + spectral * minSide * .012 + radialBreak;

      context.beginPath();
      context.arc(0, 0, radius, start, end);
      context.strokeStyle = colorWithAlpha(
        (segment + ring) % 3 === 0 ? accent2 : accent,
        .06 + localDrive * .42 * hierarchy + impact * .08 + segmentFracture * .1
      );
      context.lineWidth = .75 + localDrive * 2.05 + impact * hierarchy * .8;
      context.shadowColor = (segment + ring) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, localDrive * shadowCap * .65 + segmentFracture * 2);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const progress = (spoke + .5) / spokeCount;
    const spectral = Math.pow(sampleAt(data, .5 + progress * .5), .58);
    const drive = clamp(spectral * .72 + high * .4 + peak * .14);
    const visible = clamp((drive - .2) * 1.45);
    if (visible <= .02) continue;
    const personality = hash(spoke, 13) * 2 - 1;
    const angle = progress * Math.PI * 2 - Math.PI / 2 + drift * .11 + personality * fracture * .02;
    const inner = minSide * (.13 + impact * .038);
    const outer = inner + minSide * (.035 + visible * .15 + peak * .022);

    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.strokeStyle = colorWithAlpha(spoke % 4 ? accent : '#ffffff', .025 + visible * .38);
    context.lineWidth = .45 + visible * 1.35;
    context.stroke();
  }

  // One dominant impact wave; a second appears only on genuinely large peaks.
  const waveRadius = minSide * (.12 + impact * .09);
  context.beginPath();
  context.arc(0, 0, waveRadius, 0, Math.PI * 2);
  context.strokeStyle = colorWithAlpha(accent2, .025 + impact * .26);
  context.lineWidth = .7 + impact * 1.35;
  context.stroke();
  if (impact > .74) {
    context.beginPath();
    context.arc(0, 0, waveRadius + minSide * .075, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent, (impact - .74) * .42);
    context.lineWidth = .55 + impact;
    context.stroke();
  }

  if (fracture > .16) {
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 27) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .12;
      const travel = minSide * fracture * (.022 + hash(shard, 7) * .035);
      const centerRadius = coreRadius * (.48 + hash(shard, 5) * .62) + travel;
      const size = coreRadius * (.2 + hash(shard, 9) * .22) * (.5 + fracture * .65);
      const sx = Math.cos(angle) * centerRadius;
      const sy = Math.sin(angle) * centerRadius;

      context.save();
      context.translate(sx, sy);
      context.rotate(angle + personality * fracture * .62);
      context.beginPath();
      context.moveTo(-size, size * .28);
      context.lineTo(size * .68, -size * .48);
      context.lineTo(size * .4, size * .62);
      context.closePath();
      context.fillStyle = colorWithAlpha(shard % 2 ? accent : accent2, .025 + fracture * .14);
      context.fill();
      context.strokeStyle = colorWithAlpha(shard % 3 ? accent2 : '#ffffff', .08 + fracture * .4);
      context.lineWidth = .4 + fracture * .65;
      context.stroke();
      context.restore();
    }
  }

  context.restore();

  const innerCore = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  innerCore.addColorStop(0, colorWithAlpha('#ffffff', .94 - fracture * .14));
  innerCore.addColorStop(.2, colorWithAlpha(accent2, .76 + high * .12));
  innerCore.addColorStop(.62, colorWithAlpha(accent, .44 + bass * .28));
  innerCore.addColorStop(1, colorWithAlpha(accent, .015));
  context.fillStyle = innerCore;
  context.beginPath();
  context.arc(cx, cy, Math.max(1, coreRadius), 0, Math.PI * 2);
  context.fill();
}
