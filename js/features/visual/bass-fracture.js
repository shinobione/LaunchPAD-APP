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
  const value = Math.sin(index * 91.713 + seed * 47.119) * 43758.5453;
  return value - Math.floor(value);
}

function point(angle, radius) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Bass Fracture — Build 57 kinetic-flow pass.
 *
 * Plates no longer wait for a peak to become interesting. A signal-driven
 * integrated phase keeps the tectonic body sliding and twisting through steady
 * grooves; bass/kicks then add large rupture travel on top.
 */
export function drawBassFractureMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  const rawBass = average(data, 0, data.length * .18);
  const rawMid = average(data, data.length * .18, data.length * .6);
  const rawHigh = average(data, data.length * .6, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.55, featureWeight: .28, exponent: .66 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.45, featureWeight: .3, exponent: .7 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.5, featureWeight: .28, exponent: .68 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.62, featureWeight: .24, exponent: .64 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const grooveTarget = clamp(energy * .5 + mid * .25 + bass * .25 + high * .08);
  const fractureTarget = clamp(bass * .42 + kick * .7 + peak * .14 + dynamics * .12);
  const ruptureTarget = clamp(Math.max(0, fractureTarget - .34) * 1.55 + kick * .34 + bass * .18);
  const twistTarget = clamp(mid * .62 + high * .18 + dynamics * .16 + bass * .12);

  const motion = beginMotionFrame(context, time);
  const grooveSpring = springChannel(motion, 'groove', grooveTarget, { stiffness: 30, damping: 6.5, maximum: 1.1 });
  const fractureSpring = springChannel(motion, 'fracture', fractureTarget, { stiffness: 48, damping: 6.9, maximum: 1.22 });
  const ruptureSpring = springChannel(motion, 'rupture', ruptureTarget, { stiffness: 62, damping: 6.8, maximum: 1.38 });
  const twistSpring = springChannel(motion, 'twist', twistTarget, { stiffness: 34, damping: 7.2, maximum: 1.15 });
  const highSpring = springChannel(motion, 'high', high, { stiffness: 42, damping: 7.8, maximum: 1.12 });

  const groove = clamp(grooveSpring.value, 0, 1.08);
  const fracture = clamp(fractureSpring.value + fractureSpring.velocity * .01, 0, 1.2);
  const rupture = clamp(ruptureSpring.value + ruptureSpring.velocity * .014, 0, 1.42);
  const twist = clamp(twistSpring.value + twistSpring.velocity * .006, 0, 1.16);
  const elasticHigh = clamp(highSpring.value, 0, 1.1);
  const flow = advanceMotionPhase(motion, 'tectonic-flow', clamp(groove * .8 + mid * .18 + high * .08), {
    baseSpeed: .5,
    dynamicSpeed: 1.9,
    response: 5.6,
    release: 9
  });
  const phase = flow.phase;

  const layerCount = mobile ? 2 : 3;
  const sectorCount = mobile ? 12 : 16;
  const crackCount = mobile ? 8 : 12;
  const shadowCap = mobile ? 4 : 9;
  const motionScale = mobile ? 1.66 : 1.34;
  const baseRadius = minSide * (mobile ? .32 : .315);

  // The complete tectonic mass rolls slightly rather than sitting perfectly
  // centred. It remains cheap: this is one transform, not more geometry.
  const bodyTravel = baseRadius * (.025 + groove * .07);
  const bodyX = Math.sin(phase * .62) * bodyTravel * groove;
  const bodyY = Math.cos(phase * .47 + .7) * bodyTravel * .65 * groove;
  const bodyRotation = Math.sin(phase * .34) * groove * .13 + ruptureSpring.velocity * .002;
  const breathingScale = 1 + Math.sin(phase * 1.28) * groove * .035 + fracture * .025;

  const atmosphereRadius = baseRadius * (1.75 + groove * .18 + fracture * .34);
  const atmosphere = context.createRadialGradient(cx + bodyX, cy + bodyY, 0, cx + bodyX, cy + bodyY, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .04 + groove * .055 + fracture * .13));
  atmosphere.addColorStop(.44, colorWithAlpha(accent, .018 + bass * .08));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx + bodyX, cy + bodyY);
  context.rotate(bodyRotation);
  context.scale(breathingScale, 2 - breathingScale);
  context.globalCompositeOperation = 'lighter';

  const sectorSpan = Math.PI * 2 / sectorCount;
  for (let layer = 0; layer < layerCount; layer += 1) {
    const layerProgress = layer / Math.max(1, layerCount - 1);
    const innerBase = baseRadius * (.14 + layerProgress * .3);
    const outerBase = baseRadius * (.5 + layerProgress * .32);
    const direction = layer % 2 ? -1 : 1;
    const layerWave = Math.sin(phase * (1.32 + layerProgress * .22) - layer * 1.05);
    const layerBreath = layerWave * groove * baseRadius * (.025 + layerProgress * .012);
    const layerRotation = direction * (phase * (.22 + layerProgress * .1) + twist * .11 * (layer + 1))
      + ruptureSpring.velocity * .0018;
    const layerWeight = 1 - layerProgress * .16;

    for (let sector = 0; sector < sectorCount; sector += 1) {
      const progress = (sector + .5) / sectorCount;
      const spectral = Math.pow(sampleAt(data, progress * .82 + layerProgress * .12), .6);
      const lowBias = Math.pow(sampleAt(data, progress * .24), .58);
      const personality = hash(sector, layer + 1) * 2 - 1;
      const localWave = Math.sin(phase * (1.8 + hash(sector, 9) * .65) + sector * .64 + layer * .9);
      const plateDrive = clamp(fracture * .38 + rupture * .6 + spectral * .32 + groove * .16);
      const separation = baseRadius * motionScale * (
        fracture * (.025 + layerProgress * .02)
        + rupture * (.045 + Math.abs(personality) * .05)
        + spectral * .012
      );
      const livingTravel = localWave * groove * baseRadius * motionScale * (.018 + Math.abs(personality) * .014);
      const radialOffset = (separation * (.62 + Math.abs(personality) * .86) + layerBreath + livingTravel) * layerWeight;
      const tangential = personality * rupture * baseRadius * .043 * motionScale
        + Math.cos(phase * 1.45 + sector * .52) * groove * baseRadius * .03 * motionScale;
      const angleCenter = sector * sectorSpan + layerRotation;
      const gapScale = .055 + rupture * .09;
      const start = angleCenter + sectorSpan * gapScale;
      const end = angleCenter + sectorSpan * (.95 - gapScale);
      const inner = innerBase + radialOffset * (.26 + layerProgress * .14);
      const outer = outerBase + radialOffset;

      const [x1, y1] = point(start, inner);
      const [x2, y2] = point(end, inner + personality * rupture * baseRadius * .016);
      const [x3, y3] = point(end + personality * elasticHigh * .009, outer);
      const [x4, y4] = point(start - personality * elasticHigh * .009, outer + personality * rupture * baseRadius * .017);
      const tx = -Math.sin(angleCenter) * tangential;
      const ty = Math.cos(angleCenter) * tangential;

      context.beginPath();
      context.moveTo(x1 + tx, y1 + ty);
      context.lineTo(x2 + tx, y2 + ty);
      context.lineTo(x3 + tx, y3 + ty);
      context.lineTo(x4 + tx, y4 + ty);
      context.closePath();

      const plateColor = (sector + layer) % 3 === 0 ? accent2 : accent;
      context.fillStyle = colorWithAlpha(plateColor, .025 + plateDrive * .105);
      context.fill();
      context.strokeStyle = colorWithAlpha((sector + layer) % 5 === 0 ? '#ffffff' : plateColor,
        .075 + spectral * .3 + elasticHigh * .12 + rupture * .27 + groove * .06);
      context.lineWidth = .6 + spectral * 1 + rupture * .82;
      context.shadowColor = plateColor;
      context.shadowBlur = Math.min(shadowCap, elasticHigh * shadowCap * .55 + rupture * shadowCap * .4);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  for (let crack = 0; crack < crackCount; crack += 1) {
    const progress = (crack + .5) / crackCount;
    const spectral = Math.pow(sampleAt(data, .48 + progress * .5), .56);
    const personality = hash(crack, 17) * 2 - 1;
    const drive = clamp(elasticHigh * .35 + spectral * .62 + rupture * .48 + groove * .14 + dynamics * .08);
    if (drive < .055) continue;
    const crawl = Math.sin(phase * (2.05 + hash(crack, 4) * .5) - crack * .58);
    const angle = progress * Math.PI * 2 + phase * .11 + personality * twist * .05 + crawl * groove * .055;
    const inner = baseRadius * (.08 + hash(crack, 5) * .12);
    const middle = baseRadius * (.34 + hash(crack, 8) * .13 + rupture * .08 + crawl * groove * .03);
    const outer = baseRadius * (.74 + drive * .32 + rupture * .24 * motionScale + Math.abs(crawl) * groove * .08);
    const bend = personality * (.05 + drive * .075) + crawl * groove * .06;

    const [x1, y1] = point(angle, inner);
    const [x2, y2] = point(angle + bend, middle);
    const [x3, y3] = point(angle - bend * .6, outer);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.strokeStyle = colorWithAlpha(crack % 3 ? accent2 : '#ffffff', .025 + drive * .46);
    context.lineWidth = .4 + drive * 1.12;
    context.stroke();
  }

  const faultRadius = baseRadius * (.18 + fracture * .12 + groove * .03 + Math.sin(phase * 1.7) * groove * .025);
  const fault = context.createRadialGradient(0, 0, 0, 0, 0, faultRadius);
  fault.addColorStop(0, colorWithAlpha('#ffffff', .12 + peak * .4));
  fault.addColorStop(.22, colorWithAlpha(accent2, .18 + fracture * .32));
  fault.addColorStop(.68, colorWithAlpha(accent, .04 + bass * .14));
  fault.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = fault;
  context.beginPath();
  context.arc(0, 0, faultRadius, 0, Math.PI * 2);
  context.fill();

  if (rupture > .14) {
    const shardCount = mobile ? 5 : 7;
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 31) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .1 + phase * personality * .08;
      const travel = baseRadius * rupture * motionScale * (.18 + hash(shard, 4) * .2);
      const centerRadius = baseRadius * (.18 + hash(shard, 9) * .16) + travel;
      const size = baseRadius * (.028 + hash(shard, 12) * .034) * (.5 + rupture * .88);
      const [sx, sy] = point(angle, centerRadius);
      context.save();
      context.translate(sx, sy);
      context.rotate(angle + personality * rupture * .72 + ruptureSpring.velocity * .003);
      context.beginPath();
      context.moveTo(-size, size * .34);
      context.lineTo(size * .72, -size * .52);
      context.lineTo(size * .44, size * .6);
      context.closePath();
      context.fillStyle = colorWithAlpha(shard % 2 ? accent : accent2, .035 + rupture * .15);
      context.fill();
      context.strokeStyle = colorWithAlpha(shard % 3 ? accent2 : '#ffffff', .08 + rupture * .42);
      context.lineWidth = .4 + rupture * .68;
      context.stroke();
      context.restore();
    }
  }

  if (rupture > .46) {
    const frontRadius = baseRadius * (.68 + rupture * .4 + Math.sin(phase * 1.3) * groove * .04);
    context.beginPath();
    context.arc(0, 0, frontRadius, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent2, (rupture - .46) * .42);
    context.lineWidth = .75 + rupture * 1.1;
    context.stroke();
  }

  context.restore();
}
