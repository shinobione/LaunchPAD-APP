import { advanceMotionPhase, beginMotionFrame, shapeAudioDrive, springChannel } from './motion-spring.js';

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));
const TAU = Math.PI * 2;

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
  if (!match) return [182, 208, 255];
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

function plateGeometry(cx, cy, length, thickness, angle, skew, bend) {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const nx = -uy;
  const ny = ux;
  const halfL = length * .5;
  const halfT = thickness * .5;
  const x1 = cx - ux * halfL;
  const y1 = cy - uy * halfL;
  const x2 = cx + ux * halfL;
  const y2 = cy + uy * halfL;
  return {
    p1: { x: x1 + nx * halfT + ux * skew, y: y1 + ny * halfT + uy * skew },
    p2: { x: x2 + nx * halfT - ux * skew, y: y2 + ny * halfT - uy * skew },
    p3: { x: x2 - nx * halfT - ux * skew, y: y2 - ny * halfT - uy * skew },
    p4: { x: x1 - nx * halfT + ux * skew, y: y1 - ny * halfT + uy * skew },
    c1: { x: cx - ux * length * .12 + nx * bend, y: cy - uy * length * .12 + ny * bend },
    c2: { x: cx + ux * length * .12 + nx * bend, y: cy + uy * length * .12 + ny * bend },
    ux, uy, nx, ny
  };
}

function drawPlate(context, plate, palette, reflection, high, depth) {
  const { p1, p2, p3, p4, c1, c2, ux, uy, nx, ny } = plate.geometry;
  const fill = context.createLinearGradient(p1.x, p1.y, p3.x, p3.y);
  const bodyAlpha = .028 + depth * .045 + plate.drive * .03;
  fill.addColorStop(0, rgba(palette.dark, .012));
  fill.addColorStop(.22, rgba(palette.base, bodyAlpha * .7));
  fill.addColorStop(.5, rgba(palette.secondary, bodyAlpha));
  fill.addColorStop(.78, rgba(palette.base, bodyAlpha * .62));
  fill.addColorStop(1, rgba(palette.dark, .008));

  context.beginPath();
  context.moveTo(p1.x, p1.y);
  context.quadraticCurveTo(c1.x, c1.y, p2.x, p2.y);
  context.lineTo(p3.x, p3.y);
  context.quadraticCurveTo(c2.x, c2.y, p4.x, p4.y);
  context.closePath();
  context.fillStyle = fill;
  context.fill();

  context.strokeStyle = rgba(palette.edge, .09 + depth * .11 + plate.drive * .08);
  context.lineWidth = .7 + depth * 1.05;
  context.stroke();

  const shineOffset = (reflection - .5) * plate.length * .62;
  const shineCx = plate.cx + ux * shineOffset;
  const shineCy = plate.cy + uy * shineOffset;
  const shineLength = plate.thickness * (.65 + high * 1.2);
  context.beginPath();
  context.moveTo(shineCx - nx * shineLength, shineCy - ny * shineLength);
  context.lineTo(shineCx + nx * shineLength, shineCy + ny * shineLength);
  context.strokeStyle = rgba(palette.highlight, .035 + high * .15 + plate.drive * .05);
  context.lineWidth = .7 + high * .85;
  context.stroke();

  if (plate.drive > .16) {
    const seamOffset = plate.length * (.16 + plate.drive * .16);
    context.beginPath();
    context.moveTo(plate.cx - ux * seamOffset - nx * plate.thickness * .24, plate.cy - uy * seamOffset - ny * plate.thickness * .24);
    context.lineTo(plate.cx + ux * seamOffset + nx * plate.thickness * .24, plate.cy + uy * seamOffset + ny * plate.thickness * .24);
    context.strokeStyle = rgba(palette.secondary, .025 + plate.drive * .12);
    context.lineWidth = .55 + plate.drive * .65;
    context.stroke();
  }
}

/**
 * Kinetic Glass — Build 117.
 *
 * Full-frame asymmetric translucent plates. The composition itself changes with
 * the music: bass shifts depth and pressure, mids alter fold angles, highs sweep
 * thin reflections, and kick/punch sends a visible wave across the plate stack.
 */
export function drawKineticGlassMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const minSide = Math.min(width, height);
  const rawBass = average(data, 0, data.length * .2);
  const rawMid = average(data, data.length * .2, data.length * .66);
  const rawHigh = average(data, data.length * .66, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.5, featureWeight: .32, exponent: .68 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.42, featureWeight: .34, exponent: .7 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.5, featureWeight: .3, exponent: .68 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.38, featureWeight: .32, exponent: .7 });
  const kick = feature(features, 'kick');
  const punch = feature(features, 'punch');
  const dynamics = feature(features, 'dynamics');

  const pressureTarget = clamp(bass * .58 + punch * .54 + kick * .28 + energy * .12);
  const foldTarget = clamp(mid * .68 + dynamics * .24 + bass * .08);
  const detailTarget = clamp(high * .68 + dynamics * .18 + energy * .12);
  const motion = beginMotionFrame(context, time);
  const pressureSpring = springChannel(motion, 'glass-pressure', pressureTarget, { stiffness: 44, damping: 8.2, maximum: 1.18 });
  const foldSpring = springChannel(motion, 'glass-fold', foldTarget, { stiffness: 30, damping: 8.6, maximum: 1.08 });
  const detailSpring = springChannel(motion, 'glass-detail', detailTarget, { stiffness: 38, damping: 9.1, maximum: 1.08 });
  const pressure = clamp(pressureSpring.value + pressureSpring.velocity * .01, 0, 1.15);
  const fold = clamp(foldSpring.value + foldSpring.velocity * .006, 0, 1.06);
  const detail = clamp(detailSpring.value + detailSpring.velocity * .004, 0, 1.06);
  const flow = advanceMotionPhase(motion, 'kinetic-glass-flow', clamp(energy * .52 + mid * .24 + bass * .16 + high * .1), {
    baseSpeed: .34,
    dynamicSpeed: 1.55,
    response: 4.4,
    release: 8.5
  });
  const phase = flow.phase;

  const accentRgb = parseHex(accent);
  const accent2Rgb = parseHex(accent2);
  const white = [236, 242, 255];
  const dark = [8, 8, 15];
  const palette = {
    base: mixRgb(accentRgb, white, .26),
    secondary: mixRgb(accent2Rgb, white, .2),
    edge: mixRgb(accent2Rgb, white, .46),
    highlight: mixRgb(white, accent2Rgb, .12),
    dark: mixRgb(dark, accentRgb, .08)
  };

  const background = context.createRadialGradient(width * .54, height * .48, 0, width * .54, height * .48, Math.max(width, height) * .72);
  background.addColorStop(0, rgba(palette.base, .016 + pressure * .018));
  background.addColorStop(.42, rgba(palette.secondary, .008 + detail * .012));
  background.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const plateCount = mobile ? 6 : 9;
  const sceneMorph = .5 + .5 * Math.sin(phase * .31 + .4);
  const fan = Math.sin(phase * .23 + 1.1);
  const weave = Math.sin(phase * .41 + .8);
  const globalScale = 1 + pressure * (mobile ? .08 : .16);
  const globalRoll = Math.sin(phase * .18) * .12 + fold * .06;
  const globalDriftX = Math.sin(phase * .27 + .7) * width * (.028 + energy * .028);
  const globalDriftY = Math.cos(phase * .21) * height * (.022 + mid * .02);

  const plates = [];
  for (let index = 0; index < plateCount; index += 1) {
    const t = plateCount === 1 ? .5 : index / (plateCount - 1);
    const spectral = Math.pow(sampleAt(data, .08 + t * .86), .74);
    const depthBase = .18 + t * .72;
    const depthWave = Math.sin(phase * .36 + index * .86) * .17;
    const punchWave = Math.sin(phase * 4.1 - index * .78) * punch * .19;
    const depth = clamp(depthBase + depthWave + punchWave, .02, 1.08);
    const perspective = .56 + depth * .94;
    const side = index % 2 ? 1 : -1;
    const lane = (t - .5) * 1.92;

    const x = width * (.5 + lane * (.27 + sceneMorph * .07) + side * Math.sin(phase * .52 + index) * .035)
      + globalDriftX
      + Math.sin(phase * .17 + index * 1.3) * width * .025 * depth;
    const y = height * (.5 + side * (.1 + weave * .055) + Math.sin(phase * .29 + index * .7) * .095)
      + globalDriftY
      + (depth - .5) * height * .085;

    const nearBoost = 1 + Math.max(0, depth - .72) * 1.08;
    const length = Math.max(width, height) * (mobile ? .5 : .46) * perspective * globalScale * nearBoost;
    const thickness = minSide * (mobile ? .055 : .064) * (.72 + depth * .72) * (1 + spectral * .26);
    const angle = globalRoll
      + side * (.55 - sceneMorph * .18)
      + lane * (.13 + fold * .12)
      + Math.sin(phase * .43 + index * .78) * (.14 + fold * .11)
      + punchWave * .35;
    const skew = length * (.03 + fold * .035) * Math.sin(phase * .34 + index * .9);
    const bend = thickness * (.24 + fold * .6) * Math.sin(phase * .47 + index * .63);
    const drive = clamp(spectral * .58 + fold * .22 + detail * .18 + punch * .14);

    plates.push({
      index, depth, cx: x, cy: y, length, thickness, angle, drive,
      geometry: plateGeometry(x, y, length, thickness, angle, skew, bend)
    });
  }

  plates.sort((a, b) => a.depth - b.depth);
  context.save();
  context.globalCompositeOperation = 'source-over';
  for (const plate of plates) {
    const reflection = .5 + .5 * Math.sin(phase * (1.7 + plate.index * .025) + plate.index * .71 + detail * .8);
    drawPlate(context, plate, palette, reflection, detail, plate.depth);
  }
  context.restore();

  context.save();
  context.globalCompositeOperation = 'lighter';
  const connectorCount = mobile ? 2 : 4;
  for (let index = 0; index < connectorCount; index += 1) {
    const a = plates[(index * 2) % plates.length];
    const b = plates[(index * 2 + 3) % plates.length];
    if (!a || !b) continue;
    const bridgeDrive = clamp(detail * .58 + Math.pow(sampleAt(data, .45 + index * .11), .72) * .46 - .16);
    if (bridgeDrive <= .02) continue;
    const wobble = Math.sin(phase * 1.2 + index) * minSide * .035;
    context.beginPath();
    context.moveTo(a.cx, a.cy);
    context.quadraticCurveTo((a.cx + b.cx) * .5, (a.cy + b.cy) * .5 + wobble, b.cx, b.cy);
    context.strokeStyle = rgba(index % 2 ? palette.edge : palette.secondary, .022 + bridgeDrive * .11);
    context.lineWidth = .45 + bridgeDrive * .65;
    context.stroke();
  }
  context.restore();
}
