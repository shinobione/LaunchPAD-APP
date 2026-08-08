import { advanceMotionPhase, beginMotionFrame, shapeAudioDrive, springChannel } from './motion-spring.js';

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

function colorWithAlpha(color, alpha) {
  const value = clamp(alpha);
  const six = /^#([0-9a-f]{6})$/i.exec(color);
  if (!six) return color;
  const number = Number.parseInt(six[1], 16);
  return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${value})`;
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
 * Pulse Reactor — Build 57 kinetic-flow pass.
 *
 * The reactor now has a true forward-moving phase accumulated from audio
 * activity. Moderate passages continuously orbit/breathe; peaks add impact on
 * top instead of being the only visible source of motion.
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

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.5, featureWeight: .28, exponent: .68 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.45, featureWeight: .3, exponent: .7 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.55, featureWeight: .28, exponent: .67 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.6, featureWeight: .25, exponent: .64 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const grooveTarget = clamp(energy * .52 + mid * .25 + bass * .2 + high * .12);
  const impactTarget = clamp(bass * .28 + kick * .76 + peak * .17 + dynamics * .1);
  const fractureTarget = clamp(Math.max(0, impactTarget - .5) * 1.45 + kick * .18 + Math.max(0, bass - .7) * .45);

  const motion = beginMotionFrame(context, time);
  const grooveSpring = springChannel(motion, 'groove', grooveTarget, { stiffness: 32, damping: 6.8, maximum: 1.12 });
  const bassSpring = springChannel(motion, 'bass', bass, { stiffness: 48, damping: 7.2, maximum: 1.18 });
  const midSpring = springChannel(motion, 'mid', mid, { stiffness: 35, damping: 7.4, maximum: 1.12 });
  const highSpring = springChannel(motion, 'high', high, { stiffness: 44, damping: 7.8, maximum: 1.12 });
  const impactSpring = springChannel(motion, 'impact', impactTarget, { stiffness: 62, damping: 7.1, maximum: 1.32 });
  const fractureSpring = springChannel(motion, 'fracture', fractureTarget, { stiffness: 54, damping: 7.7, maximum: 1.15 });

  const groove = clamp(grooveSpring.value, 0, 1.08);
  const elasticBass = clamp(bassSpring.value + bassSpring.velocity * .012, 0, 1.18);
  const elasticMid = clamp(midSpring.value + midSpring.velocity * .006, 0, 1.12);
  const elasticHigh = clamp(highSpring.value + highSpring.velocity * .005, 0, 1.12);
  const impact = clamp(impactSpring.value + impactSpring.velocity * .014, 0, 1.32);
  const fracture = clamp(fractureSpring.value + fractureSpring.velocity * .008, 0, 1.15);
  const flow = advanceMotionPhase(motion, 'reactor-flow', clamp(groove * .8 + mid * .15 + high * .1), {
    baseSpeed: .74,
    dynamicSpeed: 2.6,
    response: 6,
    release: 10
  });
  const phase = flow.phase;

  const ringCount = mobile ? 3 : 4;
  const segmentCount = mobile ? 14 : 24;
  const spokeCount = mobile ? 10 : 18;
  const shardCount = mobile ? 4 : 7;
  const shadowCap = mobile ? 4 : 10;

  // The whole reactor travels subtly, which makes its motion readable even
  // before a peak arrives. Travel amplitude itself still decays with audio.
  const centerTravel = minSide * (.012 + groove * .026);
  const driftX = Math.sin(phase * .72) * centerTravel * groove;
  const driftY = Math.cos(phase * .53 + .8) * centerTravel * .62 * groove;
  const tilt = Math.sin(phase * .41) * groove * .065;

  const atmosphereRadius = minSide * (.43 + groove * .08 + impact * .1);
  const atmosphere = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .035 + groove * .055 + impact * .12));
  atmosphere.addColorStop(.42, colorWithAlpha(accent2, .015 + elasticMid * .07));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const breathWave = Math.sin(phase * 2.3) * (.012 + groove * .024);
  const recoil = impactSpring.velocity * .0018;
  const coreRadius = minSide * (.058 + elasticBass * .05 + impact * .032 + breathWave + recoil);
  const coreGlowRadius = coreRadius * (2.25 + groove * .3 + impact * .7);
  const coreGlow = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, coreGlowRadius);
  coreGlow.addColorStop(0, colorWithAlpha('#ffffff', .72 + elasticHigh * .2));
  coreGlow.addColorStop(.14, colorWithAlpha(accent2, .58 + impact * .25));
  coreGlow.addColorStop(.46, colorWithAlpha(accent, .12 + elasticBass * .24));
  coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = coreGlow;
  context.beginPath();
  context.arc(cx + driftX, cy + driftY, Math.max(1, coreGlowRadius), 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(cx + driftX, cy + driftY);
  context.rotate(tilt);
  context.globalCompositeOperation = 'lighter';

  for (let ring = 0; ring < ringCount; ring += 1) {
    const ringProgress = ring / Math.max(1, ringCount - 1);
    const direction = ring % 2 ? -1 : 1;
    const baseRadius = minSide * (.125 + ringProgress * .225);
    const propagation = Math.sin(phase * (1.55 + ringProgress * .24) - ring * .95);
    const ringTravel = Math.sin(phase * (.85 + ringProgress * .3) + ring * 1.2) * minSide * (.008 + groove * .021);
    const ringPulse = minSide * impact * (.022 + ringProgress * .016)
      + propagation * minSide * (.012 + groove * .018) * groove
      + ringTravel;
    const rotation = direction * (phase * (.42 + ringProgress * .2) + elasticMid * .08 + impactSpring.velocity * .0025);
    const hierarchy = 1 - ringProgress * .28;

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const progress = (segment + .5) / segmentCount;
      const spectral = Math.pow(sampleAt(data, progress * (.82 + ringProgress * .14)), .62);
      const personality = hash(segment, ring + 1) * 2 - 1;
      const localDrive = clamp(spectral * .68 + elasticMid * .22 + elasticHigh * ringProgress * .13 + groove * .14);
      const breakMask = clamp((hash(segment, ring + 23) - .5) * 2.4);
      const segmentFracture = fracture * breakMask;
      const localWave = Math.sin(phase * (2.1 + ringProgress * .35) + segment * .48 + ring * .8);
      const radialLife = localWave * minSide * (.004 + groove * .013) * hierarchy;
      const radialBreak = segmentFracture * minSide * (.012 + Math.abs(personality) * .024) * hierarchy;
      const tangentialLife = Math.cos(phase * 1.45 + segment * .41) * groove * .025;
      const tangentialBreak = personality * segmentFracture * .04;
      const span = Math.PI * 2 / segmentCount;
      const gap = span * (.1 + (1 - localDrive) * .06 + segmentFracture * .07);
      const start = segment * span + rotation + gap + tangentialLife + tangentialBreak;
      const end = start + span * (.72 + localDrive * .16 - segmentFracture * .08);
      const radius = baseRadius + ringPulse + spectral * minSide * .015 + radialLife + radialBreak;

      context.beginPath();
      context.arc(0, 0, radius, start, end);
      context.strokeStyle = colorWithAlpha((segment + ring) % 3 === 0 ? accent2 : accent,
        .055 + localDrive * .42 * hierarchy + groove * .07 + impact * .08 + segmentFracture * .1);
      context.lineWidth = .7 + localDrive * 2 + impact * hierarchy * .7;
      context.shadowColor = (segment + ring) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, localDrive * shadowCap * .62 + impact * 2 + segmentFracture * 2);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const progress = (spoke + .5) / spokeCount;
    const spectral = Math.pow(sampleAt(data, .48 + progress * .5), .56);
    const drive = clamp(spectral * .62 + elasticHigh * .38 + groove * .12 + peak * .12);
    if (drive < .08) continue;
    const personality = hash(spoke, 13) * 2 - 1;
    const angle = progress * Math.PI * 2 - Math.PI / 2
      + phase * (.18 + personality * .025)
      + Math.sin(phase * 2.4 + spoke * .72) * groove * .075;
    const inner = minSide * (.12 + impact * .035);
    const outer = inner + minSide * (.04 + drive * .17 + impact * .035 + Math.sin(phase * 2 + spoke) * groove * .018);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.strokeStyle = colorWithAlpha(spoke % 4 ? accent : '#ffffff', .025 + drive * .4);
    context.lineWidth = .45 + drive * 1.35;
    context.stroke();
  }

  const waveRadius = minSide * (.11 + groove * .035 + impact * .11 + Math.sin(phase * 1.7) * groove * .018);
  context.beginPath();
  context.arc(0, 0, waveRadius, 0, Math.PI * 2);
  context.strokeStyle = colorWithAlpha(accent2, .025 + groove * .08 + impact * .28);
  context.lineWidth = .7 + impact * 1.4;
  context.stroke();

  if (fracture > .16) {
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 27) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .12 + phase * personality * .08;
      const travel = minSide * fracture * (.03 + hash(shard, 7) * .05);
      const centerRadius = coreRadius * (.5 + hash(shard, 5) * .58) + travel;
      const size = coreRadius * (.18 + hash(shard, 9) * .21) * (.52 + fracture * .75);
      context.save();
      context.translate(Math.cos(angle) * centerRadius, Math.sin(angle) * centerRadius);
      context.rotate(angle + personality * fracture * .72 + impactSpring.velocity * .0035);
      context.beginPath();
      context.moveTo(-size, size * .28);
      context.lineTo(size * .68, -size * .48);
      context.lineTo(size * .4, size * .62);
      context.closePath();
      context.fillStyle = colorWithAlpha(shard % 2 ? accent : accent2, .025 + fracture * .15);
      context.fill();
      context.strokeStyle = colorWithAlpha(shard % 3 ? accent2 : '#ffffff', .08 + fracture * .42);
      context.lineWidth = .4 + fracture * .7;
      context.stroke();
      context.restore();
    }
  }
  context.restore();

  const innerCore = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, coreRadius);
  innerCore.addColorStop(0, colorWithAlpha('#ffffff', .92 - fracture * .1));
  innerCore.addColorStop(.2, colorWithAlpha(accent2, .72 + elasticHigh * .14));
  innerCore.addColorStop(.62, colorWithAlpha(accent, .4 + elasticBass * .3));
  innerCore.addColorStop(1, colorWithAlpha(accent, .012));
  context.fillStyle = innerCore;
  context.beginPath();
  context.arc(cx + driftX, cy + driftY, Math.max(1, coreRadius), 0, Math.PI * 2);
  context.fill();
}
