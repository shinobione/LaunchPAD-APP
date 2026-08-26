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
  return {
    x: cx + x * cos - y * sin,
    y: cy + x * sin + y * cos
  };
}

function plateGeometry(cx, cy, length, thickness, angle, skew, fold) {
  const halfL = length * .5;
  const halfT = thickness * .5;
  const bevel = Math.min(length * .13, thickness * .9);
  const points = [
    transformPoint(cx, cy, angle, -halfL + bevel + skew, -halfT),
    transformPoint(cx, cy, angle, halfL - bevel * .7 - skew, -halfT * (1 - fold * .12)),
    transformPoint(cx, cy, angle, halfL, -halfT * .18 + fold * halfT * .12),
    transformPoint(cx, cy, angle, halfL - bevel * .55, halfT),
    transformPoint(cx, cy, angle, -halfL + bevel * .45, halfT * (1 + fold * .08)),
    transformPoint(cx, cy, angle, -halfL, halfT * .14 - fold * halfT * .12)
  ];
  const center = transformPoint(cx, cy, angle, length * (.08 + fold * .12), 0);
  return { points, center };
}

function tracePlate(context, geometry) {
  const { points } = geometry;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y);
  context.closePath();
}

function drawPlate(context, plate, palette, reflection, high, depth, pressure) {
  const { geometry } = plate;
  const { points, center } = geometry;
  const near = Math.pow(depth, .72);
  const fill = context.createLinearGradient(points[0].x, points[0].y, points[3].x, points[3].y);
  const bodyAlpha = .065 + near * .09 + plate.drive * .065 + pressure * .025;
  fill.addColorStop(0, rgba(palette.dark, .025 + near * .018));
  fill.addColorStop(.18, rgba(palette.base, bodyAlpha * .72));
  fill.addColorStop(.48, rgba(palette.secondary, bodyAlpha));
  fill.addColorStop(.76, rgba(palette.base, bodyAlpha * .82));
  fill.addColorStop(1, rgba(palette.dark, .035 + near * .025));

  tracePlate(context, geometry);
  context.fillStyle = fill;
  context.fill();

  // A dark facet gives the slab actual volume instead of a faint outline.
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  context.lineTo(center.x, center.y);
  context.lineTo(points[4].x, points[4].y);
  context.lineTo(points[5].x, points[5].y);
  context.closePath();
  context.fillStyle = rgba(palette.dark, .045 + near * .065 + plate.drive * .025);
  context.fill();

  context.beginPath();
  context.moveTo(points[1].x, points[1].y);
  context.lineTo(points[2].x, points[2].y);
  context.lineTo(points[3].x, points[3].y);
  context.lineTo(center.x, center.y);
  context.closePath();
  context.fillStyle = rgba(palette.highlight, .018 + plate.drive * .038 + high * .026);
  context.fill();

  tracePlate(context, geometry);
  context.strokeStyle = rgba(palette.edge, .16 + near * .22 + plate.drive * .18);
  context.lineWidth = .8 + near * 1.45 + plate.drive * .75;
  context.stroke();

  // Specular band crossing the pane. It is intentionally bright but narrow.
  const span = plate.length * .78;
  const sweep = (reflection - .5) * span;
  const nx = -Math.sin(plate.angle);
  const ny = Math.cos(plate.angle);
  const ux = Math.cos(plate.angle);
  const uy = Math.sin(plate.angle);
  const specularWidth = plate.thickness * (.08 + high * .13 + plate.drive * .07);
  const sx = plate.cx + ux * sweep;
  const sy = plate.cy + uy * sweep;
  context.beginPath();
  context.moveTo(sx - nx * plate.thickness * .54, sy - ny * plate.thickness * .54);
  context.lineTo(sx + nx * plate.thickness * .54, sy + ny * plate.thickness * .54);
  context.strokeStyle = rgba(palette.highlight, .08 + high * .24 + near * .08 + plate.drive * .1);
  context.lineWidth = 1 + specularWidth;
  context.stroke();

  // One restrained internal seam makes the geometry read as folded glass.
  if (plate.drive > .08) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    context.lineTo(center.x, center.y);
    context.lineTo(points[3].x, points[3].y);
    context.strokeStyle = rgba(palette.secondary, .07 + plate.drive * .16 + near * .05);
    context.lineWidth = .6 + plate.drive * .9;
    context.stroke();
  }
}

/**
 * Kinetic Glass — Build 118 visual-impact pass.
 *
 * The scene is deliberately bold without flashing: broad faceted slabs occupy
 * the frame, cross in depth, and visibly re-compose over several seconds.
 * Bass/punch push the stack toward camera, mids alter folding and fan angles,
 * and highs sweep restrained specular highlights across the glass.
 */
export function drawKineticGlassMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const minSide = Math.min(width, height);
  const rawBass = average(data, 0, data.length * .2);
  const rawMid = average(data, data.length * .2, data.length * .66);
  const rawHigh = average(data, data.length * .66, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.62, featureWeight: .34, exponent: .64 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.54, featureWeight: .34, exponent: .66 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.6, featureWeight: .32, exponent: .64 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.5, featureWeight: .34, exponent: .66 });
  const kick = feature(features, 'kick');
  const punch = feature(features, 'punch');
  const dynamics = feature(features, 'dynamics');

  const pressureTarget = clamp(bass * .62 + punch * .62 + kick * .34 + energy * .16);
  const foldTarget = clamp(mid * .72 + dynamics * .25 + bass * .1);
  const detailTarget = clamp(high * .72 + dynamics * .2 + energy * .14);
  const motion = beginMotionFrame(context, time);
  const pressureSpring = springChannel(motion, 'glass-pressure', pressureTarget, { stiffness: 48, damping: 7.8, maximum: 1.2 });
  const foldSpring = springChannel(motion, 'glass-fold', foldTarget, { stiffness: 34, damping: 8.2, maximum: 1.1 });
  const detailSpring = springChannel(motion, 'glass-detail', detailTarget, { stiffness: 42, damping: 8.6, maximum: 1.1 });
  const pressure = clamp(pressureSpring.value + pressureSpring.velocity * .012, 0, 1.18);
  const fold = clamp(foldSpring.value + foldSpring.velocity * .007, 0, 1.08);
  const detail = clamp(detailSpring.value + detailSpring.velocity * .005, 0, 1.08);
  const flow = advanceMotionPhase(motion, 'kinetic-glass-flow', clamp(energy * .5 + mid * .27 + bass * .18 + high * .12), {
    baseSpeed: .48,
    dynamicSpeed: 2.15,
    response: 4.8,
    release: 8.2
  });
  const phase = flow.phase;

  const accentRgb = parseHex(accent);
  const accent2Rgb = parseHex(accent2);
  const white = [241, 246, 255];
  const dark = [5, 5, 12];
  const palette = {
    base: mixRgb(accentRgb, white, .18),
    secondary: mixRgb(accent2Rgb, white, .14),
    edge: mixRgb(accent2Rgb, white, .38),
    highlight: mixRgb(white, accent2Rgb, .08),
    dark: mixRgb(dark, accentRgb, .1)
  };

  const background = context.createRadialGradient(width * .5, height * .48, 0, width * .5, height * .48, Math.max(width, height) * .68);
  background.addColorStop(0, rgba(palette.base, .032 + pressure * .035));
  background.addColorStop(.4, rgba(palette.secondary, .018 + detail * .025));
  background.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const plateCount = mobile ? 6 : 9;
  const sceneMorph = .5 + .5 * Math.sin(phase * .26 + .35);
  const fan = Math.sin(phase * .34 + .8);
  const cross = Math.sin(phase * .21 - .6);
  const globalDriftX = Math.sin(phase * .24 + .4) * width * (.035 + energy * .04);
  const globalDriftY = Math.cos(phase * .2) * height * (.028 + mid * .035);
  const globalRoll = Math.sin(phase * .17) * .16 + fan * .09 + fold * .05;
  const globalScale = 1 + pressure * (mobile ? .12 : .22);

  const plates = [];
  for (let index = 0; index < plateCount; index += 1) {
    const t = plateCount === 1 ? .5 : index / (plateCount - 1);
    const side = index % 2 ? 1 : -1;
    const spectral = Math.pow(sampleAt(data, .06 + t * .88), .68);
    const baseDepth = .12 + t * .78;
    const depthOscillation = Math.sin(phase * .44 + index * .82) * .2;
    const punchWave = Math.max(0, Math.sin(phase * 5.2 - index * .72)) * punch * .24;
    const depth = clamp(baseDepth + depthOscillation + punchWave + pressure * (.08 + t * .08), .04, 1.12);
    const near = Math.pow(depth, .78);
    const lane = (t - .5) * 2;

    // Scene morph moves from a spread fan to a crossing architectural stack.
    const spreadX = lane * width * (.22 + sceneMorph * .08);
    const stackX = side * width * (.08 + cross * .035) + lane * width * .08;
    const x = width * .5
      + spreadX * (1 - sceneMorph)
      + stackX * sceneMorph
      + globalDriftX
      + Math.sin(phase * .55 + index * 1.14) * width * (.022 + near * .035);
    const y = height * (.5 + side * (.13 + fan * .055) + lane * .05)
      + globalDriftY
      + Math.cos(phase * .37 + index * .73) * height * (.045 + near * .055);

    const nearBoost = 1 + Math.max(0, depth - .62) * 1.35;
    const length = width * (mobile ? .34 : .32) * (1 + near * .72) * globalScale * nearBoost;
    const thickness = minSide * (mobile ? .09 : .115) * (.8 + near * 1.08) * (1 + spectral * .32);
    const angleBase = side * (.58 - sceneMorph * .24) + lane * .12;
    const angle = globalRoll
      + angleBase
      + Math.sin(phase * .48 + index * .76) * (.18 + fold * .16)
      + punchWave * side * .28;
    const skew = length * (.015 + fold * .035) * Math.sin(phase * .42 + index * .91);
    const localFold = clamp(.18 + fold * .72 + spectral * .18);
    const drive = clamp(spectral * .56 + fold * .22 + detail * .2 + punch * .18 + near * .08);

    plates.push({
      index,
      depth,
      cx: x,
      cy: y,
      length,
      thickness,
      angle,
      drive,
      geometry: plateGeometry(x, y, length, thickness, angle, skew, localFold)
    });
  }

  plates.sort((a, b) => a.depth - b.depth);
  context.save();
  context.globalCompositeOperation = 'source-over';
  for (const plate of plates) {
    const reflection = .5 + .5 * Math.sin(phase * (1.45 + plate.index * .035) + plate.index * .77 + detail * .9);
    drawPlate(context, plate, palette, reflection, detail, plate.depth, pressure);
  }
  context.restore();

  // Sparse connectors only appear when detail is present; they never dominate.
  context.save();
  context.globalCompositeOperation = 'lighter';
  const connectorCount = mobile ? 2 : 3;
  for (let index = 0; index < connectorCount; index += 1) {
    const a = plates[(index * 3 + 1) % plates.length];
    const b = plates[(index * 3 + 4) % plates.length];
    if (!a || !b) continue;
    const bridgeDrive = clamp(detail * .62 + Math.pow(sampleAt(data, .48 + index * .13), .68) * .5 - .22);
    if (bridgeDrive <= .03) continue;
    const bend = Math.sin(phase * 1.15 + index) * minSide * .055;
    context.beginPath();
    context.moveTo(a.cx, a.cy);
    context.quadraticCurveTo((a.cx + b.cx) * .5, (a.cy + b.cy) * .5 + bend, b.cx, b.cy);
    context.strokeStyle = rgba(index % 2 ? palette.edge : palette.secondary, .045 + bridgeDrive * .18);
    context.lineWidth = .55 + bridgeDrive * .8;
    context.stroke();
  }
  context.restore();
}
