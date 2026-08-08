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
  const value = Math.sin(index * 67.731 + seed * 31.917) * 43758.5453;
  return value - Math.floor(value);
}

function point(angle, radius) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Gravity Lens — Build 57 kinetic-flow pass.
 *
 * The lens now has continuous signal-driven precession. Steady grooves keep the
 * field moving through space, while kicks deepen and accelerate the distortion
 * instead of merely switching the geometry to a bigger static pose.
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

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.5, featureWeight: .28, exponent: .68 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.48, featureWeight: .3, exponent: .69 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.58, featureWeight: .28, exponent: .66 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.62, featureWeight: .24, exponent: .63 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const grooveTarget = clamp(energy * .48 + mid * .27 + bass * .18 + high * .13);
  const warpTarget = clamp(bass * .4 + kick * .66 + peak * .16 + dynamics * .11);
  const shearTarget = clamp(mid * .58 + high * .22 + dynamics * .15 + grooveTarget * .12);
  const causticTarget = clamp(high * .58 + peak * .3 + dynamics * .16 + mid * .16);

  const motion = beginMotionFrame(context, time);
  const grooveSpring = springChannel(motion, 'groove', grooveTarget, { stiffness: 28, damping: 6.4, maximum: 1.08 });
  const warpSpring = springChannel(motion, 'warp', warpTarget, { stiffness: 48, damping: 6.9, maximum: 1.25 });
  const shearSpring = springChannel(motion, 'shear', shearTarget, { stiffness: 34, damping: 7.1, maximum: 1.16 });
  const causticSpring = springChannel(motion, 'caustic', causticTarget, { stiffness: 42, damping: 7.5, maximum: 1.18 });

  const groove = clamp(grooveSpring.value, 0, 1.06);
  const warp = clamp(warpSpring.value + warpSpring.velocity * .012, 0, 1.24);
  const shear = clamp(shearSpring.value + shearSpring.velocity * .006, 0, 1.14);
  const caustic = clamp(causticSpring.value + causticSpring.velocity * .005, 0, 1.16);
  const flow = advanceMotionPhase(motion, 'gravity-flow', clamp(groove * .78 + mid * .14 + high * .13), {
    baseSpeed: .46,
    dynamicSpeed: 2.15,
    response: 5.4,
    release: 9
  });
  const phase = flow.phase;

  const bandCount = mobile ? 4 : 6;
  const arcCount = mobile ? 12 : 20;
  const streamCount = mobile ? 8 : 14;
  const shadowCap = mobile ? 5 : 12;
  const baseRadius = minSide * (mobile ? .315 : .34);

  // A slight wandering lens centre makes the field feel spatial rather than
  // diagrammatic. Travel disappears with groove energy.
  const centerTravel = baseRadius * (.018 + groove * .055);
  const lensX = Math.sin(phase * .48) * centerTravel * groove;
  const lensY = Math.cos(phase * .37 + .9) * centerTravel * .62 * groove;
  const globalTilt = Math.sin(phase * .29) * groove * .11;

  const atmosphereRadius = baseRadius * (1.8 + groove * .2 + warp * .34);
  const atmosphere = context.createRadialGradient(cx + lensX, cy + lensY, 0, cx + lensX, cy + lensY, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .04 + groove * .05 + warp * .14));
  atmosphere.addColorStop(.3, colorWithAlpha(accent, .022 + shear * .085));
  atmosphere.addColorStop(.7, colorWithAlpha(accent2, .01 + caustic * .05));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx + lensX, cy + lensY);
  context.rotate(globalTilt);
  context.globalCompositeOperation = 'lighter';

  for (let band = 0; band < bandCount; band += 1) {
    const bandProgress = band / Math.max(1, bandCount - 1);
    const direction = band % 2 ? -1 : 1;
    const breathing = Math.sin(phase * (1.2 + bandProgress * .22) - band * .72)
      * baseRadius * (.018 + groove * .04) * groove;
    const radialDrift = Math.cos(phase * (.72 + bandProgress * .18) + band * 1.1)
      * baseRadius * groove * (.01 + bandProgress * .013);
    const ringRadius = baseRadius * (.33 + bandProgress * .73 + warp * (.035 + bandProgress * .055)) + breathing + radialDrift;
    const ellipticity = 1
      + shear * (.055 + bandProgress * .06)
      + Math.sin(phase * 1.1 + band) * groove * (.022 + bandProgress * .012);
    const rotation = direction * (
      phase * (.5 + bandProgress * .22)
      + shear * .07
      + warpSpring.velocity * .002
    );

    context.save();
    context.rotate(rotation);
    context.scale(ellipticity, 1 / ellipticity);

    for (let arc = 0; arc < arcCount; arc += 1) {
      const progress = (arc + .5) / arcCount;
      const spectral = Math.pow(sampleAt(data, progress * .86 + bandProgress * .1), .6);
      const personality = hash(arc, band + 3) * 2 - 1;
      const drive = clamp(spectral * .7 + warp * (1 - bandProgress) * .25 + shear * .18 + caustic * bandProgress * .2 + groove * .12);
      const arcSpan = Math.PI * 2 / arcCount;
      const orbitRipple = Math.sin(phase * (2 + hash(arc, 5) * .45) + arc * .42 - band * .65)
        * baseRadius * (.005 + groove * .018) * groove;
      const lensPull = warp * baseRadius * (.01 + (1 - bandProgress) * .018) * personality;
      const localRadius = ringRadius + spectral * baseRadius * .028 + lensPull + orbitRipple;
      const gap = arcSpan * (.12 + (1 - drive) * .075);
      const start = arc * arcSpan + gap + personality * shear * .018 + Math.sin(phase * 1.4 + arc * .31) * groove * .022;
      const end = start + arcSpan * (.7 + drive * .18) - gap * .35;

      context.beginPath();
      context.arc(0, 0, localRadius, start, end);
      context.strokeStyle = colorWithAlpha((arc + band) % 3 === 0 ? accent2 : accent,
        .045 + drive * .38 + groove * .05 + caustic * bandProgress * .1);
      context.lineWidth = .55 + drive * 1.55 + (1 - bandProgress) * warp * .7;
      context.shadowColor = (arc + band) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, drive * shadowCap * .7 + caustic * 3);
      context.stroke();
    }
    context.restore();
  }

  context.shadowBlur = 0;
  for (let stream = 0; stream < streamCount; stream += 1) {
    const progress = (stream + .5) / streamCount;
    const personality = hash(stream, 19) * 2 - 1;
    const spectral = Math.pow(sampleAt(data, .4 + progress * .58), .56);
    const drive = clamp(caustic * .38 + spectral * .62 + shear * .2 + warp * .15 + groove * .14);
    const sweep = phase * (.32 + hash(stream, 3) * .08);
    const streamDrift = Math.sin(phase * 1.65 + stream * .66) * groove;
    const angle = progress * Math.PI * 2 + personality * .08 + sweep + streamDrift * .08;
    const outer = baseRadius * (1.2 + drive * .22 + Math.abs(streamDrift) * .04);
    const inner = baseRadius * (.38 + warp * .08 + Math.sin(phase * 1.2 + stream) * groove * .025);
    const bend = personality * (.24 + shear * .32 + warp * .16) + streamDrift * .2;
    const [x1, y1] = point(angle - .24, outer);
    const [x2, y2] = point(angle + bend, inner);
    const [x3, y3] = point(angle + .24 + streamDrift * .045, outer * .98);

    context.beginPath();
    context.moveTo(x1, y1);
    context.quadraticCurveTo(x2, y2, x3, y3);
    context.strokeStyle = colorWithAlpha(stream % 3 ? accent2 : '#ffffff', .025 + drive * .33 + groove * .05 + caustic * .14);
    context.lineWidth = .35 + drive * 1.12;
    context.stroke();
  }

  const einsteinRadius = baseRadius * (.46 + warp * .11 + Math.sin(phase * 1.42) * groove * .035);
  const brightArcCount = mobile ? 4 : 6;
  for (let arc = 0; arc < brightArcCount; arc += 1) {
    const progress = (arc + .5) / brightArcCount;
    const spectral = Math.pow(sampleAt(data, .58 + progress * .4), .54);
    const drive = clamp(caustic * .58 + spectral * .6 + peak * .18 + groove * .1);
    if (drive < .07) continue;
    const span = Math.PI * (.16 + drive * .22);
    const center = progress * Math.PI * 2 + shear * .1 + phase * .58 + Math.sin(phase * 1.8 + arc) * groove * .08;
    context.beginPath();
    context.arc(0, 0, einsteinRadius + spectral * baseRadius * .026, center - span / 2, center + span / 2);
    context.strokeStyle = colorWithAlpha(arc % 2 ? '#ffffff' : accent2, .06 + drive * .52);
    context.lineWidth = .7 + drive * 2.15;
    context.stroke();
  }

  if (warp > .46) {
    const pulseRadius = baseRadius * (.54 + warp * .34 + Math.sin(phase * 1.25) * groove * .045);
    context.beginPath();
    context.ellipse(0, 0, pulseRadius * (1 + shear * .1), pulseRadius * (1 - shear * .08), shear * .1 + phase * .12, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent, (warp - .46) * .42);
    context.lineWidth = .7 + warp * 1.2;
    context.stroke();
  }

  context.restore();

  const horizonBreath = Math.sin(phase * 1.92) * groove * .014;
  const horizonRadius = baseRadius * (.13 + bass * .025 + kick * .032 + horizonBreath + warpSpring.velocity * .001);
  const horizonGlowRadius = horizonRadius * (2.15 + groove * .2 + warp * .82);
  const horizonGlow = context.createRadialGradient(cx + lensX, cy + lensY, horizonRadius * .35, cx + lensX, cy + lensY, horizonGlowRadius);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,.98)');
  horizonGlow.addColorStop(.42, colorWithAlpha(accent2, .09 + warp * .23));
  horizonGlow.addColorStop(.7, colorWithAlpha(accent, .035 + caustic * .095));
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = horizonGlow;
  context.beginPath();
  context.arc(cx + lensX, cy + lensY, Math.max(1, horizonGlowRadius), 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(2,1,7,.96)';
  context.beginPath();
  context.arc(cx + lensX, cy + lensY, Math.max(1, horizonRadius), 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = colorWithAlpha('#ffffff', .08 + caustic * .36 + peak * .14);
  context.lineWidth = .75 + warp * 1.45;
  context.beginPath();
  context.arc(cx + lensX, cy + lensY, Math.max(1, horizonRadius * (1.05 + warp * .045)), 0, Math.PI * 2);
  context.stroke();
}
