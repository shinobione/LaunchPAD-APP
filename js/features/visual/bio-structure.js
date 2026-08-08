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
 * Bio Structure
 *
 * A living, semi-mechanical organism: bass inflates the body, mids flex the
 * ribs/branches, highs travel through luminous veins. Geometry stays sparse;
 * movement comes from spring memory and signal-gated phase.
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

  const bass = clamp(Math.max(feature(features, 'bass'), Math.pow(rawBass, .68) * 1.28));
  const mid = clamp(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.2));
  const high = clamp(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.24));
  const energy = clamp(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .78) * 1.18));
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const activityTarget = clamp(energy * .68 + bass * .34 + mid * .18 + high * .12 + kick * .2);
  const breathTarget = clamp(bass * .72 + kick * .82 + peak * .18);
  const flexTarget = clamp(mid * .78 + dynamics * .3 + bass * .12);
  const nerveTarget = clamp(high * .72 + peak * .42 + dynamics * .18);

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 30, damping: 8.3, maximum: 1.18 });
  const breathSpring = springChannel(motion, 'breath', breathTarget, { stiffness: 60, damping: 8, maximum: 1.42 });
  const flexSpring = springChannel(motion, 'flex', flexTarget, { stiffness: 38, damping: 9.2, maximum: 1.2 });
  const nerveSpring = springChannel(motion, 'nerve', nerveTarget, { stiffness: 52, damping: 10, maximum: 1.25 });

  const activity = clamp(activitySpring.value, 0, 1.16);
  const breath = clamp(breathSpring.value + Math.abs(breathSpring.velocity) * .012, 0, 1.45);
  const flex = clamp(flexSpring.value, 0, 1.18);
  const nerve = clamp(nerveSpring.value + Math.abs(nerveSpring.velocity) * .006, 0, 1.22);
  const phase = motionPhase(time, activity, .24);

  const ribCount = mobile ? 5 : 8;
  const veinCount = mobile ? 8 : 14;
  const nodeCount = mobile ? 6 : 9;
  const shadowCap = mobile ? 4 : 10;
  const bodyHeight = minSide * (mobile ? .56 : .6);
  const bodyWidth = minSide * (mobile ? .16 : .18) * (1 + breath * .34);

  const atmosphereRadius = minSide * (.42 + breath * .08);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .03 + breath * .11));
  atmosphere.addColorStop(.48, colorWithAlpha(accent, .015 + flex * .06));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  // Central spine: a single readable living gesture rather than a particle field.
  context.beginPath();
  for (let node = 0; node <= nodeCount; node += 1) {
    const p = node / nodeCount;
    const y = -bodyHeight / 2 + p * bodyHeight;
    const spectral = Math.pow(sampleAt(data, .12 + p * .62), .65);
    const sway = Math.sin(phase * 1.45 + p * Math.PI * 2.4) * bodyWidth * (.12 + flex * .2) * activity;
    const localKick = Math.sin(phase * 2.1 - p * 3.4) * breath * bodyWidth * .07;
    const x = sway + localKick + (spectral - .3) * bodyWidth * .16;
    if (node === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = colorWithAlpha(accent2, .18 + breath * .42 + nerve * .16);
  context.lineWidth = 1.2 + breath * 2.5;
  context.shadowColor = accent2;
  context.shadowBlur = Math.min(shadowCap, 2 + breath * shadowCap * .65);
  context.stroke();

  // Paired ribs/branches. They flex and lag rather than snap rigidly.
  for (let rib = 0; rib < ribCount; rib += 1) {
    const p = (rib + .5) / ribCount;
    const y = -bodyHeight * .42 + p * bodyHeight * .84;
    const spectral = Math.pow(sampleAt(data, .2 + p * .58), .62);
    const personality = hash(rib, 7) * 2 - 1;
    const localFlex = clamp(flex * .6 + spectral * .5 + breath * .18);
    const rootSway = Math.sin(phase * 1.5 + p * 4.2) * bodyWidth * .18 * activity;
    const spread = bodyWidth * (1.35 + localFlex * 1.8 + breath * .32);
    const lift = bodyHeight * (.025 + spectral * .045 + Math.sin(phase * 1.8 - rib * .55) * activity * .012);

    for (const side of [-1, 1]) {
      const bend = side * (spread * .58 + personality * bodyWidth * .08);
      const tipX = side * spread + rootSway * (1 - p * .25);
      const tipY = y - lift * (.4 + p * .8) + personality * bodyHeight * .012;
      context.beginPath();
      context.moveTo(rootSway, y);
      context.quadraticCurveTo(bend, y - lift * .8, tipX, tipY);
      context.strokeStyle = colorWithAlpha((rib + (side > 0 ? 1 : 0)) % 3 ? accent : accent2,
        .055 + localFlex * .28 + nerve * .08);
      context.lineWidth = .55 + localFlex * 1.45;
      context.shadowBlur = Math.min(shadowCap, localFlex * shadowCap * .45);
      context.stroke();

      const nodeRadius = minSide * (.006 + spectral * .005 + breath * .0025);
      context.beginPath();
      context.arc(tipX, tipY, nodeRadius, 0, Math.PI * 2);
      context.fillStyle = colorWithAlpha(side > 0 ? accent2 : accent, .12 + localFlex * .34 + nerve * .18);
      context.fill();
    }
  }

  context.shadowBlur = 0;

  // Nerve impulses: few moving arcs travelling through the organism.
  for (let vein = 0; vein < veinCount; vein += 1) {
    const p = (vein + .5) / veinCount;
    const spectral = Math.pow(sampleAt(data, .48 + p * .5), .58);
    const drive = clamp(nerve * .56 + spectral * .62 + peak * .14);
    if (drive < .1) continue;
    const personality = hash(vein, 19) * 2 - 1;
    const travel = ((phase * (.18 + drive * .18) + p) % 1 + 1) % 1;
    const y = -bodyHeight * .46 + travel * bodyHeight * .92;
    const pulseX = Math.sin(phase * 1.7 + vein * .7) * bodyWidth * (.35 + flex * .45) * activity;
    const length = bodyWidth * (.5 + drive * 1.2);
    context.beginPath();
    context.moveTo(pulseX - length * .35, y);
    context.quadraticCurveTo(pulseX + personality * length * .25, y - bodyHeight * .018, pulseX + length * .45, y);
    context.strokeStyle = colorWithAlpha(vein % 3 ? '#ffffff' : accent2, .025 + drive * .38);
    context.lineWidth = .4 + drive * 1.05;
    context.stroke();
  }

  // Membrane outline keeps the organism readable while still breathing.
  const membranePulse = Math.sin(phase * 1.35) * activity * .025;
  context.beginPath();
  context.ellipse(0, 0, bodyWidth * (1.55 + flex * .26 + membranePulse), bodyHeight * (.53 + breath * .03), flex * .08 + phase * .025, 0, Math.PI * 2);
  context.strokeStyle = colorWithAlpha(accent, .025 + breath * .11 + flex * .08);
  context.lineWidth = .6 + breath * .7;
  context.stroke();

  context.restore();

  const heartRadius = minSide * (.026 + breath * .018 + Math.sin(phase * 2) * activity * .003);
  const heartGlow = context.createRadialGradient(cx, cy, 0, cx, cy, heartRadius * 3.1);
  heartGlow.addColorStop(0, colorWithAlpha('#ffffff', .68 + nerve * .2));
  heartGlow.addColorStop(.2, colorWithAlpha(accent2, .54 + breath * .22));
  heartGlow.addColorStop(.58, colorWithAlpha(accent, .12 + flex * .14));
  heartGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = heartGlow;
  context.beginPath();
  context.arc(cx, cy, heartRadius * 3.1, 0, Math.PI * 2);
  context.fill();
}
