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
  const value = Math.sin(index * 91.713 + seed * 47.119) * 43758.5453;
  return value - Math.floor(value);
}

function point(angle, radius) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Bass Fracture — dynamic-breathing pass.
 *
 * The plate system keeps the same sparse geometry but no longer lives close to
 * maximum rupture. Soft-knee targets reserve headroom and signed spring
 * velocity produces glide/recoil, so the disc feels alive between impacts.
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

  const bass = shapeMotionTarget(Math.max(feature(features, 'bass'), Math.pow(rawBass, .68) * 1.16), { ceiling: .86 });
  const mid = shapeMotionTarget(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.1), { ceiling: .84 });
  const high = shapeMotionTarget(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.12), { ceiling: .86 });
  const energy = shapeMotionTarget(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .76) * 1.1), { ceiling: .84 });
  const kick = shapeMotionTarget(feature(features, 'kick'), { knee: .5, ceiling: .9, lowExponent: .88 });
  const peak = shapeMotionTarget(feature(features, 'peak'), { knee: .58, ceiling: .88 });
  const dynamics = shapeMotionTarget(feature(features, 'dynamics'), { ceiling: .86 });

  const activityTarget = shapeMotionTarget(energy * .6 + bass * .26 + mid * .08 + high * .08 + kick * .12, { ceiling: .82 });
  const fractureTarget = shapeMotionTarget(Math.pow(bass, .7) * .43 + kick * .55 + Math.max(0, peak - .45) * .32 + dynamics * .12, { knee: .5, ceiling: .84 });
  const motionScale = mobile ? 1.48 : 1.12;
  const ruptureTarget = shapeMotionTarget(Math.max(0, fractureTarget - .4) * 1.42 + kick * .28 + peak * .08, { knee: .46, ceiling: .82 });
  const twistTarget = shapeMotionTarget(mid * .72 + high * .12 + dynamics * .12, { ceiling: .8 });

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 23, damping: 7.1, maximum: 1 });
  const fractureSpring = springChannel(motion, 'fracture', fractureTarget, { stiffness: 36, damping: 7.2, maximum: 1.02 });
  const ruptureSpring = springChannel(motion, 'rupture', ruptureTarget, { stiffness: 42, damping: 6.7, maximum: 1.08 });
  const twistSpring = springChannel(motion, 'twist', twistTarget, { stiffness: 27, damping: 7.7, maximum: .98 });
  const highSpring = springChannel(motion, 'high', high, { stiffness: 34, damping: 8.2, maximum: 1 });

  const activity = clamp(activitySpring.value, 0, 1);
  const fractureMomentum = clamp(fractureSpring.velocity * .007, -.1, .1);
  const ruptureMomentum = clamp(ruptureSpring.velocity * .0085, -.14, .14);
  const twistMomentum = clamp(twistSpring.velocity * .008, -.09, .09);
  const fracture = clamp(fractureSpring.value + fractureMomentum, 0, 1.02);
  const rupture = clamp(ruptureSpring.value + ruptureMomentum, 0, 1.08);
  const elasticTwist = clamp(twistSpring.value + twistMomentum, 0, .98);
  const elasticHigh = clamp(highSpring.value, 0, 1);
  const phase = motionPhase(time, activity, .28);

  const layerCount = mobile ? 2 : 3;
  const sectorCount = mobile ? 12 : 16;
  const crackCount = mobile ? 8 : 12;
  const shadowCap = mobile ? 4 : 9;
  const baseRadius = minSide * (mobile ? .32 : .315);

  const atmosphereRadius = baseRadius * (1.8 + fracture * .24);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .04 + fracture * .095));
  atmosphere.addColorStop(.42, colorWithAlpha(accent, .016 + bass * .055));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  const sectorSpan = Math.PI * 2 / sectorCount;
  for (let layer = 0; layer < layerCount; layer += 1) {
    const layerProgress = layer / Math.max(1, layerCount - 1);
    const innerBase = baseRadius * (.14 + layerProgress * .3);
    const outerBase = baseRadius * (.5 + layerProgress * .32);
    const layerBreath = Math.sin(phase * 1.72 - layer * .76) * Math.pow(activity, .66) * baseRadius * (.017 + layerProgress * .007);
    const layerRotation = (layer % 2 ? -1 : 1) * (
      phase * (.18 + layerProgress * .065)
      + elasticTwist * .06 * (layer + 1)
      + ruptureMomentum * .48
    );
    const layerWeight = 1 - layerProgress * .2;

    for (let sector = 0; sector < sectorCount; sector += 1) {
      const progress = (sector + .5) / sectorCount;
      const spectral = Math.pow(sampleAt(data, progress * .8 + layerProgress * .14), .7);
      const lowBias = Math.pow(sampleAt(data, progress * .22), .7);
      const personality = hash(sector, layer + 1) * 2 - 1;
      const plateDrive = clamp(fracture * .34 + rupture * .5 + spectral * .22 + lowBias * bass * .2);
      const sway = Math.sin(phase * 2.15 + sector * .68 + layer * .8) * Math.pow(activity, .64) * baseRadius * .018 * personality;
      const recoil = ruptureMomentum * baseRadius * (.12 + Math.abs(personality) * .1);
      const separation = baseRadius * motionScale * (
        fracture * (.014 + layerProgress * .014)
        + rupture * (.024 + Math.abs(personality) * .03)
        + spectral * .008
      );
      const radialOffset = (separation * (.58 + Math.abs(personality) * .72) + layerBreath + sway + recoil * personality) * layerWeight;
      const tangential = personality * rupture * baseRadius * .025 * motionScale
        + Math.cos(phase * 1.82 + sector * .54) * Math.pow(activity, .65) * baseRadius * .014
        + ruptureMomentum * baseRadius * .12;
      const angleCenter = sector * sectorSpan + layerRotation;
      const gapScale = .055 + rupture * .06;
      const start = angleCenter + sectorSpan * gapScale;
      const end = angleCenter + sectorSpan * (.945 - gapScale);
      const inner = innerBase + radialOffset * (.28 + layerProgress * .14);
      const outer = outerBase + radialOffset;

      const [x1, y1] = point(start, inner);
      const [x2, y2] = point(end, inner + personality * rupture * baseRadius * .01);
      const [x3, y3] = point(end + personality * elasticHigh * .005, outer);
      const [x4, y4] = point(start - personality * elasticHigh * .005, outer + personality * rupture * baseRadius * .01);
      const tx = -Math.sin(angleCenter) * tangential;
      const ty = Math.cos(angleCenter) * tangential;

      context.beginPath();
      context.moveTo(x1 + tx, y1 + ty);
      context.lineTo(x2 + tx, y2 + ty);
      context.lineTo(x3 + tx, y3 + ty);
      context.lineTo(x4 + tx, y4 + ty);
      context.closePath();

      const plateColor = (sector + layer) % 3 === 0 ? accent2 : accent;
      context.fillStyle = colorWithAlpha(plateColor, .02 + plateDrive * .075);
      context.fill();
      context.strokeStyle = colorWithAlpha((sector + layer) % 5 === 0 ? '#ffffff' : plateColor,
        .07 + spectral * .22 + elasticHigh * .09 + rupture * .18);
      context.lineWidth = .55 + spectral * .78 + rupture * .58;
      context.shadowColor = plateColor;
      context.shadowBlur = Math.min(shadowCap, elasticHigh * shadowCap * .5 + rupture * shadowCap * .28);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  const crackPropagation = clamp(rupture * .68 + Math.abs(ruptureMomentum) * 2.2 + elasticHigh * .16, 0, 1);
  for (let crack = 0; crack < crackCount; crack += 1) {
    const progress = (crack + .5) / crackCount;
    const spectral = Math.pow(sampleAt(data, .5 + progress * .5), .64);
    const personality = hash(crack, 17) * 2 - 1;
    const drive = clamp(elasticHigh * .3 + spectral * .54 + rupture * .34 + dynamics * .08);
    if (drive < .06) continue;
    const crawling = Math.sin(phase * 2.45 - crack * .52) * Math.pow(activity, .64);
    const angle = progress * Math.PI * 2 + phase * .09 + personality * elasticTwist * .028 + crawling * .026 + ruptureMomentum * .22;
    const inner = baseRadius * (.09 + hash(crack, 5) * .11);
    const middle = baseRadius * (.34 + hash(crack, 8) * .11 + rupture * .055);
    const outer = baseRadius * (.74 + drive * .23 + crackPropagation * .18 * motionScale);
    const bend = personality * (.04 + drive * .05 + crawling * .03) + ruptureMomentum * .12;

    const [x1, y1] = point(angle, inner);
    const [x2, y2] = point(angle + bend, middle);
    const [x3, y3] = point(angle - bend * .55, outer);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.strokeStyle = colorWithAlpha(crack % 3 ? accent2 : '#ffffff', .02 + drive * .35);
    context.lineWidth = .35 + drive * .9;
    context.stroke();
  }

  const faultRadius = baseRadius * (.2 + fracture * .07 + Math.sin(phase * 1.95) * Math.pow(activity, .66) * .017 + fractureMomentum * .06);
  const fault = context.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, faultRadius));
  fault.addColorStop(0, colorWithAlpha('#ffffff', .12 + peak * .28));
  fault.addColorStop(.22, colorWithAlpha(accent2, .15 + fracture * .23));
  fault.addColorStop(.68, colorWithAlpha(accent, .035 + bass * .09));
  fault.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = fault;
  context.beginPath();
  context.arc(0, 0, Math.max(1, faultRadius), 0, Math.PI * 2);
  context.fill();

  if (rupture > .18) {
    const shardCount = mobile ? 5 : 7;
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 31) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .08 + phase * personality * .035 + ruptureMomentum * .28;
      const travel = baseRadius * rupture * motionScale * (.11 + hash(shard, 4) * .12) + ruptureMomentum * baseRadius * .16;
      const centerRadius = baseRadius * (.18 + hash(shard, 9) * .16) + travel;
      const size = baseRadius * (.026 + hash(shard, 12) * .03) * (.48 + rupture * .65);
      const [sx, sy] = point(angle, centerRadius);
      context.save();
      context.translate(sx, sy);
      context.rotate(angle + personality * rupture * .45 + ruptureMomentum * .7);
      context.beginPath();
      context.moveTo(-size, size * .34);
      context.lineTo(size * .72, -size * .52);
      context.lineTo(size * .44, size * .6);
      context.closePath();
      context.fillStyle = colorWithAlpha(shard % 2 ? accent : accent2, .03 + rupture * .1);
      context.fill();
      context.strokeStyle = colorWithAlpha(shard % 3 ? accent2 : '#ffffff', .07 + rupture * .3);
      context.lineWidth = .4 + rupture * .5;
      context.stroke();
      context.restore();
    }
  }

  if (rupture > .48) {
    const frontRadius = baseRadius * (.68 + rupture * .24 + Math.sin(phase * 1.55) * Math.pow(activity, .66) * .024 + ruptureMomentum * .12);
    context.beginPath();
    context.arc(0, 0, Math.max(1, frontRadius), 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent2, (rupture - .48) * .27);
    context.lineWidth = .65 + rupture * .78;
    context.stroke();
  }

  context.restore();
}
