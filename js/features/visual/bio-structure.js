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
  const value = Math.sin(index * 73.193 + seed * 41.711) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Bio Structure — dynamic-breathing pass.
 *
 * The organism now has more room between rest, groove and impact. Soft-knee
 * targets stop boosted features from pinning the body fully open, while signed
 * spring momentum and stronger low-level phase keep the spine/ribs alive.
 */
export function drawBioStructureMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  const rawBass = average(data, 0, data.length * .18);
  const rawMid = average(data, data.length * .18, data.length * .62);
  const rawHigh = average(data, data.length * .62, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeMotionTarget(Math.max(feature(features, 'bass'), Math.pow(rawBass, .68) * 1.16), { ceiling: .86 });
  const mid = shapeMotionTarget(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.1), { ceiling: .84 });
  const high = shapeMotionTarget(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.12), { ceiling: .86 });
  const energy = shapeMotionTarget(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .78) * 1.1), { ceiling: .84 });
  const kick = shapeMotionTarget(feature(features, 'kick'), { knee: .5, ceiling: .9, lowExponent: .88 });
  const peak = shapeMotionTarget(feature(features, 'peak'), { knee: .58, ceiling: .88 });
  const dynamics = shapeMotionTarget(feature(features, 'dynamics'), { ceiling: .86 });

  const activityTarget = shapeMotionTarget(energy * .56 + bass * .2 + mid * .14 + high * .1 + kick * .1, { ceiling: .82 });
  const breathTarget = shapeMotionTarget(bass * .52 + kick * .54 + peak * .12, { knee: .52, ceiling: .84 });
  const flexTarget = shapeMotionTarget(mid * .58 + dynamics * .18 + bass * .08, { ceiling: .8 });
  const nerveTarget = shapeMotionTarget(high * .54 + peak * .24 + dynamics * .12, { ceiling: .84 });

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 21, damping: 6.9, maximum: 1 });
  const breathSpring = springChannel(motion, 'breath', breathTarget, { stiffness: 34, damping: 7, maximum: 1.02 });
  const flexSpring = springChannel(motion, 'flex', flexTarget, { stiffness: 26, damping: 7.5, maximum: .98 });
  const nerveSpring = springChannel(motion, 'nerve', nerveTarget, { stiffness: 32, damping: 8, maximum: 1 });

  const activity = clamp(activitySpring.value, 0, 1);
  const breathMomentum = clamp(breathSpring.velocity * .008, -.12, .12);
  const flexMomentum = clamp(flexSpring.velocity * .008, -.09, .09);
  const nerveMomentum = clamp(nerveSpring.velocity * .006, -.08, .08);
  const breath = clamp(breathSpring.value + breathMomentum, 0, 1.02);
  const flex = clamp(flexSpring.value + flexMomentum, 0, .98);
  const nerve = clamp(nerveSpring.value + nerveMomentum, 0, 1);
  const phase = motionPhase(time, activity, .31);

  const ribCount = mobile ? 5 : 8;
  const veinCount = mobile ? 8 : 14;
  const nodeCount = mobile ? 6 : 9;
  const shadowCap = mobile ? 4 : 10;
  const bodyHeight = minSide * (mobile ? .56 : .6);
  const bodyWidth = minSide * (mobile ? .16 : .18) * (1 + breath * .24);

  const atmosphereRadius = minSide * (.41 + breath * .06);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .025 + breath * .085));
  atmosphere.addColorStop(.48, colorWithAlpha(accent, .013 + flex * .048));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  // Central spine: low-level movement is deliberately visible, peaks stay brief.
  context.beginPath();
  for (let node = 0; node <= nodeCount; node += 1) {
    const p = node / nodeCount;
    const y = -bodyHeight / 2 + p * bodyHeight;
    const spectral = Math.pow(sampleAt(data, .12 + p * .62), .72);
    const sway = Math.sin(phase * 1.62 + p * Math.PI * 2.4) * bodyWidth * (.16 + flex * .22) * Math.pow(activity, .62);
    const recoil = breathMomentum * bodyWidth * (1.6 - p * .7);
    const localKick = Math.sin(phase * 2.25 - p * 3.4) * breath * bodyWidth * .08;
    const x = sway + recoil + localKick + (spectral - .28) * bodyWidth * .13;
    if (node === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = colorWithAlpha(accent2, .16 + breath * .34 + nerve * .12);
  context.lineWidth = 1.1 + breath * 2;
  context.shadowColor = accent2;
  context.shadowBlur = Math.min(shadowCap, 1.5 + breath * shadowCap * .52);
  context.stroke();

  // Paired ribs/branches flex continuously instead of staying permanently wide.
  for (let rib = 0; rib < ribCount; rib += 1) {
    const p = (rib + .5) / ribCount;
    const y = -bodyHeight * .42 + p * bodyHeight * .84;
    const spectral = Math.pow(sampleAt(data, .2 + p * .58), .7);
    const personality = hash(rib, 7) * 2 - 1;
    const localFlex = clamp(flex * .46 + spectral * .36 + breath * .12);
    const rootSway = Math.sin(phase * 1.72 + p * 4.2) * bodyWidth * .26 * Math.pow(activity, .62) + flexMomentum * bodyWidth * .75;
    const spreadWave = Math.sin(phase * 1.22 - rib * .48) * Math.pow(activity, .62) * bodyWidth * .18;
    const spread = bodyWidth * (1.3 + localFlex * 1.35 + breath * .2) + spreadWave;
    const lift = bodyHeight * (.02 + spectral * .035 + Math.sin(phase * 1.95 - rib * .55) * Math.pow(activity, .62) * .018);

    for (const side of [-1, 1]) {
      const bend = side * (spread * .58 + personality * bodyWidth * .08) + flexMomentum * bodyWidth * side * .5;
      const tipX = side * spread + rootSway * (1 - p * .25);
      const tipY = y - lift * (.4 + p * .8) + personality * bodyHeight * .012 + breathMomentum * bodyHeight * .035;
      context.beginPath();
      context.moveTo(rootSway, y);
      context.quadraticCurveTo(bend, y - lift * .8, tipX, tipY);
      context.strokeStyle = colorWithAlpha((rib + (side > 0 ? 1 : 0)) % 3 ? accent : accent2,
        .05 + localFlex * .23 + nerve * .065);
      context.lineWidth = .5 + localFlex * 1.18;
      context.shadowBlur = Math.min(shadowCap, localFlex * shadowCap * .36);
      context.stroke();

      const nodeRadius = minSide * (.0055 + spectral * .004 + breath * .002);
      context.beginPath();
      context.arc(tipX, tipY, nodeRadius, 0, Math.PI * 2);
      context.fillStyle = colorWithAlpha(side > 0 ? accent2 : accent, .1 + localFlex * .28 + nerve * .14);
      context.fill();
    }
  }

  context.shadowBlur = 0;

  // Nerve impulses travel more continuously at moderate energy, with restrained peak gain.
  for (let vein = 0; vein < veinCount; vein += 1) {
    const p = (vein + .5) / veinCount;
    const spectral = Math.pow(sampleAt(data, .48 + p * .5), .66);
    const drive = clamp(nerve * .42 + spectral * .48 + peak * .09);
    if (drive < .07) continue;
    const personality = hash(vein, 19) * 2 - 1;
    const travel = ((phase * (.22 + drive * .14) + p + nerveMomentum * .3) % 1 + 1) % 1;
    const y = -bodyHeight * .46 + travel * bodyHeight * .92;
    const pulseX = Math.sin(phase * 1.9 + vein * .7) * bodyWidth * (.42 + flex * .38) * Math.pow(activity, .62);
    const length = bodyWidth * (.45 + drive * .95);
    context.beginPath();
    context.moveTo(pulseX - length * .35, y);
    context.quadraticCurveTo(pulseX + personality * length * .28, y - bodyHeight * .018, pulseX + length * .45, y);
    context.strokeStyle = colorWithAlpha(vein % 3 ? '#ffffff' : accent2, .02 + drive * .3);
    context.lineWidth = .35 + drive * .85;
    context.stroke();
  }

  // Membrane stays readable but now visibly drifts at mid energy.
  const membranePulse = Math.sin(phase * 1.48) * Math.pow(activity, .62) * .038 + breathMomentum * .08;
  context.beginPath();
  context.ellipse(0, 0, bodyWidth * (1.5 + flex * .2 + membranePulse), bodyHeight * (.53 + breath * .022), flex * .065 + phase * .045 + flexMomentum * .25, 0, Math.PI * 2);
  context.strokeStyle = colorWithAlpha(accent, .02 + breath * .085 + flex * .06);
  context.lineWidth = .55 + breath * .55;
  context.stroke();

  context.restore();

  const heartRadius = minSide * (.026 + breath * .013 + Math.sin(phase * 2.15) * Math.pow(activity, .62) * .005 + breathMomentum * .012);
  const heartGlow = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, heartRadius * 3));
  heartGlow.addColorStop(0, colorWithAlpha('#ffffff', .64 + nerve * .16));
  heartGlow.addColorStop(.2, colorWithAlpha(accent2, .5 + breath * .17));
  heartGlow.addColorStop(.58, colorWithAlpha(accent, .1 + flex * .11));
  heartGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = heartGlow;
  context.beginPath();
  context.arc(cx, cy, Math.max(1, heartRadius * 3), 0, Math.PI * 2);
  context.fill();
}
