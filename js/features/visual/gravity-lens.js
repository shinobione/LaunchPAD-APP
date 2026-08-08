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
  const value = Math.sin(index * 67.731 + seed * 31.917) * 43758.5453;
  return value - Math.floor(value);
}

function point(angle, radius) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Gravity Lens — motion & elasticity pass.
 *
 * The field keeps a stable readable horizon but now carries spring memory,
 * precession, breathing and continuously curved streams while signal energy
 * remains present. Silence lets those channels settle naturally.
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

  const bass = clamp(Math.max(feature(features, 'bass'), Math.pow(rawBass, .7) * 1.28));
  const mid = clamp(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.18));
  const high = clamp(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.26));
  const energy = clamp(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .78) * 1.18));
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const activityTarget = clamp(energy * .7 + bass * .28 + mid * .14 + high * .16 + kick * .2);
  const warpTarget = clamp(Math.pow(bass, .64) * .62 + kick * .84 + peak * .22 + dynamics * .18);
  const causticTarget = clamp(high * .7 + peak * .38 + dynamics * .18 + mid * .12);
  const shearTarget = clamp(mid * .74 + high * .16 + dynamics * .16);

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 30, damping: 8.2, maximum: 1.18 });
  const warpSpring = springChannel(motion, 'warp', warpTarget, { stiffness: 58, damping: 8.2, maximum: 1.42 });
  const shearSpring = springChannel(motion, 'shear', shearTarget, { stiffness: 38, damping: 9, maximum: 1.22 });
  const causticSpring = springChannel(motion, 'caustic', causticTarget, { stiffness: 48, damping: 10, maximum: 1.25 });

  const activity = clamp(activitySpring.value, 0, 1.15);
  const warp = clamp(warpSpring.value + Math.abs(warpSpring.velocity) * .012, 0, 1.45);
  const shear = clamp(shearSpring.value, 0, 1.2);
  const caustic = clamp(causticSpring.value + Math.abs(causticSpring.velocity) * .006, 0, 1.25);
  const phase = motionPhase(time, activity, .17);

  const bandCount = mobile ? 4 : 6;
  const arcCount = mobile ? 12 : 20;
  const streamCount = mobile ? 8 : 14;
  const shadowCap = mobile ? 5 : 12;
  const baseRadius = minSide * (mobile ? .315 : .34);

  const atmosphereRadius = baseRadius * (1.88 + warp * .3);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .04 + warp * .13));
  atmosphere.addColorStop(.28, colorWithAlpha(accent, .025 + shear * .075));
  atmosphere.addColorStop(.68, colorWithAlpha(accent2, .012 + caustic * .04));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  for (let band = 0; band < bandCount; band += 1) {
    const bandProgress = band / Math.max(1, bandCount - 1);
    const breathing = Math.sin(phase * 1.65 - band * .58) * activity * baseRadius * (.016 + bandProgress * .008);
    const ringRadius = baseRadius * (.34 + bandProgress * .72 + warp * (.03 + bandProgress * .05)) + breathing;
    const ellipticity = 1 + shear * (.045 + bandProgress * .052) + Math.sin(phase + band) * activity * .012;
    const rotation = (band % 2 ? -1 : 1) * (
      phase * (.32 + bandProgress * .12)
      + shear * .04
      + warpSpring.velocity * .0014 * (1 - bandProgress * .25)
    );

    context.save();
    context.rotate(rotation);
    context.scale(ellipticity, 1 / ellipticity);

    for (let arc = 0; arc < arcCount; arc += 1) {
      const progress = (arc + .5) / arcCount;
      const spectral = Math.pow(sampleAt(data, progress * .86 + bandProgress * .1), .64);
      const personality = hash(arc, band + 3) * 2 - 1;
      const drive = clamp(spectral * .78 + warp * (1 - bandProgress) * .28 + shear * .18 + caustic * bandProgress * .2);
      const arcSpan = Math.PI * 2 / arcCount;
      const orbitRipple = Math.sin(phase * 2 + arc * .42 - band * .65) * activity * baseRadius * .008;
      const lensPull = warp * baseRadius * (.009 + (1 - bandProgress) * .016) * personality;
      const localRadius = ringRadius + spectral * baseRadius * .024 + lensPull + orbitRipple;
      const gap = arcSpan * (.14 + (1 - drive) * .08);
      const start = arc * arcSpan + gap + personality * shear * .014 + Math.sin(phase + arc * .3) * activity * .008;
      const end = start + arcSpan * (.68 + drive * .18) - gap * .4;

      context.beginPath();
      context.arc(0, 0, localRadius, start, end);
      context.strokeStyle = colorWithAlpha((arc + band) % 3 === 0 ? accent2 : accent,
        .045 + drive * .35 + caustic * bandProgress * .1);
      context.lineWidth = .55 + drive * 1.5 + (1 - bandProgress) * warp * .65;
      context.shadowColor = (arc + band) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, drive * shadowCap * .7 + caustic * 2.8);
      context.stroke();
    }
    context.restore();
  }

  context.shadowBlur = 0;
  for (let stream = 0; stream < streamCount; stream += 1) {
    const progress = (stream + .5) / streamCount;
    const personality = hash(stream, 19) * 2 - 1;
    const spectral = Math.pow(sampleAt(data, .42 + progress * .58), .6);
    const drive = clamp(caustic * .42 + spectral * .66 + shear * .2 + warp * .14);
    const streamDrift = Math.sin(phase * 1.8 + stream * .66) * activity;
    const angle = progress * Math.PI * 2 + personality * .08 + phase * .13 + streamDrift * .035;
    const outer = baseRadius * (1.22 + drive * .18 + Math.abs(streamDrift) * .025);
    const inner = baseRadius * (.4 + warp * .07);
    const bend = personality * (.24 + shear * .3 + warp * .14) + streamDrift * .11;
    const [x1, y1] = point(angle - .2, outer);
    const [x2, y2] = point(angle + bend, inner);
    const [x3, y3] = point(angle + .2 + streamDrift * .025, outer * .98);

    context.beginPath();
    context.moveTo(x1, y1);
    context.quadraticCurveTo(x2, y2, x3, y3);
    context.strokeStyle = colorWithAlpha(stream % 3 ? accent2 : '#ffffff', .025 + drive * .31 + caustic * .13);
    context.lineWidth = .35 + drive * 1.08;
    context.stroke();
  }

  const einsteinRadius = baseRadius * (.48 + warp * .095 + Math.sin(phase * 1.45) * activity * .012);
  const brightArcCount = mobile ? 4 : 6;
  for (let arc = 0; arc < brightArcCount; arc += 1) {
    const progress = (arc + .5) / brightArcCount;
    const spectral = Math.pow(sampleAt(data, .58 + progress * .4), .56);
    const drive = clamp(caustic * .6 + spectral * .62 + peak * .16);
    if (drive < .08) continue;
    const span = Math.PI * (.16 + drive * .2);
    const center = progress * Math.PI * 2 + shear * .1 + phase * .2 + Math.sin(phase * 1.7 + arc) * activity * .035;
    context.beginPath();
    context.arc(0, 0, einsteinRadius + spectral * baseRadius * .022, center - span / 2, center + span / 2);
    context.strokeStyle = colorWithAlpha(arc % 2 ? '#ffffff' : accent2, .06 + drive * .5);
    context.lineWidth = .7 + drive * 2.1;
    context.stroke();
  }

  if (warp > .54) {
    const pulseRadius = baseRadius * (.56 + warp * .3 + Math.sin(phase * 1.3) * activity * .018);
    context.beginPath();
    context.ellipse(0, 0, pulseRadius * (1 + shear * .09), pulseRadius * (1 - shear * .07), shear * .1 + phase * .04, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent, (warp - .54) * .4);
    context.lineWidth = .7 + warp * 1.15;
    context.stroke();
  }

  context.restore();

  const horizonBreath = Math.sin(phase * 1.9) * activity * .008;
  const horizonRadius = baseRadius * (.135 + bass * .02 + kick * .028 + horizonBreath + Math.abs(warpSpring.velocity) * .0005);
  const horizonGlowRadius = horizonRadius * (2.18 + warp * .74);
  const horizonGlow = context.createRadialGradient(cx, cy, horizonRadius * .35, cx, cy, horizonGlowRadius);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,.98)');
  horizonGlow.addColorStop(.42, colorWithAlpha(accent2, .09 + warp * .21));
  horizonGlow.addColorStop(.7, colorWithAlpha(accent, .035 + caustic * .085));
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = horizonGlow;
  context.beginPath();
  context.arc(cx, cy, horizonGlowRadius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(2,1,7,.96)';
  context.beginPath();
  context.arc(cx, cy, horizonRadius, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = colorWithAlpha('#ffffff', .08 + caustic * .34 + peak * .12);
  context.lineWidth = .75 + warp * 1.38;
  context.beginPath();
  context.arc(cx, cy, horizonRadius * (1.05 + warp * .04), 0, Math.PI * 2);
  context.stroke();
}
