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

function feature(features, name) {
  const value = Number(features?.[name]);
  return Number.isFinite(value) ? clamp(value) : 0;
}

function sampleAt(data, progress) {
  if (!data?.length) return 0;
  const normalized = clamp(progress);
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(normalized * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function mobileVisualDevice(width) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

/**
 * Signal Bloom — Build 121.
 *
 * A full-frame magnetic field made of long, readable trajectories. The scene
 * changes by bending and breathing the field itself rather than pulsing one
 * centered object. Bass opens the bundles, mids bend the field, highs send
 * fine glints along selected lines and punch drives a local travelling wave.
 */
export function drawSignalBloomMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const rawBass = average(data, 0, data.length * .18);
  const rawMid = average(data, data.length * .18, data.length * .62);
  const rawHigh = average(data, data.length * .62, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.48, featureWeight: .3, exponent: .68 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.42, featureWeight: .32, exponent: .7 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.55, featureWeight: .28, exponent: .66 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.45, featureWeight: .28, exponent: .68 });
  const punch = clamp(Math.max(feature(features, 'punch'), feature(features, 'kick') * .86, feature(features, 'visualImpact') * .9));
  const peak = feature(features, 'peak');

  const motion = beginMotionFrame(context, time);
  const spreadSpring = springChannel(motion, 'signal-bloom-spread', clamp(.12 + bass * .7 + energy * .2), { stiffness: 34, damping: 7.3, maximum: 1.2 });
  const bendSpring = springChannel(motion, 'signal-bloom-bend', clamp(.08 + mid * .72 + energy * .16), { stiffness: 27, damping: 7.1, maximum: 1.15 });
  const shimmerSpring = springChannel(motion, 'signal-bloom-shimmer', clamp(high * .74 + peak * .2 + energy * .12), { stiffness: 42, damping: 7.8, maximum: 1.18 });
  const impactSpring = springChannel(motion, 'signal-bloom-impact', punch, { stiffness: 54, damping: 8.4, maximum: 1.2 });

  const spread = clamp(spreadSpring.value + spreadSpring.velocity * .004, 0, 1.1);
  const bend = clamp(bendSpring.value + bendSpring.velocity * .003, 0, 1.08);
  const shimmer = clamp(shimmerSpring.value + shimmerSpring.velocity * .002, 0, 1.1);
  const impact = clamp(impactSpring.value + impactSpring.velocity * .004, 0, 1.12);

  const flow = advanceMotionPhase(motion, 'signal-bloom-flow', clamp(.18 + energy * .55 + mid * .18 + high * .08), {
    baseSpeed: .18,
    dynamicSpeed: .92,
    response: 4.2,
    release: 8.6
  });
  const phase = flow.phase;

  const lineCount = mobile ? 16 : 28;
  const bundleCount = 4;
  const margin = width * (mobile ? .08 : .055);
  const usableWidth = width - margin * 2;
  const centerY = height * (.5 + Math.sin(phase * .17) * .025);
  const fieldHeight = height * (.58 + spread * .18);
  const waveFront = ((phase * .34 + impact * .09) % 1 + 1) % 1;
  const drift = Math.sin(phase * .27) * height * (.018 + energy * .02);

  const atmosphere = context.createLinearGradient(0, 0, width, height);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .018 + energy * .04));
  atmosphere.addColorStop(.48, 'rgba(0,0,0,0)');
  atmosphere.addColorStop(1, colorWithAlpha(accent2, .02 + high * .045));
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.lineCap = 'round';

  for (let index = 0; index < lineCount; index += 1) {
    const p = lineCount <= 1 ? .5 : index / (lineCount - 1);
    const centered = p * 2 - 1;
    const bundle = index % bundleCount;
    const spectral = Math.pow(sampleAt(data, .04 + p * .92), .7);
    const bundlePhase = phase * (.42 + bundle * .025) + bundle * 1.17;
    const lane = centered * fieldHeight * .5;
    const laneCurve = Math.sin(p * Math.PI * 1.3 + bundlePhase) * height * (.035 + bend * .095);
    const secondaryCurve = Math.cos(p * Math.PI * 2.2 - phase * .31 + bundle * .8) * height * (.012 + mid * .035);
    const pressure = (1 - Math.abs(centered)) * height * spread * .055;

    const localWaveDistance = Math.abs(p - waveFront);
    const wrappedDistance = Math.min(localWaveDistance, 1 - localWaveDistance);
    const localWave = Math.exp(-wrappedDistance * wrappedDistance / .0055) * impact;
    const waveSign = index % 2 ? -1 : 1;

    const y0 = centerY + lane + drift * (.35 + p * .65) + secondaryCurve;
    const y1 = centerY + lane * (.72 + spread * .08) + laneCurve - pressure + localWave * height * .16 * waveSign;
    const y2 = centerY + lane * (.52 - spread * .04) - laneCurve * .7 + pressure * .7 - localWave * height * .09 * waveSign;
    const y3 = centerY + lane * (.86 + spread * .05) - secondaryCurve * .8;

    const x0 = margin - width * .035;
    const x1 = margin + usableWidth * (.28 + Math.sin(bundlePhase) * .025);
    const x2 = margin + usableWidth * (.68 + Math.cos(bundlePhase * .83) * .03);
    const x3 = width - margin + width * .035;

    const isPrimary = index % 4 === 1 || index % 4 === 2;
    const color = bundle % 2 ? accent2 : accent;
    const alpha = (isPrimary ? .22 : .085) + spectral * (isPrimary ? .34 : .18) + shimmer * (isPrimary ? .1 : .045);
    const lineWidth = (mobile ? .8 : .9) + spectral * (isPrimary ? 2.1 : 1.15) + localWave * 1.3;

    context.beginPath();
    context.moveTo(x0, y0);
    context.bezierCurveTo(x1, y1, x2, y2, x3, y3);
    context.strokeStyle = colorWithAlpha(color, alpha);
    context.lineWidth = lineWidth;
    context.stroke();

    if (isPrimary) {
      const highlightAlpha = .055 + high * .12 + spectral * .08;
      context.beginPath();
      context.moveTo(x0, y0 - lineWidth * .7);
      context.bezierCurveTo(x1, y1 - lineWidth, x2, y2 - lineWidth * .7, x3, y3 - lineWidth * .5);
      context.strokeStyle = colorWithAlpha('#ffffff', highlightAlpha);
      context.lineWidth = Math.max(.35, lineWidth * .24);
      context.stroke();
    }
  }

  const glintCount = mobile ? 4 : 8;
  for (let glint = 0; glint < glintCount; glint += 1) {
    const progress = ((phase * (.065 + high * .055) + glint / glintCount) % 1 + 1) % 1;
    const laneIndex = (glint * 5 + 1) % lineCount;
    const p = lineCount <= 1 ? .5 : laneIndex / (lineCount - 1);
    const centered = p * 2 - 1;
    const bundle = laneIndex % bundleCount;
    const bundlePhase = phase * (.42 + bundle * .025) + bundle * 1.17;
    const lane = centered * fieldHeight * .5;
    const laneCurve = Math.sin(p * Math.PI * 1.3 + bundlePhase) * height * (.035 + bend * .095);
    const yBase = centerY + lane * (.74 + progress * .08) + Math.sin(progress * Math.PI * 2 + bundlePhase) * laneCurve * .55;
    const x = margin + usableWidth * progress;
    const size = (mobile ? 1.6 : 2.1) + shimmer * 2.8;
    const alpha = (.18 + shimmer * .48) * (glint % 3 === 0 ? 1 : .7);

    context.beginPath();
    context.arc(x, yBase, size, 0, Math.PI * 2);
    context.fillStyle = colorWithAlpha(glint % 2 ? accent2 : '#ffffff', alpha);
    context.fill();
  }

  context.restore();
}