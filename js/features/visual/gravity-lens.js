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
  const value = Math.sin(index * 67.731 + seed * 31.917) * 43758.5453;
  return value - Math.floor(value);
}

function point(angle, radius) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Gravity Lens — dynamic-breathing pass.
 *
 * The field now spends less time at maximum warp and more time moving through
 * subtle states. Small FFT energy keeps precession/breathing visible, while
 * large peaks are compressed and expressed as short signed recoil instead of a
 * permanently fully-distorted lens.
 */
export function drawGravityLensMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  const rawBass = average(data, 0, data.length * .18);
  const rawMid = average(data, data.length * .18, data.length * .6);
  const rawHigh = average(data, data.length * .6, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeMotionTarget(Math.max(feature(features, 'bass'), Math.pow(rawBass, .7) * 1.16), { ceiling: .86 });
  const mid = shapeMotionTarget(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.1), { ceiling: .84 });
  const high = shapeMotionTarget(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.12), { ceiling: .86 });
  const energy = shapeMotionTarget(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .78) * 1.1), { ceiling: .84 });
  const kick = shapeMotionTarget(feature(features, 'kick'), { knee: .5, ceiling: .9, lowExponent: .88 });
  const peak = shapeMotionTarget(feature(features, 'peak'), { knee: .58, ceiling: .88 });
  const dynamics = shapeMotionTarget(feature(features, 'dynamics'), { ceiling: .86 });

  const activityTarget = shapeMotionTarget(energy * .58 + bass * .2 + mid * .12 + high * .12 + kick * .1, { ceiling: .82 });
  const warpTarget = shapeMotionTarget(Math.pow(bass, .72) * .44 + kick * .5 + peak * .13 + dynamics * .1, { knee: .52, ceiling: .84 });
  const causticTarget = shapeMotionTarget(high * .52 + peak * .24 + dynamics * .12 + mid * .1, { ceiling: .84 });
  const shearTarget = shapeMotionTarget(mid * .58 + high * .12 + dynamics * .12, { ceiling: .8 });

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 22, damping: 7, maximum: 1 });
  const warpSpring = springChannel(motion, 'warp', warpTarget, { stiffness: 34, damping: 7.1, maximum: 1.02 });
  const shearSpring = springChannel(motion, 'shear', shearTarget, { stiffness: 26, damping: 7.6, maximum: .98 });
  const causticSpring = springChannel(motion, 'caustic', causticTarget, { stiffness: 32, damping: 8, maximum: 1 });

  const activity = clamp(activitySpring.value, 0, 1);
  const warpMomentum = clamp(warpSpring.velocity * .0075, -.12, .12);
  const shearMomentum = clamp(shearSpring.velocity * .008, -.1, .1);
  const causticMomentum = clamp(causticSpring.velocity * .006, -.08, .08);
  const warp = clamp(warpSpring.value + warpMomentum, 0, 1.03);
  const shear = clamp(shearSpring.value + shearMomentum, 0, .98);
  const caustic = clamp(causticSpring.value + causticMomentum, 0, 1);
  const phase = motionPhase(time, activity, .25);

  const bandCount = mobile ? 4 : 6;
  const arcCount = mobile ? 12 : 20;
  const streamCount = mobile ? 8 : 14;
  const shadowCap = mobile ? 5 : 12;
  const baseRadius = minSide * (mobile ? .315 : .34);

  const atmosphereRadius = baseRadius * (1.86 + warp * .22);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .035 + warp * .1));
  atmosphere.addColorStop(.28, colorWithAlpha(accent, .022 + shear * .06));
  atmosphere.addColorStop(.68, colorWithAlpha(accent2, .01 + caustic * .032));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  for (let band = 0; band < bandCount; band += 1) {
    const bandProgress = band / Math.max(1, bandCount - 1);
    const breathing = Math.sin(phase * 1.78 - band * .58) * Math.pow(activity, .64) * baseRadius * (.022 + bandProgress * .009);
    const recoil = warpMomentum * baseRadius * (.08 + bandProgress * .035);
    const ringRadius = baseRadius * (.34 + bandProgress * .72 + warp * (.021 + bandProgress * .035)) + breathing + recoil;
    const ellipticity = 1 + shear * (.034 + bandProgress * .04) + Math.sin(phase * 1.18 + band) * Math.pow(activity, .64) * .018;
    const rotation = (band % 2 ? -1 : 1) * (
      phase * (.39 + bandProgress * .15)
      + shear * .03
      + warpMomentum * .46 * (1 - bandProgress * .2)
    );

    context.save();
    context.rotate(rotation);
    context.scale(ellipticity, 1 / ellipticity);

    for (let arc = 0; arc < arcCount; arc += 1) {
      const progress = (arc + .5) / arcCount;
      const spectral = Math.pow(sampleAt(data, progress * .86 + bandProgress * .1), .72);
      const personality = hash(arc, band + 3) * 2 - 1;
      const drive = clamp(spectral * .58 + warp * (1 - bandProgress) * .2 + shear * .14 + caustic * bandProgress * .14);
      const arcSpan = Math.PI * 2 / arcCount;
      const orbitRipple = Math.sin(phase * 2.18 + arc * .42 - band * .65) * Math.pow(activity, .62) * baseRadius * .012;
      const lensPull = warp * baseRadius * (.006 + (1 - bandProgress) * .011) * personality;
      const localRadius = ringRadius + spectral * baseRadius * .017 + lensPull + orbitRipple;
      const gap = arcSpan * (.14 + (1 - drive) * .08);
      const start = arc * arcSpan + gap + personality * shear * .011 + Math.sin(phase * 1.18 + arc * .3) * Math.pow(activity, .62) * .012;
      const end = start + arcSpan * (.69 + drive * .14) - gap * .4;

      context.beginPath();
      context.arc(0, 0, localRadius, start, end);
      context.strokeStyle = colorWithAlpha((arc + band) % 3 === 0 ? accent2 : accent,
        .04 + drive * .29 + caustic * bandProgress * .075);
      context.lineWidth = .5 + drive * 1.2 + (1 - bandProgress) * warp * .44;
      context.shadowColor = (arc + band) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, drive * shadowCap * .58 + caustic * 2.1);
      context.stroke();
    }
    context.restore();
  }

  context.shadowBlur = 0;
  for (let stream = 0; stream < streamCount; stream += 1) {
    const progress = (stream + .5) / streamCount;
    const personality = hash(stream, 19) * 2 - 1;
    const spectral = Math.pow(sampleAt(data, .42 + progress * .58), .68);
    const drive = clamp(caustic * .32 + spectral * .52 + shear * .14 + warp * .1);
    const streamDrift = Math.sin(phase * 2 + stream * .66) * Math.pow(activity, .62);
    const angle = progress * Math.PI * 2 + personality * .08 + phase * .18 + streamDrift * .055 + shearMomentum * .28;
    const outer = baseRadius * (1.2 + drive * .14 + Math.abs(streamDrift) * .035);
    const inner = baseRadius * (.4 + warp * .045 + warpMomentum * .04);
    const bend = personality * (.22 + shear * .22 + warp * .1) + streamDrift * .16 + shearMomentum * .34;
    const [x1, y1] = point(angle - .2, outer);
    const [x2, y2] = point(angle + bend, inner);
    const [x3, y3] = point(angle + .2 + streamDrift * .038, outer * .98);

    context.beginPath();
    context.moveTo(x1, y1);
    context.quadraticCurveTo(x2, y2, x3, y3);
    context.strokeStyle = colorWithAlpha(stream % 3 ? accent2 : '#ffffff', .02 + drive * .26 + caustic * .1);
    context.lineWidth = .32 + drive * .9;
    context.stroke();
  }

  const einsteinRadius = baseRadius * (.48 + warp * .067 + Math.sin(phase * 1.62) * Math.pow(activity, .64) * .018 + warpMomentum * .07);
  const brightArcCount = mobile ? 4 : 6;
  for (let arc = 0; arc < brightArcCount; arc += 1) {
    const progress = (arc + .5) / brightArcCount;
    const spectral = Math.pow(sampleAt(data, .58 + progress * .4), .64);
    const drive = clamp(caustic * .46 + spectral * .5 + peak * .1);
    if (drive < .06) continue;
    const span = Math.PI * (.15 + drive * .16);
    const center = progress * Math.PI * 2 + shear * .08 + phase * .28 + Math.sin(phase * 1.88 + arc) * Math.pow(activity, .63) * .05 + causticMomentum * .3;
    context.beginPath();
    context.arc(0, 0, einsteinRadius + spectral * baseRadius * .016, center - span / 2, center + span / 2);
    context.strokeStyle = colorWithAlpha(arc % 2 ? '#ffffff' : accent2, .05 + drive * .4);
    context.lineWidth = .65 + drive * 1.7;
    context.stroke();
  }

  if (warp > .46) {
    const pulseRadius = baseRadius * (.56 + warp * .2 + Math.sin(phase * 1.45) * Math.pow(activity, .64) * .026 + warpMomentum * .12);
    context.beginPath();
    context.ellipse(0, 0, pulseRadius * (1 + shear * .07), pulseRadius * (1 - shear * .055), shear * .08 + phase * .06, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent, (warp - .46) * .28);
    context.lineWidth = .65 + warp * .9;
    context.stroke();
  }

  context.restore();

  const horizonBreath = Math.sin(phase * 2.05) * Math.pow(activity, .64) * .012;
  const horizonRadius = baseRadius * (.135 + bass * .014 + kick * .018 + horizonBreath + warpMomentum * .045);
  const horizonGlowRadius = horizonRadius * (2.14 + warp * .52);
  const horizonGlow = context.createRadialGradient(cx, cy, horizonRadius * .35, cx, cy, horizonGlowRadius);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,.98)');
  horizonGlow.addColorStop(.42, colorWithAlpha(accent2, .08 + warp * .16));
  horizonGlow.addColorStop(.7, colorWithAlpha(accent, .03 + caustic * .065));
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = horizonGlow;
  context.beginPath();
  context.arc(cx, cy, horizonGlowRadius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(2,1,7,.96)';
  context.beginPath();
  context.arc(cx, cy, horizonRadius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = colorWithAlpha('#ffffff', .07 + caustic * .27 + peak * .09);
  context.lineWidth = .7 + warp * 1.02;
  context.beginPath();
  context.arc(cx, cy, horizonRadius * (1.05 + warp * .028), 0, Math.PI * 2);
  context.stroke();
}
