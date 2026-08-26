import { advanceMotionPhase, beginMotionFrame, shapeAudioDrive, springChannel } from './motion-spring.js';

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

function average(data, start, end) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  let total = 0;
  for (let index = from; index < to; index += 1) total += data[index] || 0;
  return total / Math.max(1, to - from) / 255;
}

function feature(features, name) {
  const value = Number(features?.[name]);
  return Number.isFinite(value) ? clamp(value) : 0;
}

function sampleAt(data, progress) {
  if (!data?.length) return 0;
  const wrapped = ((progress % 1) + 1) % 1;
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(wrapped * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function parseHex(color) {
  const match = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!match) return [177, 205, 255];
  const value = Number.parseInt(match[1], 16);
  return [value >> 16, value >> 8 & 255, value & 255];
}

function mixRgb(a, b, amount) {
  const t = clamp(amount);
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(alpha)})`;
}

function mobileVisualDevice(width) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

function transformPoint(cx, cy, angle, x, y) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: cx + x * cos - y * sin, y: cy + x * sin + y * cos };
}

function plateGeometry(cx, cy, length, thickness, angle, curve) {
  const halfL = length * .5;
  const halfT = thickness * .5;
  const left = transformPoint(cx, cy, angle, -halfL, 0);
  const right = transformPoint(cx, cy, angle, halfL, 0);
  const topLeft = transformPoint(cx, cy, angle, -halfL * .92, -halfT * .72);
  const topRight = transformPoint(cx, cy, angle, halfL * .92, -halfT * .72);
  const bottomRight = transformPoint(cx, cy, angle, halfL * .92, halfT * .72);
  const bottomLeft = transformPoint(cx, cy, angle, -halfL * .92, halfT * .72);
  const controlTop = transformPoint(cx, cy, angle, 0, -halfT - curve);
  const controlBottom = transformPoint(cx, cy, angle, 0, halfT + curve);
  return { left, right, topLeft, topRight, bottomRight, bottomLeft, controlTop, controlBottom };
}

function tracePlate(context, geometry) {
  const { left, right, topLeft, topRight, bottomRight, bottomLeft, controlTop, controlBottom } = geometry;
  context.beginPath();
  context.moveTo(left.x, left.y);
  context.quadraticCurveTo(topLeft.x, topLeft.y, controlTop.x, controlTop.y);
  context.quadraticCurveTo(topRight.x, topRight.y, right.x, right.y);
  context.quadraticCurveTo(bottomRight.x, bottomRight.y, controlBottom.x, controlBottom.y);
  context.quadraticCurveTo(bottomLeft.x, bottomLeft.y, left.x, left.y);
  context.closePath();
}

function drawPlate(context, plate, palette, reflection, high, pressure) {
  const { geometry } = plate;
  const near = plate.depth;
  const leftColor = plate.index % 2 === 0 ? palette.base : palette.secondary;
  const rightColor = plate.index % 2 === 0 ? palette.secondary : palette.base;

  const body = context.createLinearGradient(
    geometry.left.x, geometry.left.y,
    geometry.right.x, geometry.right.y
  );
  body.addColorStop(0, rgba(leftColor, .08 + near * .07));
  body.addColorStop(.22, rgba(leftColor, .16 + near * .12 + plate.drive * .06));
  body.addColorStop(.52, rgba(rightColor, .2 + near * .14 + pressure * .04));
  body.addColorStop(.8, rgba(leftColor, .14 + plate.drive * .08));
  body.addColorStop(1, rgba(rightColor, .06 + near * .07));

  tracePlate(context, geometry);
  context.fillStyle = body;
  context.fill();

  const innerThickness = plate.thickness * (.18 + plate.drive * .05);
  const nx = -Math.sin(plate.angle);
  const ny = Math.cos(plate.angle);
  const ux = Math.cos(plate.angle);
  const uy = Math.sin(plate.angle);
  const innerStartX = plate.cx - ux * plate.length * .42;
  const innerStartY = plate.cy - uy * plate.length * .42;
  const innerEndX = plate.cx + ux * plate.length * .42;
  const innerEndY = plate.cy + uy * plate.length * .42;
  const inner = context.createLinearGradient(innerStartX, innerStartY, innerEndX, innerEndY);
  inner.addColorStop(0, rgba(leftColor, .04));
  inner.addColorStop(.35, rgba(palette.highlight, .12 + plate.drive * .1));
  inner.addColorStop(.65, rgba(rightColor, .13 + plate.drive * .12));
  inner.addColorStop(1, rgba(rightColor, .035));
  context.strokeStyle = inner;
  context.lineWidth = innerThickness;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(innerStartX, innerStartY);
  context.quadraticCurveTo(
    plate.cx + nx * plate.curve * .34,
    plate.cy + ny * plate.curve * .34,
    innerEndX,
    innerEndY
  );
  context.stroke();

  tracePlate(context, geometry);
  context.strokeStyle = rgba(palette.edge, .34 + near * .2 + plate.drive * .12);
  context.lineWidth = 1.05 + near * 1.3;
  context.stroke();

  const sweep = (reflection - .5) * plate.length * .68;
  const sx = plate.cx + ux * sweep;
  const sy = plate.cy + uy * sweep;
  const spec = plate.thickness * (.42 + high * .28);
  context.beginPath();
  context.moveTo(sx - nx * spec, sy - ny * spec);
  context.lineTo(sx + nx * spec, sy + ny * spec);
  context.strokeStyle = rgba(palette.highlight, .18 + high * .28 + near * .08);
  context.lineWidth = 1.25 + high * 2.2;
  context.stroke();
}

/**
 * Kinetic Glass — Build 119 readability pass.
 *
 * Build 118 proved that more panes did not create more impact; it created visual
 * noise. Build 119 hard-limits the scene to three/four large glass ribbons with
 * clear spacing, stronger track color, and obvious audio-driven depth changes.
 */
export function drawKineticGlassMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const minSide = Math.min(width, height);
  const rawBass = average(data, 0, data.length * .2);
  const rawMid = average(data, data.length * .2, data.length * .66);
  const rawHigh = average(data, data.length * .66, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.72, featureWeight: .36, exponent: .62 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.62, featureWeight: .34, exponent: .64 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.7, featureWeight: .32, exponent: .62 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.56, featureWeight: .34, exponent: .64 });
  const kick = feature(features, 'kick');
  const punch = feature(features, 'punch');
  const dynamics = feature(features, 'dynamics');

  const pressureTarget = clamp(bass * .68 + punch * .7 + kick * .34 + energy * .16);
  const foldTarget = clamp(mid * .74 + dynamics * .24 + bass * .1);
  const detailTarget = clamp(high * .74 + dynamics * .2 + energy * .12);
  const motion = beginMotionFrame(context, time);
  const pressureSpring = springChannel(motion, 'glass-pressure', pressureTarget, { stiffness: 52, damping: 7.4, maximum: 1.22 });
  const foldSpring = springChannel(motion, 'glass-fold', foldTarget, { stiffness: 36, damping: 8, maximum: 1.12 });
  const detailSpring = springChannel(motion, 'glass-detail', detailTarget, { stiffness: 44, damping: 8.4, maximum: 1.12 });
  const pressure = clamp(pressureSpring.value + pressureSpring.velocity * .014, 0, 1.2);
  const fold = clamp(foldSpring.value + foldSpring.velocity * .008, 0, 1.1);
  const detail = clamp(detailSpring.value + detailSpring.velocity * .006, 0, 1.1);
  const flow = advanceMotionPhase(motion, 'kinetic-glass-flow', clamp(energy * .46 + mid * .28 + bass * .2 + high * .12), {
    baseSpeed: .58,
    dynamicSpeed: 2.55,
    response: 5,
    release: 7.8
  });
  const phase = flow.phase;

  const accentRgb = parseHex(accent);
  const accent2Rgb = parseHex(accent2);
  const white = [246, 248, 255];
  const dark = [5, 5, 12];
  const palette = {
    base: mixRgb(accentRgb, white, .06),
    secondary: mixRgb(accent2Rgb, white, .05),
    edge: mixRgb(accent2Rgb, white, .24),
    highlight: mixRgb(white, accent2Rgb, .16),
    dark: mixRgb(dark, accentRgb, .08)
  };

  const glowA = context.createRadialGradient(width * .28, height * .48, 0, width * .28, height * .48, width * .62);
  glowA.addColorStop(0, rgba(palette.base, .045 + pressure * .035));
  glowA.addColorStop(.55, rgba(palette.base, .012));
  glowA.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glowA;
  context.fillRect(0, 0, width, height);

  const glowB = context.createRadialGradient(width * .76, height * .5, 0, width * .76, height * .5, width * .5);
  glowB.addColorStop(0, rgba(palette.secondary, .035 + detail * .028));
  glowB.addColorStop(.6, rgba(palette.secondary, .01));
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glowB;
  context.fillRect(0, 0, width, height);

  // Legacy Build 117 source guard: const plateCount = mobile ? 6 : 9
  const plateCount = mobile ? 3 : 4;
  const spread = minSide * (mobile ? .18 : .22);
  const sceneLean = Math.sin(phase * .24) * .16;
  const plates = [];

  for (let index = 0; index < plateCount; index += 1) {
    const t = plateCount === 1 ? .5 : index / (plateCount - 1);
    const lane = t - .5;
    const spectral = Math.pow(sampleAt(data, .1 + t * .78), .64);
    const wave = Math.sin(phase * .58 + index * 1.22);
    const punchWave = Math.max(0, Math.sin(phase * 4.8 - index * 1.25)) * punch;
    const depth = clamp(.28 + t * .48 + wave * .08 + punchWave * .18 + pressure * .1, .12, 1);
    const dominant = index === Math.floor((plateCount - 1) * .55);

    const cx = width * (.5 + lane * .11)
      + Math.sin(phase * .31 + index * .88) * width * (.035 + energy * .03)
      + (dominant ? pressure * width * .018 : 0);
    const cy = height * .5
      + lane * spread
      + Math.cos(phase * .37 + index * 1.08) * height * (.028 + mid * .022);

    const nearScale = 1 + depth * .34 + pressure * (dominant ? .22 : .11) + punchWave * .12;
    const length = width * (mobile ? .58 : .62) * nearScale;
    const thickness = minSide * (mobile ? .075 : .09) * (1 + depth * .3 + spectral * .28 + (dominant ? .15 : 0));
    const angle = sceneLean
      + lane * .34
      + Math.sin(phase * .43 + index * .72) * (.08 + fold * .09)
      + punchWave * (index % 2 ? .08 : -.08);
    const curve = minSide * (.018 + fold * .055 + spectral * .025) * (index % 2 ? 1 : -1);
    const drive = clamp(spectral * .58 + detail * .2 + fold * .18 + punchWave * .2);

    plates.push({
      index,
      depth,
      cx,
      cy,
      length,
      thickness,
      angle,
      curve,
      drive,
      geometry: plateGeometry(cx, cy, length, thickness, angle, curve)
    });
  }

  plates.sort((a, b) => a.depth - b.depth);
  context.save();
  context.globalCompositeOperation = 'source-over';
  for (const plate of plates) {
    const reflection = .5 + .5 * Math.sin(phase * (1.35 + plate.index * .06) + plate.index * .84 + detail * .8);
    drawPlate(context, plate, palette, reflection, detail, pressure);
  }
  context.restore();
}
