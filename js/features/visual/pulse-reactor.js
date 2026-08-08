import { beginMotionFrame, motionPhase, springChannel } from './motion-spring.js';

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
 * Pulse Reactor — motion & elasticity pass.
 *
 * Geometry stays intentionally sparse. The extra life comes from spring memory,
 * overshoot and signal-gated phase propagation rather than extra primitives.
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
  const activityTarget = clamp(energy * .7 + bass * .32 + high * .12 + kick * .24);
  const impactTarget = clamp(Math.pow(bass, .66) * .72 + kick * .98 + peak * .24 + dynamics * .2);
  const fractureTarget = clamp(
    Math.max(0, impactTarget - .5) * 1.7
    + Math.max(0, bass - .64) * 1.15
    + kick * .2
    + Math.max(0, peak - .64) * .28
  );

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 34, damping: 8.5, maximum: 1.2 });
  const bassSpring = springChannel(motion, 'bass', bass, { stiffness: 58, damping: 8.8, maximum: 1.35 });
  const midSpring = springChannel(motion, 'mid', mid, { stiffness: 40, damping: 9.5, maximum: 1.2 });
  const highSpring = springChannel(motion, 'high', high, { stiffness: 52, damping: 10.5, maximum: 1.25 });
  const impactSpring = springChannel(motion, 'impact', impactTarget, { stiffness: 72, damping: 8.1, maximum: 1.42 });
  const fractureSpring = springChannel(motion, 'fracture', fractureTarget, { stiffness: 64, damping: 9, maximum: 1.35 });

  const activity = clamp(activitySpring.value, 0, 1.15);
  const elasticBass = clamp(bassSpring.value + Math.abs(bassSpring.velocity) * .011, 0, 1.35);
  const elasticMid = clamp(midSpring.value, 0, 1.15);
  const elasticHigh = clamp(highSpring.value, 0, 1.2);
  const impact = clamp(impactSpring.value + Math.abs(impactSpring.velocity) * .014, 0, 1.45);
  const fracture = clamp(fractureSpring.value + Math.abs(fractureSpring.velocity) * .009, 0, 1.35);
  const phase = motionPhase(time, activity, .31);

  const ringCount = mobile ? 3 : 4;
  const segmentCount = mobile ? 14 : 24;
  const spokeCount = mobile ? 10 : 18;
  const shardCount = mobile ? 4 : 7;
  const shadowCap = mobile ? 4 : 10;

  const atmosphereRadius = minSide * (.46 + impact * .115);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .04 + impact * .13));
  atmosphere.addColorStop(.38, colorWithAlpha(accent2, .018 + elasticMid * .06));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const coreBreath = Math.sin(phase * 2.15) * activity * .011;
  const coreRadius = minSide * (.064 + elasticBass * .043 + impact * .035 + coreBreath - fracture * .004);
  const coreGlowRadius = coreRadius * (2.3 + impact * .68);
  const coreGlow = context.createRadialGradient(cx, cy, 0, cx, cy, coreGlowRadius);
  coreGlow.addColorStop(0, colorWithAlpha('#ffffff', .76 + elasticHigh * .16));
  coreGlow.addColorStop(.14, colorWithAlpha(accent2, .62 + impact * .22));
  coreGlow.addColorStop(.44, colorWithAlpha(accent, .15 + elasticBass * .2));
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
    const propagation = Math.sin(phase * 1.7 - ring * .82) * activity;
    const ringPulse = minSide * (
      impact * (.029 + ringProgress * .021)
      + elasticMid * .012
      + propagation * (.007 + ringProgress * .004)
    );
    const rotation = direction * (
      phase * (.21 + ringProgress * .09)
      + elasticMid * .06
      + impactSpring.velocity * .0018 * (1 - ringProgress * .35)
    );
    const hierarchy = 1 - ringProgress * .36;

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const progress = (segment + .5) / segmentCount;
      const spectral = Math.pow(sampleAt(data, progress * (.8 + ringProgress * .18)), .64);
      const localDrive = clamp(spectral * .8 + elasticMid * .22 + impact * hierarchy * .18 + elasticHigh * ringProgress * .12);
      const personality = hash(segment, ring + 1) * 2 - 1;
      const breakMask = clamp((hash(segment, ring + 23) - .48) * 2.45);
      const segmentFracture = fracture * breakMask;
      const elasticWobble = Math.sin(phase * 2.05 + segment * .43 + ring * .9) * activity * minSide * .0055 * hierarchy;
      const radialBreak = segmentFracture * minSide * (.013 + Math.abs(personality) * .022) * hierarchy;
      const tangentialBreak = personality * segmentFracture * .042 + Math.sin(phase + segment * .5) * activity * .008;
      const span = Math.PI * 2 / segmentCount;
      const gap = span * (.12 + (1 - localDrive) * .07 + segmentFracture * .08);
      const start = segment * span + rotation + gap + tangentialBreak;
      const end = start + span * (.68 + localDrive * .17 - segmentFracture * .09);
      const radius = baseRadius + ringPulse + spectral * minSide * .012 + radialBreak + elasticWobble;

      context.beginPath();
      context.arc(0, 0, radius, start, end);
      context.strokeStyle = colorWithAlpha((segment + ring) % 3 === 0 ? accent2 : accent,
        .06 + localDrive * .42 * hierarchy + impact * .08 + segmentFracture * .1);
      context.lineWidth = .75 + localDrive * 2.05 + impact * hierarchy * .82;
      context.shadowColor = (segment + ring) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, localDrive * shadowCap * .65 + segmentFracture * 2);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const progress = (spoke + .5) / spokeCount;
    const spectral = Math.pow(sampleAt(data, .5 + progress * .5), .58);
    const drive = clamp(spectral * .72 + elasticHigh * .4 + peak * .14);
    const visible = clamp((drive - .18) * 1.5);
    if (visible <= .02) continue;
    const personality = hash(spoke, 13) * 2 - 1;
    const spokeSway = Math.sin(phase * 2.4 + spoke * .72) * activity * .035;
    const angle = progress * Math.PI * 2 - Math.PI / 2 + phase * .04 + spokeSway + personality * fracture * .022;
    const inner = minSide * (.13 + impact * .04);
    const outer = inner + minSide * (.038 + visible * .17 + peak * .024 + Math.abs(highSpring.velocity) * .0015);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.strokeStyle = colorWithAlpha(spoke % 4 ? accent : '#ffffff', .025 + visible * .38);
    context.lineWidth = .45 + visible * 1.35;
    context.stroke();
  }

  const waveRadius = minSide * (.12 + impact * .105 + Math.sin(phase * 1.5) * activity * .008);
  context.beginPath();
  context.arc(0, 0, waveRadius, 0, Math.PI * 2);
  context.strokeStyle = colorWithAlpha(accent2, .025 + impact * .26);
  context.lineWidth = .7 + impact * 1.35;
  context.stroke();

  if (fracture > .16) {
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 27) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .12 + phase * personality * .03;
      const travel = minSide * fracture * (.025 + hash(shard, 7) * .04);
      const centerRadius = coreRadius * (.48 + hash(shard, 5) * .62) + travel;
      const size = coreRadius * (.2 + hash(shard, 9) * .22) * (.5 + fracture * .65);
      context.save();
      context.translate(Math.cos(angle) * centerRadius, Math.sin(angle) * centerRadius);
      context.rotate(angle + personality * fracture * .62 + impactSpring.velocity * .003);
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
  innerCore.addColorStop(.2, colorWithAlpha(accent2, .76 + elasticHigh * .12));
  innerCore.addColorStop(.62, colorWithAlpha(accent, .44 + elasticBass * .28));
  innerCore.addColorStop(1, colorWithAlpha(accent, .015));
  context.fillStyle = innerCore;
  context.beginPath();
  context.arc(cx, cy, Math.max(1, coreRadius), 0, Math.PI * 2);
  context.fill();
}
