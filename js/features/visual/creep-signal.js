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
  const value = Math.sin(index * 83.719 + seed * 29.377) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Creep Signal — Build 61.
 *
 * An asymmetric signal-organism that crawls across the canvas instead of
 * orbiting a central object. Sustained audio owns forward crawl, body sway and
 * branch motion; local FFT bins deform each section independently. The shared
 * Direct Impact lane remains external and gives bass/kick onsets a reserved
 * whole-network lunge without adding geometry.
 */
export function drawCreepSignalMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const minSide = Math.min(width, height);

  const rawBass = average(data, 0, data.length * .18);
  const rawMid = average(data, data.length * .18, data.length * .62);
  const rawHigh = average(data, data.length * .62, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.54, featureWeight: .27, exponent: .65 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.48, featureWeight: .29, exponent: .67 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.58, featureWeight: .27, exponent: .63 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.58, featureWeight: .25, exponent: .62 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const activityTarget = clamp(energy * .5 + mid * .22 + bass * .2 + high * .12);
  const massTarget = clamp(bass * .58 + kick * .36 + energy * .18);
  const flexTarget = clamp(mid * .62 + dynamics * .2 + high * .1 + bass * .08);
  const nerveTarget = clamp(high * .62 + peak * .28 + dynamics * .16 + mid * .12);

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 29, damping: 6.4, maximum: 1.08 });
  const massSpring = springChannel(motion, 'mass', massTarget, { stiffness: 45, damping: 6.8, maximum: 1.2 });
  const flexSpring = springChannel(motion, 'flex', flexTarget, { stiffness: 35, damping: 6.9, maximum: 1.15 });
  const nerveSpring = springChannel(motion, 'nerve', nerveTarget, { stiffness: 43, damping: 7.2, maximum: 1.17 });

  const activity = clamp(activitySpring.value, 0, 1.06);
  const mass = clamp(massSpring.value + massSpring.velocity * .011, 0, 1.18);
  const flex = clamp(flexSpring.value + flexSpring.velocity * .006, 0, 1.13);
  const nerve = clamp(nerveSpring.value + nerveSpring.velocity * .005, 0, 1.15);
  const flow = advanceMotionPhase(motion, 'creep-flow', clamp(activity * .76 + mid * .15 + high * .11), {
    baseSpeed: .5,
    dynamicSpeed: 2.15,
    response: 5.5,
    release: 9.2
  });
  const phase = flow.phase;

  const nodeCount = mobile ? 9 : 14;
  const branchCount = mobile ? 6 : 10;
  const pulseCount = mobile ? 7 : 12;
  const shadowCap = mobile ? 4 : 10;
  const margin = width * .08;
  const span = width + margin * 2;
  const baseY = height * (.53 + Math.sin(phase * .28) * activity * .035);
  const bodyAmplitude = height * (.055 + flex * .12 + mass * .035);
  const forwardDrift = Math.sin(phase * .44) * width * .025 * activity;
  const tilt = Math.sin(phase * .31 + .4) * activity * .055;

  const points = [];
  for (let node = 0; node <= nodeCount; node += 1) {
    const p = node / nodeCount;
    const spectral = Math.pow(sampleAt(data, .04 + p * .76), .58);
    const localWave = Math.sin(phase * 1.55 - p * Math.PI * 3.15) * bodyAmplitude * (.34 + activity * .58);
    const secondary = Math.sin(phase * 2.4 + p * Math.PI * 5.2) * height * (.012 + spectral * .032 + flex * .018);
    const spectralPush = (spectral - .34) * height * (.035 + mass * .025);
    const x = -margin + p * span + forwardDrift;
    const y = baseY + localWave + secondary + spectralPush + (p - .5) * width * Math.tan(tilt) * .14;
    points.push([x, y]);
  }

  const atmosphere = context.createLinearGradient(0, 0, width, height);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .015 + activity * .03));
  atmosphere.addColorStop(.45, colorWithAlpha(accent2, .02 + mass * .055));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.lineCap = 'round';
  context.lineJoin = 'round';

  // A thick living backbone traverses the full canvas. Two passes keep it
  // readable without adding extra geometry.
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = colorWithAlpha(accent, .045 + mass * .16 + activity * .07);
  context.lineWidth = minSide * (.008 + mass * .012);
  context.shadowColor = accent;
  context.shadowBlur = Math.min(shadowCap, 2 + mass * shadowCap * .62);
  context.stroke();

  context.strokeStyle = colorWithAlpha('#ffffff', .08 + nerve * .22 + mass * .1);
  context.lineWidth = minSide * (.0018 + nerve * .0032);
  context.shadowColor = accent2;
  context.shadowBlur = Math.min(shadowCap, nerve * shadowCap * .55 + 1);
  context.stroke();

  // Branches whip above/below the body. Each branch reads a different FFT bin
  // so the network never behaves like a single rigid spline.
  for (let branch = 0; branch < branchCount; branch += 1) {
    const p = (branch + .7) / (branchCount + .4);
    const pointIndex = Math.max(1, Math.min(points.length - 2, Math.round(p * nodeCount)));
    const [rootX, rootY] = points[pointIndex];
    const spectral = Math.pow(sampleAt(data, .15 + p * .72), .56);
    const personality = hash(branch, 5) * 2 - 1;
    const side = branch % 2 ? -1 : 1;
    const sweep = Math.sin(phase * (1.45 + hash(branch, 2) * .28) - branch * .7);
    const reach = width * (.055 + spectral * .07 + flex * .055 + mass * .025);
    const lift = height * (.08 + spectral * .13 + flex * .08 + Math.abs(sweep) * activity * .035);
    const tipX = rootX + reach * (.38 + personality * .26 + sweep * .22);
    const tipY = rootY + side * lift * (.72 + activity * .42);
    const controlX = rootX + reach * (.16 + sweep * .35);
    const controlY = rootY + side * lift * (.28 + flex * .36) + personality * height * .02;

    context.beginPath();
    context.moveTo(rootX, rootY);
    context.quadraticCurveTo(controlX, controlY, tipX, tipY);
    context.strokeStyle = colorWithAlpha(branch % 3 ? accent2 : accent, .05 + spectral * .3 + flex * .13 + nerve * .08);
    context.lineWidth = .55 + spectral * 1.35 + mass * .45;
    context.shadowColor = branch % 3 ? accent2 : accent;
    context.shadowBlur = Math.min(shadowCap, spectral * shadowCap * .42 + nerve * 1.5);
    context.stroke();

    const nodeRadius = minSide * (.0045 + spectral * .004 + mass * .002);
    context.fillStyle = colorWithAlpha(branch % 2 ? accent : accent2, .12 + spectral * .42 + nerve * .18);
    context.beginPath();
    context.arc(tipX, tipY, nodeRadius, 0, Math.PI * 2);
    context.fill();
  }

  context.shadowBlur = 0;

  // Luminous infection pulses crawl forward through the body and occasionally
  // spill into a short diagonal filament. No particles or random allocation.
  for (let pulse = 0; pulse < pulseCount; pulse += 1) {
    const lane = (pulse + .5) / pulseCount;
    const spectral = Math.pow(sampleAt(data, .48 + lane * .5), .53);
    const drive = clamp(nerve * .48 + spectral * .64 + peak * .12 + activity * .12);
    if (drive < .07) continue;
    const travel = ((phase * (.16 + drive * .24 + hash(pulse, 4) * .05) + lane) % 1 + 1) % 1;
    const scaled = travel * nodeCount;
    const left = Math.min(nodeCount - 1, Math.floor(scaled));
    const t = scaled - left;
    const [x1, y1] = points[left];
    const [x2, y2] = points[left + 1];
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const length = width * (.018 + drive * .035);
    const angle = (pulse % 2 ? -1 : 1) * (.25 + flex * .18) + Math.sin(phase + pulse) * .08;

    context.beginPath();
    context.moveTo(x - Math.cos(angle) * length * .4, y - Math.sin(angle) * length * .4);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.strokeStyle = colorWithAlpha(pulse % 3 ? '#ffffff' : accent2, .06 + drive * .52);
    context.lineWidth = .45 + drive * 1.15;
    context.stroke();

    context.fillStyle = colorWithAlpha('#ffffff', .18 + drive * .62);
    context.beginPath();
    context.arc(x, y, minSide * (.0025 + drive * .0035), 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}