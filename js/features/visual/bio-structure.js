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
  const value = Math.sin(index * 73.193 + seed * 41.711) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Bio Structure — Build 57 kinetic-flow pass.
 *
 * The organism continuously sways and crawls while audio exists. Bass controls
 * its breathing volume, mids bend the skeleton and highs move impulses through
 * the body; large peaks ride on top of that living baseline motion.
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

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.5, featureWeight: .28, exponent: .67 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.48, featureWeight: .3, exponent: .68 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.58, featureWeight: .28, exponent: .65 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.62, featureWeight: .24, exponent: .63 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const activityTarget = clamp(energy * .5 + mid * .24 + bass * .2 + high * .12);
  const breathTarget = clamp(bass * .56 + kick * .58 + energy * .18);
  const flexTarget = clamp(mid * .62 + dynamics * .2 + bass * .12 + high * .08);
  const nerveTarget = clamp(high * .58 + peak * .34 + dynamics * .15 + mid * .14);

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 28, damping: 6.4, maximum: 1.08 });
  const breathSpring = springChannel(motion, 'breath', breathTarget, { stiffness: 46, damping: 6.9, maximum: 1.22 });
  const flexSpring = springChannel(motion, 'flex', flexTarget, { stiffness: 34, damping: 7, maximum: 1.16 });
  const nerveSpring = springChannel(motion, 'nerve', nerveTarget, { stiffness: 42, damping: 7.4, maximum: 1.18 });

  const activity = clamp(activitySpring.value, 0, 1.06);
  const breath = clamp(breathSpring.value + breathSpring.velocity * .012, 0, 1.2);
  const flex = clamp(flexSpring.value + flexSpring.velocity * .007, 0, 1.14);
  const nerve = clamp(nerveSpring.value + nerveSpring.velocity * .005, 0, 1.16);
  const flow = advanceMotionPhase(motion, 'bio-flow', clamp(activity * .78 + mid * .14 + high * .12), {
    baseSpeed: .42,
    dynamicSpeed: 1.9,
    response: 5.2,
    release: 9
  });
  const phase = flow.phase;

  const ribCount = mobile ? 5 : 8;
  const veinCount = mobile ? 8 : 14;
  const nodeCount = mobile ? 6 : 9;
  const shadowCap = mobile ? 4 : 10;
  const bodyHeight = minSide * (mobile ? .58 : .62);
  const baseBodyWidth = minSide * (mobile ? .16 : .18);
  const bodyWidth = baseBodyWidth * (1 + breath * .42 + Math.sin(phase * 1.7) * activity * .06);

  // The organism drifts and tilts like a suspended living thing rather than a
  // diagram pinned to the exact centre of the canvas.
  const driftRadius = minSide * (.012 + activity * .032);
  const driftX = Math.sin(phase * .56) * driftRadius * activity;
  const driftY = Math.cos(phase * .41 + .7) * driftRadius * .65 * activity;
  const bodyTilt = Math.sin(phase * .34) * activity * .1;

  const atmosphereRadius = minSide * (.4 + activity * .06 + breath * .1);
  const atmosphere = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .03 + breath * .13 + activity * .03));
  atmosphere.addColorStop(.48, colorWithAlpha(accent, .015 + flex * .07));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx + driftX, cy + driftY);
  context.rotate(bodyTilt);
  context.globalCompositeOperation = 'lighter';

  // Central spine — wider travelling S-curves create visible whole-body motion.
  const spinePoints = [];
  context.beginPath();
  for (let node = 0; node <= nodeCount; node += 1) {
    const p = node / nodeCount;
    const y = -bodyHeight / 2 + p * bodyHeight;
    const spectral = Math.pow(sampleAt(data, .12 + p * .62), .58);
    const longWave = Math.sin(phase * 1.35 + p * Math.PI * 2.25) * bodyWidth * (.18 + flex * .32) * activity;
    const shortWave = Math.sin(phase * 2.25 - p * 4.1) * bodyWidth * (.05 + breath * .12) * activity;
    const spectralPush = (spectral - .32) * bodyWidth * .24;
    const x = longWave + shortWave + spectralPush;
    spinePoints.push([x, y]);
    if (node === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = colorWithAlpha(accent2, .17 + activity * .12 + breath * .4 + nerve * .16);
  context.lineWidth = 1.2 + breath * 2.8 + activity * .5;
  context.shadowColor = accent2;
  context.shadowBlur = Math.min(shadowCap, 2 + breath * shadowCap * .65 + nerve * 2);
  context.stroke();

  // Paired ribs follow the moving spine and sweep through much larger arcs.
  for (let rib = 0; rib < ribCount; rib += 1) {
    const p = (rib + .5) / ribCount;
    const y = -bodyHeight * .42 + p * bodyHeight * .84;
    const spectral = Math.pow(sampleAt(data, .2 + p * .58), .58);
    const personality = hash(rib, 7) * 2 - 1;
    const localFlex = clamp(flex * .58 + spectral * .5 + activity * .18 + breath * .12);
    const rootWave = Math.sin(phase * 1.35 + p * Math.PI * 2.25) * bodyWidth * (.17 + flex * .28) * activity;
    const sweep = Math.sin(phase * (1.55 + hash(rib, 2) * .28) - rib * .52) * activity;
    const spread = bodyWidth * (1.25 + localFlex * 2.05 + breath * .38 + sweep * .18);
    const lift = bodyHeight * (.028 + spectral * .05 + sweep * .035);

    for (const side of [-1, 1]) {
      const sideLag = Math.sin(phase * 1.8 + rib * .63 + (side > 0 ? .7 : 0)) * activity;
      const bend = side * (spread * (.56 + sideLag * .08) + personality * bodyWidth * .09);
      const tipX = side * spread + rootWave * (.8 - p * .18) + sideLag * bodyWidth * .22;
      const tipY = y - lift * (.45 + p * .8) + personality * bodyHeight * .014 + sideLag * bodyHeight * .018;
      context.beginPath();
      context.moveTo(rootWave, y);
      context.quadraticCurveTo(bend, y - lift * (1 + sideLag * .22), tipX, tipY);
      context.strokeStyle = colorWithAlpha((rib + (side > 0 ? 1 : 0)) % 3 ? accent : accent2,
        .055 + localFlex * .3 + nerve * .09 + activity * .04);
      context.lineWidth = .55 + localFlex * 1.55;
      context.shadowBlur = Math.min(shadowCap, localFlex * shadowCap * .45 + nerve * 1.5);
      context.stroke();

      const nodeRadius = minSide * (.006 + spectral * .0055 + breath * .003 + Math.abs(sideLag) * .0015);
      context.beginPath();
      context.arc(tipX, tipY, nodeRadius, 0, Math.PI * 2);
      context.fillStyle = colorWithAlpha(side > 0 ? accent2 : accent, .12 + localFlex * .35 + nerve * .2);
      context.fill();
    }
  }

  context.shadowBlur = 0;

  // Nerve impulses visibly travel from one end of the structure to the other.
  for (let vein = 0; vein < veinCount; vein += 1) {
    const p = (vein + .5) / veinCount;
    const spectral = Math.pow(sampleAt(data, .46 + p * .5), .54);
    const drive = clamp(nerve * .5 + spectral * .62 + activity * .14 + peak * .12);
    if (drive < .07) continue;
    const personality = hash(vein, 19) * 2 - 1;
    const travel = ((phase * (.18 + drive * .22 + hash(vein, 4) * .05) + p) % 1 + 1) % 1;
    const y = -bodyHeight * .47 + travel * bodyHeight * .94;
    const pulseX = Math.sin(phase * 1.55 + travel * Math.PI * 2 + vein * .6) * bodyWidth * (.35 + flex * .55) * activity;
    const length = bodyWidth * (.55 + drive * 1.35);
    const verticalBend = Math.sin(phase * 2 + vein) * bodyHeight * .014 * activity;
    context.beginPath();
    context.moveTo(pulseX - length * .4, y);
    context.quadraticCurveTo(pulseX + personality * length * .28, y - bodyHeight * .02 + verticalBend, pulseX + length * .48, y + verticalBend * .35);
    context.strokeStyle = colorWithAlpha(vein % 3 ? '#ffffff' : accent2, .025 + drive * .42);
    context.lineWidth = .4 + drive * 1.12;
    context.stroke();
  }

  // Membrane breathes, rotates and changes ellipticity instead of remaining an
  // almost-static outline around the skeleton.
  const membranePulse = Math.sin(phase * 1.28) * activity * .065;
  const membraneShear = Math.sin(phase * .72 + .8) * flex * .08;
  context.beginPath();
  context.ellipse(
    0,
    0,
    bodyWidth * (1.5 + flex * .3 + membranePulse),
    bodyHeight * (.52 + breath * .045 - membranePulse * .08),
    bodyTilt * .65 + membraneShear,
    0,
    Math.PI * 2
  );
  context.strokeStyle = colorWithAlpha(accent, .025 + activity * .035 + breath * .12 + flex * .09);
  context.lineWidth = .6 + breath * .75;
  context.stroke();

  context.restore();

  const heartPulse = Math.sin(phase * 2.2) * activity * .008;
  const heartRadius = minSide * (.025 + breath * .02 + activity * .004 + heartPulse);
  const heartGlow = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, heartRadius * 3.25);
  heartGlow.addColorStop(0, colorWithAlpha('#ffffff', .66 + nerve * .22));
  heartGlow.addColorStop(.2, colorWithAlpha(accent2, .52 + breath * .25));
  heartGlow.addColorStop(.58, colorWithAlpha(accent, .12 + flex * .16));
  heartGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = heartGlow;
  context.beginPath();
  context.arc(cx + driftX, cy + driftY, Math.max(1, heartRadius * 3.25), 0, Math.PI * 2);
  context.fill();
}
