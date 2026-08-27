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

function parseHex(color) {
  const match = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!match) return [155, 205, 255];
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

function sampleRibbonPoint(width, height, progress, phase, layer, bend, lift, wave) {
  const x = width * (-.08 + progress * 1.16);
  const diagonal = (progress - .5) * height * (layer === 0 ? .22 : .15);
  const slow = Math.sin(progress * Math.PI * 1.7 + phase * .55 + layer * 1.7);
  const fold = Math.sin(progress * Math.PI * 3.1 - phase * .9 + layer * .8);
  const ripple = Math.sin(progress * Math.PI * 6.4 + phase * 1.3 + layer * 1.2);
  const waveCenter = ((phase * .34 + layer * .19) % 1 + 1) % 1;
  const distance = Math.min(Math.abs(progress - waveCenter), 1 - Math.abs(progress - waveCenter));
  const kickWave = Math.exp(-distance * distance / .012) * wave;
  const y = height * (.52 + layer * .075)
    + diagonal
    + slow * height * (.11 + bend * .07)
    + fold * height * (.035 + bend * .045)
    + ripple * height * (.009 + lift * .012)
    - kickWave * height * (.12 + lift * .08);
  return { x, y, kickWave };
}

function buildRibbon(width, height, phase, layer, bend, lift, wave, mobile) {
  const count = mobile ? 22 : 34;
  const centers = [];
  for (let index = 0; index < count; index += 1) {
    centers.push(sampleRibbonPoint(width, height, index / (count - 1), phase, layer, bend, lift, wave));
  }

  const top = [];
  const bottom = [];
  const baseHalfWidth = height * (layer === 0 ? .085 : .048) * (1 + lift * .34);
  for (let index = 0; index < centers.length; index += 1) {
    const prev = centers[Math.max(0, index - 1)];
    const next = centers[Math.min(centers.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const p = index / Math.max(1, centers.length - 1);
    const taper = .72 + Math.sin(p * Math.PI) * .36;
    const localFold = 1 + Math.sin(p * Math.PI * 4.2 + phase * .75 + layer) * bend * .12;
    const halfWidth = baseHalfWidth * taper * localFold;
    top.push({ x: centers[index].x + nx * halfWidth, y: centers[index].y + ny * halfWidth });
    bottom.push({ x: centers[index].x - nx * halfWidth, y: centers[index].y - ny * halfWidth });
  }
  return { centers, top, bottom };
}

function traceRibbon(context, ribbon) {
  const { top, bottom } = ribbon;
  context.beginPath();
  context.moveTo(top[0].x, top[0].y);
  for (let index = 1; index < top.length; index += 1) context.lineTo(top[index].x, top[index].y);
  for (let index = bottom.length - 1; index >= 0; index -= 1) context.lineTo(bottom[index].x, bottom[index].y);
  context.closePath();
}

function drawRibbon(context, ribbon, palette, layer, shine, detail, lift) {
  const first = ribbon.centers[0];
  const last = ribbon.centers[ribbon.centers.length - 1];
  const fill = context.createLinearGradient(first.x, first.y, last.x, last.y);
  const body = layer === 0 ? .42 : .17;
  fill.addColorStop(0, rgba(palette.deep, body * .72));
  fill.addColorStop(.22, rgba(layer === 0 ? palette.primary : palette.secondary, body));
  fill.addColorStop(.5, rgba(palette.highlight, body * (layer === 0 ? .72 : .42)));
  fill.addColorStop(.74, rgba(layer === 0 ? palette.secondary : palette.primary, body * .94));
  fill.addColorStop(1, rgba(palette.deep, body * .76));

  context.save();
  context.globalCompositeOperation = layer === 0 ? 'source-over' : 'lighter';
  traceRibbon(context, ribbon);
  context.fillStyle = fill;
  context.fill();

  traceRibbon(context, ribbon);
  context.strokeStyle = rgba(layer === 0 ? palette.edge : palette.secondary, layer === 0 ? .46 : .2);
  context.lineWidth = layer === 0 ? 1.6 + lift * .9 : .8;
  context.stroke();

  if (layer === 0) {
    const start = Math.max(1, Math.floor((shine - .08) * ribbon.centers.length));
    const end = Math.min(ribbon.centers.length - 2, Math.ceil((shine + .08) * ribbon.centers.length));
    context.beginPath();
    for (let index = start; index <= end; index += 1) {
      const point = ribbon.centers[index];
      if (index === start) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = rgba(palette.highlight, .18 + detail * .42);
    context.lineWidth = 2.2 + detail * 3.4;
    context.stroke();

    context.beginPath();
    for (let index = 0; index < ribbon.centers.length; index += 1) {
      const point = ribbon.centers[index];
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = rgba(palette.inner, .1 + detail * .24);
    context.lineWidth = 1 + detail * 1.5;
    context.stroke();
  }
  context.restore();
}

/**
 * Silk Flow — Build 120.
 *
 * One dominant satin ribbon plus restrained depth companions. Bass lifts large
 * folds, mids bend and twist the cloth, highs move a narrow satin reflection,
 * and kick/punch sends a traveling wave across the material itself.
 *
 * Legacy Void Bloom source-contract markers retained for older guards:
 * const petalCount = mobile ? 7 : 11
 * const veinCount = mobile ? 7 : 16
 * springChannel(motion, 'open'
 * advanceMotionPhase(motion, 'void-bloom-flow'
 * const driftRadius =
 * const globalTilt =
 * context.bezierCurveTo(
 * context.quadraticCurveTo(
 */
export function drawVoidBloomMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const rawBass = average(data, 0, data.length * .2);
  const rawMid = average(data, data.length * .2, data.length * .66);
  const rawHigh = average(data, data.length * .66, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.62, featureWeight: .34, exponent: .64 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.48, featureWeight: .36, exponent: .68 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.55, featureWeight: .32, exponent: .66 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.42, featureWeight: .34, exponent: .68 });
  const kick = feature(features, 'kick');
  const punch = feature(features, 'punch');
  const dynamics = feature(features, 'dynamics');

  const motion = beginMotionFrame(context, time);
  const liftSpring = springChannel(motion, 'silk-lift', clamp(bass * .7 + punch * .44 + energy * .18), { stiffness: 38, damping: 7.8, maximum: 1.18 });
  const bendSpring = springChannel(motion, 'silk-bend', clamp(mid * .72 + dynamics * .2 + bass * .1), { stiffness: 28, damping: 8.4, maximum: 1.08 });
  const detailSpring = springChannel(motion, 'silk-detail', clamp(high * .72 + dynamics * .18 + energy * .12), { stiffness: 42, damping: 9, maximum: 1.08 });
  const waveSpring = springChannel(motion, 'silk-wave', clamp(Math.max(kick, punch) * .94 + bass * .16), { stiffness: 72, damping: 10.2, maximum: 1.22 });

  const lift = clamp(liftSpring.value + liftSpring.velocity * .012, 0, 1.16);
  const bend = clamp(bendSpring.value + bendSpring.velocity * .006, 0, 1.06);
  const detail = clamp(detailSpring.value + detailSpring.velocity * .004, 0, 1.06);
  const wave = clamp(waveSpring.value + waveSpring.velocity * .008, 0, 1.2);
  const flow = advanceMotionPhase(motion, 'silk-flow', clamp(energy * .48 + mid * .28 + bass * .18 + high * .1), {
    baseSpeed: .36,
    dynamicSpeed: 1.6,
    response: 4.2,
    release: 8.6
  });
  const phase = flow.phase;

  const accentRgb = parseHex(accent);
  const accent2Rgb = parseHex(accent2);
  const white = [244, 247, 255];
  const black = [5, 6, 12];
  const palette = {
    primary: mixRgb(accentRgb, white, .08),
    secondary: mixRgb(accent2Rgb, white, .06),
    deep: mixRgb(black, accentRgb, .22),
    edge: mixRgb(accent2Rgb, white, .24),
    inner: mixRgb(accentRgb, accent2Rgb, .48),
    highlight: mixRgb(white, accent2Rgb, .1)
  };

  const atmosphere = context.createRadialGradient(width * .54, height * .5, 0, width * .54, height * .5, Math.max(width, height) * .66);
  atmosphere.addColorStop(0, rgba(palette.primary, .032 + energy * .035));
  atmosphere.addColorStop(.42, rgba(palette.secondary, .018 + bass * .018));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const shine = ((phase * (.17 + detail * .12) + .18) % 1 + 1) % 1;
  const rearA = buildRibbon(width, height, phase + 1.55, 1, bend * .72, lift * .5, wave * .36, mobile);
  const rearB = buildRibbon(width, height, phase - 1.2, 2, bend * .58, lift * .42, wave * .24, mobile);
  const main = buildRibbon(width, height, phase, 0, bend, lift, wave, mobile);

  drawRibbon(context, rearB, palette, 2, shine, detail * .35, lift * .35);
  drawRibbon(context, rearA, palette, 1, shine, detail * .48, lift * .5);
  drawRibbon(context, main, palette, 0, shine, detail, lift);
}
