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
 * Gravity Lens
 *
 * The shared FFT bends the visual field instead of exploding an object:
 * bass/kicks deepen the lens, mids shear its orbital bands, and highs create
 * bright caustic arcs/stream distortion. Time contributes only signal-gated
 * drift, so a paused or silent track settles into a stable lens.
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

  const activity = clamp(energy * .7 + bass * .28 + mid * .14 + high * .16 + kick * .2);
  const warp = clamp(Math.pow(bass, .64) * .62 + kick * .84 + peak * .22 + dynamics * .18);
  const caustic = clamp(high * .7 + peak * .38 + dynamics * .18 + mid * .12);
  const shear = clamp(mid * .74 + high * .16 + dynamics * .16);
  const drift = time * activity * .032;

  const bandCount = mobile ? 4 : 6;
  const arcCount = mobile ? 12 : 20;
  const streamCount = mobile ? 8 : 14;
  const shadowCap = mobile ? 5 : 12;
  const baseRadius = minSide * (mobile ? .31 : .335);

  const atmosphereRadius = baseRadius * (1.85 + warp * .28);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .04 + warp * .12));
  atmosphere.addColorStop(.28, colorWithAlpha(accent, .025 + mid * .07));
  atmosphere.addColorStop(.68, colorWithAlpha(accent2, .012 + high * .035));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  for (let band = 0; band < bandCount; band += 1) {
    const bandProgress = band / Math.max(1, bandCount - 1);
    const ringRadius = baseRadius * (.34 + bandProgress * .72 + warp * (.025 + bandProgress * .045));
    const ellipticity = 1 + shear * (.035 + bandProgress * .045);
    const rotation = (band % 2 ? -1 : 1) * (drift * (.45 + bandProgress * .28) + shear * .028);

    context.save();
    context.rotate(rotation);
    context.scale(ellipticity, 1 / ellipticity);

    for (let arc = 0; arc < arcCount; arc += 1) {
      const progress = (arc + .5) / arcCount;
      const spectral = Math.pow(sampleAt(data, progress * .86 + bandProgress * .1), .64);
      const personality = hash(arc, band + 3) * 2 - 1;
      const drive = clamp(spectral * .78 + warp * (1 - bandProgress) * .28 + mid * .18 + high * bandProgress * .2);
      const arcSpan = Math.PI * 2 / arcCount;
      const lensPull = warp * baseRadius * (.008 + (1 - bandProgress) * .014) * personality;
      const localRadius = ringRadius + spectral * baseRadius * .022 + lensPull;
      const gap = arcSpan * (.14 + (1 - drive) * .08);
      const start = arc * arcSpan + gap + personality * shear * .012;
      const end = start + arcSpan * (.68 + drive * .18) - gap * .4;

      context.beginPath();
      context.arc(0, 0, localRadius, start, end);
      context.strokeStyle = colorWithAlpha(
        (arc + band) % 3 === 0 ? accent2 : accent,
        .045 + drive * .34 + caustic * bandProgress * .09
      );
      context.lineWidth = .55 + drive * 1.45 + (1 - bandProgress) * warp * .6;
      context.shadowColor = (arc + band) % 3 === 0 ? accent2 : accent;
      context.shadowBlur = Math.min(shadowCap, drive * shadowCap * .7 + caustic * 2.5);
      context.stroke();
    }
    context.restore();
  }

  context.shadowBlur = 0;

  for (let stream = 0; stream < streamCount; stream += 1) {
    const progress = (stream + .5) / streamCount;
    const personality = hash(stream, 19) * 2 - 1;
    const spectral = Math.pow(sampleAt(data, .42 + progress * .58), .6);
    const drive = clamp(high * .38 + spectral * .66 + mid * .18 + warp * .12);
    const angle = progress * Math.PI * 2 + personality * .08 + drift * .08;
    const outer = baseRadius * (1.22 + drive * .16);
    const inner = baseRadius * (.42 + warp * .06);
    const bend = personality * (.22 + shear * .26 + warp * .12);
    const [x1, y1] = point(angle - .18, outer);
    const [x2, y2] = point(angle + bend, inner);
    const [x3, y3] = point(angle + .18, outer * .98);

    context.beginPath();
    context.moveTo(x1, y1);
    context.quadraticCurveTo(x2, y2, x3, y3);
    context.strokeStyle = colorWithAlpha(stream % 3 ? accent2 : '#ffffff', .025 + drive * .3 + caustic * .12);
    context.lineWidth = .35 + drive * 1.05;
    context.stroke();
  }

  const einsteinRadius = baseRadius * (.48 + warp * .085);
  const brightArcCount = mobile ? 4 : 6;
  for (let arc = 0; arc < brightArcCount; arc += 1) {
    const progress = (arc + .5) / brightArcCount;
    const spectral = Math.pow(sampleAt(data, .58 + progress * .4), .56);
    const drive = clamp(caustic * .6 + spectral * .62 + peak * .16);
    if (drive < .08) continue;
    const span = Math.PI * (.16 + drive * .18);
    const center = progress * Math.PI * 2 + shear * .09 + drift * .06;
    context.beginPath();
    context.arc(0, 0, einsteinRadius + spectral * baseRadius * .02, center - span / 2, center + span / 2);
    context.strokeStyle = colorWithAlpha(arc % 2 ? '#ffffff' : accent2, .06 + drive * .5);
    context.lineWidth = .7 + drive * 2.1;
    context.stroke();
  }

  if (warp > .58) {
    const pulseRadius = baseRadius * (.56 + warp * .28);
    context.beginPath();
    context.ellipse(0, 0, pulseRadius * (1 + shear * .08), pulseRadius * (1 - shear * .06), shear * .08, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent, (warp - .58) * .38);
    context.lineWidth = .7 + warp * 1.1;
    context.stroke();
  }

  context.restore();

  const horizonRadius = baseRadius * (.135 + bass * .018 + kick * .025);
  const horizonGlowRadius = horizonRadius * (2.15 + warp * .7);
  const horizonGlow = context.createRadialGradient(cx, cy, horizonRadius * .35, cx, cy, horizonGlowRadius);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,.98)');
  horizonGlow.addColorStop(.42, colorWithAlpha(accent2, .09 + warp * .2));
  horizonGlow.addColorStop(.7, colorWithAlpha(accent, .035 + caustic * .08));
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
  context.lineWidth = .75 + warp * 1.35;
  context.beginPath();
  context.arc(cx, cy, horizonRadius * (1.05 + warp * .035), 0, Math.PI * 2);
  context.stroke();
}
