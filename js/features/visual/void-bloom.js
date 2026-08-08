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
  const value = Math.sin(index * 91.173 + seed * 37.731) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * Void Bloom — Build 60.
 *
 * A breathing void-flower whose petals continuously orbit and flex while real
 * audio exists. Bass controls opening/depth, mids twist the petals, highs run
 * luminous edge veins. Build 59's direct-impact lane remains external and can
 * kick the whole bloom without consuming the normal pose headroom.
 */
export function drawVoidBloomMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  const rawBass = average(data, 0, data.length * .18);
  const rawMid = average(data, data.length * .18, data.length * .62);
  const rawHigh = average(data, data.length * .62, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.5, featureWeight: .28, exponent: .66 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.48, featureWeight: .3, exponent: .68 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.58, featureWeight: .28, exponent: .64 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.58, featureWeight: .25, exponent: .63 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const activityTarget = clamp(energy * .5 + mid * .23 + bass * .2 + high * .12);
  const openTarget = clamp(bass * .52 + kick * .4 + energy * .18);
  const twistTarget = clamp(mid * .63 + dynamics * .2 + high * .09 + bass * .08);
  const edgeTarget = clamp(high * .62 + peak * .28 + dynamics * .16 + mid * .12);

  const motion = beginMotionFrame(context, time);
  const activitySpring = springChannel(motion, 'activity', activityTarget, { stiffness: 29, damping: 6.5, maximum: 1.08 });
  const openSpring = springChannel(motion, 'open', openTarget, { stiffness: 45, damping: 6.8, maximum: 1.2 });
  const twistSpring = springChannel(motion, 'twist', twistTarget, { stiffness: 34, damping: 7, maximum: 1.14 });
  const edgeSpring = springChannel(motion, 'edge', edgeTarget, { stiffness: 43, damping: 7.3, maximum: 1.16 });

  const activity = clamp(activitySpring.value, 0, 1.06);
  const opening = clamp(openSpring.value + openSpring.velocity * .011, 0, 1.18);
  const twist = clamp(twistSpring.value + twistSpring.velocity * .006, 0, 1.12);
  const edge = clamp(edgeSpring.value + edgeSpring.velocity * .005, 0, 1.14);
  const flow = advanceMotionPhase(motion, 'void-bloom-flow', clamp(activity * .78 + mid * .14 + high * .11), {
    baseSpeed: .46,
    dynamicSpeed: 2.05,
    response: 5.4,
    release: 9.2
  });
  const phase = flow.phase;

  const petalCount = mobile ? 7 : 11;
  const veinCount = mobile ? 7 : 16;
  const shadowCap = mobile ? 4 : 10;
  const baseRadius = minSide * (mobile ? .095 : .105);
  const bloomRadius = minSide * (.22 + opening * .11 + activity * .025);

  const driftRadius = minSide * (.012 + activity * .03);
  const driftX = Math.sin(phase * .48) * driftRadius * activity;
  const driftY = Math.cos(phase * .37 + .65) * driftRadius * .68 * activity;
  const globalTilt = Math.sin(phase * .31) * activity * .09;
  const breathing = Math.sin(phase * 1.42) * activity;

  const atmosphereRadius = minSide * (.42 + opening * .08 + activity * .05);
  const atmosphere = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .028 + opening * .11 + edge * .04));
  atmosphere.addColorStop(.48, colorWithAlpha(accent, .015 + twist * .06));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx + driftX, cy + driftY);
  context.rotate(globalTilt + phase * .035 * activity);
  context.globalCompositeOperation = 'lighter';

  for (let petal = 0; petal < petalCount; petal += 1) {
    const p = (petal + .5) / petalCount;
    const angle = p * Math.PI * 2 - Math.PI / 2;
    const spectral = Math.pow(sampleAt(data, .08 + p * .84), .58);
    const personality = hash(petal, 7) * 2 - 1;
    const lag = Math.sin(phase * (1.35 + hash(petal, 2) * .24) - petal * .54);
    const localOpen = clamp(opening * .58 + spectral * .48 + activity * .14 + lag * activity * .08);
    const localTwist = (twist * (.16 + hash(petal, 5) * .18) + lag * activity * .11) * (petal % 2 ? -1 : 1);
    const root = baseRadius * (.78 + breathing * .045);
    const length = bloomRadius * (.62 + localOpen * .78 + spectral * .18);
    const widthPetal = minSide * (.028 + localOpen * .025 + spectral * .01);
    const tipAngle = angle + localTwist + personality * .035;
    const tipRadius = root + length;
    const rootX = Math.cos(angle) * root;
    const rootY = Math.sin(angle) * root;
    const tipX = Math.cos(tipAngle) * tipRadius;
    const tipY = Math.sin(tipAngle) * tipRadius;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const curl = minSide * (.012 + twist * .035 + spectral * .014) * (petal % 2 ? -1 : 1);

    const c1x = rootX + Math.cos(angle) * length * .34 + tangentX * (widthPetal + curl);
    const c1y = rootY + Math.sin(angle) * length * .34 + tangentY * (widthPetal + curl);
    const c2x = tipX - Math.cos(tipAngle) * length * .28 + tangentX * (widthPetal * .55 - curl * .35);
    const c2y = tipY - Math.sin(tipAngle) * length * .28 + tangentY * (widthPetal * .55 - curl * .35);
    const c3x = tipX - Math.cos(tipAngle) * length * .28 - tangentX * (widthPetal * .55 + curl * .25);
    const c3y = tipY - Math.sin(tipAngle) * length * .28 - tangentY * (widthPetal * .55 + curl * .25);
    const c4x = rootX + Math.cos(angle) * length * .34 - tangentX * (widthPetal - curl * .5);
    const c4y = rootY + Math.sin(angle) * length * .34 - tangentY * (widthPetal - curl * .5);

    context.beginPath();
    context.moveTo(rootX, rootY);
    context.bezierCurveTo(c1x, c1y, c2x, c2y, tipX, tipY);
    context.bezierCurveTo(c3x, c3y, c4x, c4y, rootX, rootY);
    context.closePath();
    context.fillStyle = colorWithAlpha(petal % 3 ? accent : accent2, .018 + localOpen * .08 + spectral * .06);
    context.strokeStyle = colorWithAlpha(petal % 3 ? accent2 : '#ffffff', .07 + localOpen * .3 + edge * .14);
    context.lineWidth = .55 + localOpen * 1.4 + edge * .35;
    context.shadowColor = petal % 3 ? accent : accent2;
    context.shadowBlur = Math.min(shadowCap, localOpen * shadowCap * .48 + edge * 2);
    context.fill();
    context.stroke();
  }

  context.shadowBlur = 0;
  for (let vein = 0; vein < veinCount; vein += 1) {
    const p = (vein + .5) / veinCount;
    const spectral = Math.pow(sampleAt(data, .52 + p * .47), .54);
    const drive = clamp(edge * .48 + spectral * .62 + activity * .12 + peak * .12);
    if (drive < .08) continue;
    const petalAngle = p * Math.PI * 2 - Math.PI / 2 + phase * .08 * (vein % 2 ? -1 : 1);
    const startRadius = baseRadius * 1.05;
    const travel = ((phase * (.16 + drive * .22) + p) % 1 + 1) % 1;
    const endRadius = startRadius + bloomRadius * (.22 + travel * .72);
    const bend = Math.sin(phase * 1.8 + vein * .7) * twist * .12;
    context.beginPath();
    context.moveTo(Math.cos(petalAngle) * startRadius, Math.sin(petalAngle) * startRadius);
    context.quadraticCurveTo(
      Math.cos(petalAngle + bend) * endRadius * .72,
      Math.sin(petalAngle + bend) * endRadius * .72,
      Math.cos(petalAngle + bend * 1.4) * endRadius,
      Math.sin(petalAngle + bend * 1.4) * endRadius
    );
    context.strokeStyle = colorWithAlpha(vein % 3 ? '#ffffff' : accent2, .02 + drive * .36);
    context.lineWidth = .35 + drive * 1.05;
    context.stroke();
  }

  const throatPulse = Math.sin(phase * 2.05) * activity * .012;
  const throatRadius = minSide * (.035 + opening * .022 + throatPulse);
  const throatGlow = context.createRadialGradient(0, 0, 0, 0, 0, throatRadius * 3.2);
  throatGlow.addColorStop(0, 'rgba(0,0,0,.96)');
  throatGlow.addColorStop(.34, colorWithAlpha(accent2, .5 + edge * .22));
  throatGlow.addColorStop(.62, colorWithAlpha(accent, .14 + opening * .2));
  throatGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = throatGlow;
  context.beginPath();
  context.arc(0, 0, Math.max(1, throatRadius * 3.2), 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(0,0,0,.92)';
  context.beginPath();
  context.arc(0, 0, Math.max(1, throatRadius * (.62 + opening * .12)), 0, Math.PI * 2);
  context.fill();

  context.restore();
}