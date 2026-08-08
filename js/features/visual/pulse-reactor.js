import { beginMotionFrame, motionPhase, shapeMotionTarget, springChannel } from './motion-spring.js';

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
 * Pulse Reactor — dynamic-breathing pass.
 *
 * Build 56 reserves peak headroom instead of letting boosted FFT features pin
 * the reactor open. Low/mid activity stays visible, while signed spring
 * velocity adds recoil so the structure moves through the beat instead of only
 * expanding on it.
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

  const bass = shapeMotionTarget(Math.max(feature(features, 'bass'), Math.pow(rawBass, .7) * 1.16), { ceiling: .86 });
  const mid = shapeMotionTarget(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.1), { ceiling: .84 });
  const high = shapeMotionTarget(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.12), { ceiling: .86 });
  const energy = shapeMotionTarget(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .76) * 1.1), { ceiling: .84 });
  const kick = shapeMotionTarget(feature(features, 'kick'), { knee: .5, ceiling: .9, lowExponent: .88 });
  const peak = shapeMotionTarget(feature(features, 'peak'), { knee: .58, ceiling: .88 });
  const dynamics = shapeMotionTarget(feature(features, 'dynamics'), { ceiling: .86 });

  const activityTarget = shapeMotionTarget(energy * .62 + bass * .25 + mid * .13 + high * .1 + kick * .13, { ceiling: .82 });
  const impactTarget = shapeMotionTarget(Math.pow(bass, .72) * .48 + kick * .58 + peak * .16 + dynamics * .12, { knee: .52, ceiling: .86 });
  const fractureTarget = shapeMotionTarget(
    Math.max(0, impactTarget - .48) * 1.25
    + Math.max(0, bass - .58) * .72
    + kick * .14
    + Math.max(0, peak - .62) * .18,
    { knee: .46, ceiling: .76 }
  );

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 24, damping: 7.2, maximum: 1 });
  const bassSpring = springChannel(motion, 'bass', bass, { stiffness: 38, damping: 7.3, maximum: 1.05 });
  const midSpring = springChannel(motion, 'mid', mid, { stiffness: 28, damping: 7.8, maximum: 1 });
  const highSpring = springChannel(motion, 'high', high, { stiffness: 36, damping: 8.2, maximum: 1.02 });
  const impactSpring = springChannel(motion, 'impact', impactTarget, { stiffness: 44, damping: 6.9, maximum: 1.08 });
  const fractureSpring = springChannel(motion, 'fracture', fractureTarget, { stiffness: 38, damping: 7.6, maximum: .95 });

  const activity = clamp(activitySpring.value, 0, 1);
  const bassMomentum = clamp(bassSpring.velocity * .009, -.12, .12);
  const impactMomentum = clamp(impactSpring.velocity * .008, -.14, .14);
  const fractureMomentum = clamp(fractureSpring.velocity * .006, -.09, .09);
  const elasticBass = clamp(bassSpring.value + bassMomentum, 0, 1.02);
  const elasticMid = clamp(midSpring.value, 0, 1);
  const elasticHigh = clamp(highSpring.value, 0, 1);
  const impact = clamp(impactSpring.value + impactMomentum, 0, 1.05);
  const fracture = clamp(fractureSpring.value + fractureMomentum, 0, .95);
  const phase = motionPhase(time, activity, .34);

  const ringCount = mobile ? 3 : 4;
  const segmentCount = mobile ? 14 : 24;
  const spokeCount = mobile ? 10 : 18;
  const shardCount = mobile ? 4 : 7;
  const shadowCap = mobile ? 4 : 10;

  const atmosphereRadius = minSide * (.46 + impact * .09);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .035 + impact * .1));
  atmosphere.addColorStop(.38, colorWithAlpha(accent2, .016 + elasticMid * .05));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const coreBreath = Math.sin(phase * 2.25) * Math.pow(activity, .72) * .017 + bassMomentum * .018;
  const coreRadius = minSide * (.064 + elasticBass * .035 + impact * .024 + coreBreath - fracture * .003);
  const coreGlowRadius = coreRadius * (2.25 + impact * .5);
  const coreGlow = context.createRadialGradient(cx, cy, 0, cx, cy, coreGlowRadius);
  coreGlow.addColorStop(0, colorWithAlpha('#ffffff', .72 + elasticHigh * .15));
  coreGlow.addColorStop(.14, colorWithAlpha(accent2, .58 + impact * .19));
  coreGlow.addColorStop(.44, colorWithAlpha(accent, .14 + elasticBass * .17));
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
    const propagation = Math.sin(phase * 1.85 - ring * .86) * Math.pow(activity, .68);
    const ringPulse = minSide * (
      impact * (.021 + ringProgress * .015)
      + elasticMid * .009
      + propagation * (.011 + ringProgress * .005)
      + impactMomentum * (.018 - ringProgress * .004)
    );
    const rotation = direction * (
      phase * (.25 + ringProgress * .1)
      + elasticMid * .045
      + impactMomentum * .32 * (1 - ringProgress * .28)
    );
    const hierarchy = 1 - ringProgress * .36;

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const progress = (segment + .5) / segmentCount;
      const spectral = Math.pow(sampleAt(data, progress * (.8 + ringProgress * .18)), .72);
      const localDrive = clamp(spectral * .6 + elasticMid * .22 + impact * hierarchy * .13 + elasticHigh * ringProgress * .09);
      const personality = hash(segment, ring + 1) * 2 - 1;
      const breakMask = clamp((hash(segment, ring + 23) - .5) * 2.2);
      const segmentFracture = fracture * breakMask;
      const elasticWobble = Math.sin(phase * 2.2 + segment * .43 + ring * .9) * Math.pow(activity, .64) * minSide * .008 * hierarchy;
      const radialBreak = segmentFracture * minSide * (.01 + Math.abs(personality) * .017) * hierarchy;
      const tangentialBreak = personality * segmentFracture * .032 + Math.sin(phase + segment * .5) * Math.pow(activity, .65) * .011;
      const span = Math.PI * 2 / segmentCount;
      const gap = span * (.12 + (1 - localDrive) * .07 + segmentFracture * .06);
      const start = segment * span + rotation + gap + tangentialBreak;
      const end = start + span * (.7 + localDrive * .14 - segmentFracture * .07);
      const radius = baseRadius + ringPulse + spectral * minSide * .009 + radialBreak + elasticWobble;

      context.beginPath();
      context.arc(0, 0, radius, start, end);
      context.strokeStyle = colorWithAlpha((segment + ring) % 3 === 0 ? accent2 : accent,
        .055 + localDrive * .37 * hierarchy + impact * .06 + segmentFracture * .08);
      context.lineWidth = .7 + localDrive * 1.8 + impact * hierarchy * .62;
      context.shadowColor = (segment + ring) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, localDrive * shadowCap * .58 + segmentFracture * 1.6);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const progress = (spoke + .5) / spokeCount;
    const spectral = Math.pow(sampleAt(data, .5 + progress * .5), .65);
    const drive = clamp(spectral * .56 + elasticHigh * .32 + peak * .1);
    const visible = clamp((drive - .11) * 1.28);
    if (visible <= .02) continue;
    const personality = hash(spoke, 13) * 2 - 1;
    const spokeSway = Math.sin(phase * 2.55 + spoke * .72) * Math.pow(activity, .65) * .05;
    const angle = progress * Math.PI * 2 - Math.PI / 2 + phase * .055 + spokeSway + personality * fracture * .018;
    const inner = minSide * (.13 + impact * .028);
    const outer = inner + minSide * (.034 + visible * .135 + peak * .018 + Math.abs(highSpring.velocity) * .0009);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.strokeStyle = colorWithAlpha(spoke % 4 ? accent : '#ffffff', .02 + visible * .32);
    context.lineWidth = .4 + visible * 1.15;
    context.stroke();
  }

  const waveRadius = minSide * (.12 + impact * .076 + Math.sin(phase * 1.65) * Math.pow(activity, .68) * .012 + impactMomentum * .03);
  context.beginPath();
  context.arc(0, 0, waveRadius, 0, Math.PI * 2);
  context.strokeStyle = colorWithAlpha(accent2, .02 + impact * .21);
  context.lineWidth = .65 + impact * 1.05;
  context.stroke();

  if (fracture > .18) {
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 27) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .12 + phase * personality * .04;
      const travel = minSide * fracture * (.018 + hash(shard, 7) * .03) + impactMomentum * minSide * .018;
      const centerRadius = coreRadius * (.48 + hash(shard, 5) * .62) + travel;
      const size = coreRadius * (.19 + hash(shard, 9) * .2) * (.48 + fracture * .55);
      context.save();
      context.translate(Math.cos(angle) * centerRadius, Math.sin(angle) * centerRadius);
      context.rotate(angle + personality * fracture * .5 + impactMomentum * .55);
      context.beginPath();
      context.moveTo(-size, size * .28);
      context.lineTo(size * .68, -size * .48);
      context.lineTo(size * .4, size * .62);
      context.closePath();
      context.fillStyle = colorWithAlpha(shard % 2 ? accent : accent2, .02 + fracture * .11);
      context.fill();
      context.strokeStyle = colorWithAlpha(shard % 3 ? accent2 : '#ffffff', .07 + fracture * .33);
      context.lineWidth = .4 + fracture * .55;
      context.stroke();
      context.restore();
    }
  }
  context.restore();

  const innerCore = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  innerCore.addColorStop(0, colorWithAlpha('#ffffff', .92 - fracture * .1));
  innerCore.addColorStop(.2, colorWithAlpha(accent2, .72 + elasticHigh * .1));
  innerCore.addColorStop(.62, colorWithAlpha(accent, .4 + elasticBass * .22));
  innerCore.addColorStop(1, colorWithAlpha(accent, .012));
  context.fillStyle = innerCore;
  context.beginPath();
  context.arc(cx, cy, Math.max(1, coreRadius), 0, Math.PI * 2);
  context.fill();
}
