import { advanceMotionPhase, beginMotionFrame, shapeAudioDrive, springChannel } from './motion-spring.js';

const TAU = Math.PI * 2;
const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

function average(data, start, end) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  let total = 0;
  for (let index = from; index < to; index += 1) total += data[index] || 0;
  return total / Math.max(1, to - from) / 255;
}

function sampleAt(data, progress) {
  if (!data?.length) return 0;
  const wrapped = ((progress % 1) + 1) % 1;
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(wrapped * (data.length - 1))));
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

function parseHex(color) {
  const six = /^#([0-9a-f]{6})$/i.exec(color || '');
  if (!six) return null;
  const value = Number.parseInt(six[1], 16);
  return [value >> 16, value >> 8 & 255, value & 255];
}

function rgba(color, alpha) {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(alpha)})`;
}

function mixColor(color, target, amount) {
  const source = parseHex(color);
  const destination = parseHex(target);
  if (!source || !destination) return color;
  const t = clamp(amount);
  const values = source.map((value, index) => Math.round(value + (destination[index] - value) * t));
  return `#${values.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function ellipsePoint(cx, cy, rx, ry, angle, rotation) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cr = Math.cos(rotation);
  const sr = Math.sin(rotation);
  return {
    x: cx + cos * rx * cr - sin * ry * sr,
    y: cy + cos * rx * sr + sin * ry * cr
  };
}

function drawEllipseArc(context, cx, cy, rx, ry, rotation, start, end, color, width, alpha, blur = 0) {
  context.beginPath();
  context.ellipse(cx, cy, rx, ry, rotation, start, end);
  context.strokeStyle = rgba(color, alpha);
  context.lineWidth = width;
  context.shadowColor = color;
  context.shadowBlur = blur;
  context.stroke();
}

/**
 * Halo Vector — Build 116 architectural pass.
 *
 * Full-frame, asymmetric orbital architecture. The visual deliberately avoids
 * the tiny concentric loading-spinner look from Build 115: three large rails,
 * long controlled arc spans, moving relay highlights and sparse vector bridges
 * fill the stage while retaining a restrained premium motion language.
 */
export function drawHaloVectorMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const minSide = Math.min(width, height);
  const rawBass = average(data, 0, data.length * .2);
  const rawMid = average(data, data.length * .2, data.length * .64);
  const rawHigh = average(data, data.length * .64, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.48, featureWeight: .32, exponent: .68 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.42, featureWeight: .34, exponent: .7 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.54, featureWeight: .3, exponent: .66 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.42, featureWeight: .32, exponent: .68 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');
  const punch = feature(features, 'punch');

  const pressureTarget = clamp(bass * .5 + kick * .58 + punch * .34 + energy * .14);
  const apertureTarget = clamp(mid * .55 + dynamics * .24 + high * .11 + energy * .12);
  const detailTarget = clamp(high * .58 + peak * .22 + dynamics * .2 + mid * .09);
  const flowTarget = clamp(energy * .45 + mid * .28 + high * .16 + bass * .13);

  const motion = beginMotionFrame(context, time);
  const pressureSpring = springChannel(motion, 'halo-pressure', pressureTarget, { stiffness: 46, damping: 8.4, maximum: 1.18 });
  const apertureSpring = springChannel(motion, 'halo-aperture', apertureTarget, { stiffness: 34, damping: 8.9, maximum: 1.12 });
  const detailSpring = springChannel(motion, 'halo-detail', detailTarget, { stiffness: 43, damping: 9.1, maximum: 1.12 });
  const flowSpring = springChannel(motion, 'halo-flow-drive', flowTarget, { stiffness: 25, damping: 8.4, maximum: 1.08 });

  const pressure = clamp(pressureSpring.value + pressureSpring.velocity * .01, 0, 1.14);
  const aperture = clamp(apertureSpring.value + apertureSpring.velocity * .006, 0, 1.08);
  const detail = clamp(detailSpring.value + detailSpring.velocity * .004, 0, 1.08);
  const flowDrive = clamp(flowSpring.value, 0, 1.04);
  const flow = advanceMotionPhase(motion, 'halo-vector-flow', flowDrive, {
    baseSpeed: .34,
    dynamicSpeed: 1.12,
    response: 4.4,
    release: 7.6
  });
  const phase = flow.phase;

  const primary = mixColor(accent, '#f5f7ff', .18);
  const secondary = mixColor(accent2, '#dff7ff', .12);
  const neutral = '#f4f7fb';
  const shadow = mixColor(accent, '#05030b', .72);

  const cx = width * (.515 + Math.sin(phase * .17) * .012 * (0.35 + flowDrive));
  const cy = height * (.515 + Math.cos(phase * .13 + .7) * .018 * (0.35 + flowDrive));
  const baseRx = Math.min(width * (mobile ? .42 : .36), minSide * (mobile ? .72 : .96));
  const baseRy = minSide * (mobile ? .24 : .285);
  const pressureScale = 1 + pressure * (mobile ? .095 : .14);
  const globalTilt = -.055 + Math.sin(phase * .23) * .045 + mid * .025;
  const depthShear = Math.sin(phase * .19 + .8) * .028 * (.45 + flowDrive);

  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, baseRx * 1.35);
  atmosphere.addColorStop(0, rgba(primary, .035 + pressure * .045));
  atmosphere.addColorStop(.38, rgba(secondary, .022 + aperture * .035));
  atmosphere.addColorStop(.72, rgba(shadow, .015 + detail * .016));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const railCount = mobile ? 3 : 4;
  const bridgeCount = mobile ? 7 : 11;
  const relayCount = mobile ? 4 : 7;
  const maxShadow = mobile ? 5 : 8;

  context.save();
  context.globalCompositeOperation = 'lighter';

  for (let rail = 0; rail < railCount; rail += 1) {
    const rp = rail / Math.max(1, railCount - 1);
    const direction = rail % 2 === 0 ? 1 : -1;
    const scale = .58 + rp * .48;
    const rx = baseRx * scale * pressureScale * (1 + pressure * rp * .035);
    const ry = baseRy * (scale * .88 + .14) * (1 + aperture * (.035 + rp * .02));
    const rotation = globalTilt + depthShear * (rp - .45) + Math.sin(phase * .21 + rail * .8) * (.012 + rp * .008);
    const orbit = direction * phase * (.2 + rp * .06) + rail * .72;
    const segmentCount = mobile ? 5 : 6;
    const segmentArc = TAU / segmentCount;

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const progress = (segment + .5) / segmentCount;
      const spectral = Math.pow(sampleAt(data, progress * .9 + rp * .09), .72);
      const drive = clamp(spectral * .58 + aperture * .2 + detail * .15 + pressure * .1);
      const gap = segmentArc * (.18 + (1 - drive) * .07 + aperture * .025);
      const drift = Math.sin(phase * .43 + segment * .91 + rail * .68) * .025 * (.25 + aperture);
      const start = orbit + segment * segmentArc + gap + drift;
      const span = segmentArc * (.7 + drive * .17) - gap * .2;
      const end = start + Math.max(segmentArc * .34, span);
      const stroke = (segment + rail) % 4 === 0 ? secondary : primary;
      const alpha = .11 + drive * .34 + rp * .055;
      const line = .9 + drive * 1.35 + pressure * .34 + rp * .16;
      drawEllipseArc(context, cx, cy, rx, ry, rotation, start, end, stroke, line, alpha,
        Math.min(maxShadow, 1.2 + drive * maxShadow * .52));
    }

    // One longer architectural blade per rail gives the composition hierarchy
    // instead of reading as a stack of equal dotted rings.
    const bladeDrive = clamp(pressure * .34 + detail * .3 + sampleAt(data, .16 + rp * .63) * .58);
    const bladeCenter = orbit + phase * (.08 + rp * .035) + rp * 1.25;
    const bladeSpan = .42 + bladeDrive * .48;
    drawEllipseArc(
      context, cx, cy, rx * (1 + rp * .012), ry * (1 + rp * .01), rotation,
      bladeCenter - bladeSpan, bladeCenter + bladeSpan,
      rail % 2 ? secondary : neutral,
      1.15 + bladeDrive * 2.1,
      .16 + bladeDrive * .44,
      Math.min(maxShadow, 2 + bladeDrive * maxShadow * .72)
    );
  }

  context.shadowBlur = 0;

  // Sparse bridges connect rails only when detail is present. They create a
  // graphic system / instrumentation feel without filling the frame with noise.
  for (let bridge = 0; bridge < bridgeCount; bridge += 1) {
    const p = (bridge + .5) / bridgeCount;
    const spectral = Math.pow(sampleAt(data, .28 + p * .66), .76);
    const bridgeDrive = clamp(detail * .34 + spectral * .56 + high * .16 - .12);
    if (bridgeDrive <= .02) continue;
    const angle = p * TAU + phase * .16 + Math.sin(phase * .31 + bridge) * .035;
    const rotationA = globalTilt - depthShear * .18;
    const rotationB = globalTilt + depthShear * .22;
    const inner = ellipsePoint(cx, cy, baseRx * .58 * pressureScale, baseRy * .65, angle, rotationA);
    const outer = ellipsePoint(cx, cy, baseRx * 1.02 * pressureScale, baseRy * 1.02, angle + .018 * Math.sin(bridge), rotationB);
    context.beginPath();
    context.moveTo(inner.x, inner.y);
    context.lineTo(outer.x, outer.y);
    context.strokeStyle = rgba(bridge % 3 ? secondary : neutral, .035 + bridgeDrive * .16);
    context.lineWidth = .45 + bridgeDrive * .65;
    context.stroke();
  }

  // Moving relay highlights are fast enough to read as musical motion, while
  // the rails themselves remain calm and editorial.
  for (let relay = 0; relay < relayCount; relay += 1) {
    const rp = (relay + 1) / (relayCount + 1);
    const spectral = Math.pow(sampleAt(data, .38 + rp * .55), .7);
    const relayDrive = clamp(detail * .42 + high * .24 + spectral * .5 + peak * .1);
    if (relayDrive < .045) continue;
    const ringScale = .62 + rp * .42;
    const rx = baseRx * ringScale * pressureScale;
    const ry = baseRy * (.72 + rp * .31) * (1 + aperture * .03);
    const rotation = globalTilt + depthShear * (rp - .5);
    const speed = .42 + relay * .035 + relayDrive * .15;
    const angle = phase * speed + rp * TAU + Math.sin(phase * .37 + relay * .9) * .06;
    const span = .045 + relayDrive * .095;
    const relayColor = relay % 3 === 0 ? neutral : secondary;
    drawEllipseArc(context, cx, cy, rx, ry, rotation, angle - span, angle + span,
      relayColor, 1.2 + relayDrive * 2.25, .2 + relayDrive * .5,
      Math.min(maxShadow, 2 + relayDrive * maxShadow * .75));
  }

  context.restore();
  context.shadowBlur = 0;

  // A very subtle pressure ellipse keeps kick/bass reaction physical without a
  // flash or full-screen scale jump.
  const pressureRing = clamp(pressure * .64 + punch * .28);
  if (pressureRing > .06) {
    const pulseRx = baseRx * (1.08 + pressureRing * .08);
    const pulseRy = baseRy * (1.04 + pressureRing * .06);
    context.beginPath();
    context.ellipse(cx, cy, pulseRx, pulseRy, globalTilt, 0, TAU);
    context.strokeStyle = rgba(primary, .025 + pressureRing * .1);
    context.lineWidth = .6 + pressureRing * .75;
    context.stroke();
  }
}
