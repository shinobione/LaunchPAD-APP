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

/**
 * Halo Vector — Build 115.
 *
 * A restrained, editorial halo system: slow orbital motion provides the base
 * choreography, while bass pressure changes scale, mids open the segmented
 * architecture, and highs travel through the rings as fine signal relays.
 * Nothing flashes and no local random jitter is used; every motion is spring-
 * smoothed and derived from the shared Audio Lab FFT/features.
 */
export function drawHaloVectorMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const minSide = Math.min(width, height);
  const cx = width * .5;
  const cy = height * .5;

  const rawBass = average(data, 0, data.length * .2);
  const rawMid = average(data, data.length * .2, data.length * .64);
  const rawHigh = average(data, data.length * .64, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = shapeAudioDrive(rawBass, feature(features, 'bass'), { rawGain: 1.34, featureWeight: .34, exponent: .72 });
  const mid = shapeAudioDrive(rawMid, feature(features, 'mid'), { rawGain: 1.3, featureWeight: .34, exponent: .74 });
  const high = shapeAudioDrive(rawHigh, feature(features, 'high'), { rawGain: 1.42, featureWeight: .3, exponent: .7 });
  const energy = shapeAudioDrive(rawEnergy, feature(features, 'energy'), { rawGain: 1.32, featureWeight: .32, exponent: .72 });
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const pressureTarget = clamp(bass * .58 + kick * .5 + energy * .12);
  const apertureTarget = clamp(mid * .58 + dynamics * .23 + high * .08 + energy * .14);
  const detailTarget = clamp(high * .62 + peak * .22 + dynamics * .16 + mid * .08);
  const flowTarget = clamp(energy * .48 + mid * .28 + high * .16 + bass * .1);

  const motion = beginMotionFrame(context, time);
  const pressureSpring = springChannel(motion, 'halo-pressure', pressureTarget, { stiffness: 35, damping: 8.4, maximum: 1.08 });
  const apertureSpring = springChannel(motion, 'halo-aperture', apertureTarget, { stiffness: 27, damping: 8.8, maximum: 1.04 });
  const detailSpring = springChannel(motion, 'halo-detail', detailTarget, { stiffness: 39, damping: 9.2, maximum: 1.08 });
  const flowSpring = springChannel(motion, 'halo-flow-drive', flowTarget, { stiffness: 22, damping: 8.6, maximum: 1.02 });

  const pressure = clamp(pressureSpring.value + pressureSpring.velocity * .008, 0, 1.06);
  const aperture = clamp(apertureSpring.value + apertureSpring.velocity * .004, 0, 1.02);
  const detail = clamp(detailSpring.value + detailSpring.velocity * .003, 0, 1.06);
  const flowDrive = clamp(flowSpring.value, 0, 1);
  const flow = advanceMotionPhase(motion, 'halo-vector-flow', flowDrive, {
    baseSpeed: .22,
    dynamicSpeed: .82,
    response: 3.6,
    release: 7.8
  });
  const phase = flow.phase;

  const primary = mixColor(accent, '#dbe9ff', .44);
  const secondary = mixColor(accent2, '#b9f3ff', .36);
  const neutral = '#e7eef8';
  const deep = mixColor(accent, '#05030b', .78);

  const baseRadius = minSide * (mobile ? .265 : .29);
  const pressureScale = 1 + pressure * (mobile ? .09 : .115);
  const driftRadius = baseRadius * (.012 + flowDrive * .024);
  const driftX = Math.sin(phase * .46) * driftRadius;
  const driftY = Math.cos(phase * .37 + .8) * driftRadius * .58;
  const globalTilt = Math.sin(phase * .23) * .055 + Math.sin(phase * .11 + 1.1) * .025;
  const ellipseRatio = .67 + aperture * .035 + Math.sin(phase * .31) * .012;

  const auraRadius = baseRadius * (1.65 + pressure * .28);
  const aura = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, auraRadius);
  aura.addColorStop(0, rgba(primary, .026 + pressure * .045));
  aura.addColorStop(.34, rgba(secondary, .018 + aperture * .026));
  aura.addColorStop(.7, rgba(deep, .018 + detail * .012));
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = aura;
  context.fillRect(0, 0, width, height);

  const ringCount = mobile ? 4 : 6;
  const segmentCount = mobile ? 18 : 30;
  const pulseCount = mobile ? 3 : 5;
  const maxShadow = mobile ? 5 : 9;

  context.save();
  context.globalCompositeOperation = 'lighter';

  for (let ring = 0; ring < ringCount; ring += 1) {
    const ringProgress = ring / Math.max(1, ringCount - 1);
    const direction = ring % 2 === 0 ? 1 : -1;
    const ringPhase = direction * phase * (.23 + ringProgress * .11) + ring * .58;
    const ringPressure = 1 + pressure * (.035 + ringProgress * .03);
    const rx = baseRadius * (.5 + ringProgress * .66) * pressureScale * ringPressure;
    const ry = rx * (ellipseRatio + ringProgress * .018);
    const ringRotation = globalTilt + Math.sin(phase * .17 + ring * .9) * (.012 + ringProgress * .008);
    const segmentArc = TAU / segmentCount;

    for (let segment = 0; segment < segmentCount; segment += 1) {
      const progress = (segment + .5) / segmentCount;
      const spectral = Math.pow(sampleAt(data, progress * .91 + ringProgress * .07), .84);
      const localDrive = clamp(spectral * .64 + aperture * .22 + detail * .16 + pressure * .08);
      const gate = .18 + ringProgress * .04;
      const alive = clamp((localDrive - gate) / Math.max(.001, 1 - gate));
      const opening = segmentArc * (.14 + (1 - alive) * .1 + aperture * .04);
      const angularDrift = Math.sin(phase * .41 + segment * .37 + ring * .8) * .007 * aperture;
      const start = segment * segmentArc + opening + ringPhase + angularDrift;
      const span = segmentArc * (.66 + alive * .16) - opening * .36;
      const end = start + Math.max(segmentArc * .16, span);
      const stroke = (segment + ring * 2) % 7 === 0 ? secondary : primary;
      const alpha = .055 + alive * .29 + ringProgress * .035 + detail * .025;

      context.beginPath();
      context.ellipse(cx + driftX, cy + driftY, rx, ry, ringRotation, start, end);
      context.strokeStyle = rgba(stroke, alpha);
      context.lineWidth = .55 + alive * 1.25 + pressure * .25;
      context.shadowColor = stroke;
      context.shadowBlur = Math.min(maxShadow, alive * maxShadow * .58 + detail * 1.4);
      context.stroke();

      if (detail > .08 && segment % (mobile ? 5 : 4) === ring % (mobile ? 5 : 4)) {
        const tickDrive = clamp(high * .56 + spectral * .52 + detail * .18 - .16);
        if (tickDrive > .025) {
          const angle = (start + end) * .5;
          const inner = ellipsePoint(cx + driftX, cy + driftY, rx, ry, angle, ringRotation);
          const tickLength = minSide * (.006 + tickDrive * .017);
          const outer = ellipsePoint(
            cx + driftX,
            cy + driftY,
            rx + tickLength,
            ry + tickLength * ellipseRatio,
            angle,
            ringRotation
          );
          context.shadowBlur = 0;
          context.beginPath();
          context.moveTo(inner.x, inner.y);
          context.lineTo(outer.x, outer.y);
          context.strokeStyle = rgba(neutral, .035 + tickDrive * .23);
          context.lineWidth = .45 + tickDrive * .65;
          context.stroke();
        }
      }
    }
  }

  context.shadowBlur = 0;

  for (let pulse = 0; pulse < pulseCount; pulse += 1) {
    const pulseProgress = pulse / pulseCount;
    const ringProgress = (pulse + 1) / (pulseCount + 1);
    const rx = baseRadius * (.58 + ringProgress * .62) * pressureScale;
    const ry = rx * (ellipseRatio + ringProgress * .014);
    const rotation = globalTilt + Math.sin(phase * .19 + pulse) * .014;
    const spectral = Math.pow(sampleAt(data, .42 + pulseProgress * .52), .76);
    const relayDrive = clamp(detail * .42 + high * .26 + spectral * .48 + peak * .08);
    if (relayDrive < .055) continue;

    const speed = .48 + pulse * .055 + relayDrive * .12;
    const centerAngle = phase * speed + pulseProgress * TAU + Math.sin(phase * .29 + pulse) * .06;
    const span = .055 + relayDrive * .12;
    const pulseColor = pulse % 2 ? secondary : neutral;

    context.beginPath();
    context.ellipse(cx + driftX, cy + driftY, rx, ry, rotation, centerAngle - span, centerAngle + span);
    context.strokeStyle = rgba(pulseColor, .12 + relayDrive * .42);
    context.lineWidth = .8 + relayDrive * 1.7;
    context.shadowColor = pulseColor;
    context.shadowBlur = Math.min(maxShadow, 2 + relayDrive * maxShadow * .72);
    context.stroke();
  }

  context.restore();

  const coreRadiusX = baseRadius * (.2 + pressure * .025);
  const coreRadiusY = coreRadiusX * .62;
  const coreGlow = context.createRadialGradient(cx + driftX, cy + driftY, 0, cx + driftX, cy + driftY, coreRadiusX * 2.8);
  coreGlow.addColorStop(0, rgba(primary, .035 + pressure * .05));
  coreGlow.addColorStop(.42, rgba(secondary, .018 + detail * .026));
  coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = coreGlow;
  context.beginPath();
  context.ellipse(cx + driftX, cy + driftY, coreRadiusX * 2.8, coreRadiusY * 2.8, globalTilt, 0, TAU);
  context.fill();

  context.fillStyle = 'rgba(5,3,11,.86)';
  context.beginPath();
  context.ellipse(cx + driftX, cy + driftY, coreRadiusX, coreRadiusY, globalTilt, 0, TAU);
  context.fill();

  context.strokeStyle = rgba(neutral, .07 + detail * .16 + pressure * .05);
  context.lineWidth = .65 + pressure * .45;
  context.beginPath();
  context.ellipse(cx + driftX, cy + driftY, coreRadiusX * 1.04, coreRadiusY * 1.04, globalTilt, 0, TAU);
  context.stroke();
}
