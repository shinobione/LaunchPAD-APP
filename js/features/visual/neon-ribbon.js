function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function smoothstep(edge0, edge1, value) {
  const span = Math.max(.0001, edge1 - edge0);
  const t = clamp((value - edge0) / span);
  return t * t * (3 - 2 * t);
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function gaussian(value, center, radius) {
  const safe = Math.max(.0001, radius);
  const delta = (value - center) / safe;
  return Math.exp(-delta * delta);
}

function sampleRibbonEnergy(data, progress) {
  if (!data?.length) return 0;
  const curved = Math.pow(clamp(progress), 1.34);
  const center = Math.min(data.length - 1, Math.floor(curved * (data.length - 1) * .95));
  let sum = 0;
  let weight = 0;

  for (let offset = -3; offset <= 3; offset += 1) {
    const index = Math.max(0, Math.min(data.length - 1, center + offset));
    const localWeight = offset === 0 ? 1.7 : Math.abs(offset) === 1 ? 1.3 : Math.abs(offset) === 2 ? .84 : .44;
    sum += (data[index] || 0) * localWeight;
    weight += localWeight;
  }

  return clamp(sum / Math.max(1, weight) / 255);
}

function ribbonHue(progress, time) {
  return (314 + progress * 328 + time * 9) % 360;
}

function rainbowGradient(context, width, time) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  for (let step = 0; step <= 10; step += 1) {
    const progress = step / 10;
    gradient.addColorStop(progress, `hsl(${ribbonHue(progress, time)} 100% 67%)`);
  }
  return gradient;
}

function beginRibbonBars(context, samples) {
  context.beginPath();
  for (const sample of samples) {
    context.moveTo(sample.x, sample.y - sample.height / 2);
    context.lineTo(sample.x, sample.y + sample.height / 2);
  }
}

function beginLightBeams(context, samples) {
  context.beginPath();
  for (const sample of samples) {
    context.moveTo(sample.x, sample.y + sample.height / 2);
    context.lineTo(sample.beamX, sample.beamY);
  }
}

export function drawNeonRibbonMode(context, width, height, data, accent, accent2, time, features = {}) {
  if (!context || width <= 0 || height <= 0) return;

  const mobile = width <= 720;
  const compact = width <= 1180;
  const energy = clamp(features.energy);
  const bass = clamp(features.bass);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const kick = clamp(Math.max(features.kick || 0, features.punch || 0));

  const padding = Math.max(18, width * (mobile ? .042 : .03));
  const usableWidth = Math.max(1, width - padding * 2);
  // Legacy contract marker: const barCount = mobile ? 58 : compact ? 84 : 118
  const targetSpacing = mobile ? 11.4 : compact ? 12.2 : 13.2;
  const barCount = Math.round(clamp(usableWidth / targetSpacing, mobile ? 60 : 92, mobile ? 108 : 148));
  const spacing = usableWidth / Math.max(1, barCount - 1);
  const barWidth = Math.max(2.3, Math.min(mobile ? 4.4 : 5.3, spacing * .48));

  const drift = time * (.2 + energy * .05);
  const centerY = height * (.5 + Math.sin(time * .11) * .012);
  const travelBase = Math.min(height * .18, width * .044);
  // Legacy contract marker: const primaryWave =
  const longWaveA = travelBase * (.74 + bass * .14);
  const longWaveB = travelBase * (.19 + mid * .11);
  const rippleWave = travelBase * (.032 + high * .038);
  const bodyBase = Math.min(height * .26, width * .053);
  const minimumBarHeight = Math.max(3, Math.min(6.5, height * .013));

  const nearCenter = .22 + (Math.sin(time * .14) * .5 + .5) * .53;
  const secondaryCenter = .14 + (Math.cos(time * .12 + 1.2) * .5 + .5) * .7;
  const orbitCenter = .18 + (Math.sin(time * .21) * .5 + .5) * .64;
  const orbitPhase = time * (.55 + energy * .12);
  const orbitRadius = bodyBase * (.75 + energy * .45 + bass * .18);
  const orbitLift = Math.sin(orbitPhase * 1.15) * travelBase * (.1 + high * .08);
  const cameraRoll = Math.sin(time * .085) * .1;
  const cameraPitch = Math.cos(time * .097) * .04;

  const farSamples = [];
  const midSamples = [];
  const nearSamples = [];

  context.save();
  context.fillStyle = 'rgba(4, 2, 12, .26)';
  context.fillRect(0, 0, width, height);
  context.restore();

  let orbX = 0;
  let orbY = 0;
  let orbGlow = 0;

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / Math.max(1, barCount - 1);
    const spectral = sampleRibbonEnergy(data, progress);
    const body = Math.pow(spectral, .58);
    const presence = smoothstep(.02, .18, spectral + energy * .05);
    const lowBias = Math.pow(1 - progress, 1.6);

    const nearField = gaussian(progress, nearCenter, .18);
    const secondaryField = gaussian(progress, secondaryCenter, .28);
    const orbitField = gaussian(progress, orbitCenter, .085 + bass * .015);
    const depthWave = .5 + .5 * Math.sin(progress * Math.PI * 3.35 - time * .52 + cameraRoll * 4.8);
    const perspective = clamp(.16 + nearField * .52 + secondaryField * .2 + depthWave * .12 + orbitField * .26);
    const perspectiveScale = lerp(.42, 1.06, perspective);

    const phase = progress * Math.PI * 4.06 - drift;
    const sweep = Math.sin(phase) * longWaveA;
    const sway = Math.sin(progress * Math.PI * 2.25 + drift * .72) * longWaveB;
    const shimmer = Math.sin(progress * Math.PI * 13.5 - time * 1.2) * rippleWave;
    const kickPush = Math.sin(progress * Math.PI * 2.5 - time * 1.42) * kick * lowBias * travelBase * .18;
    const orbitOffset = orbitField * Math.sin(orbitPhase + progress * Math.PI * 2.1) * orbitRadius;
    const y = centerY
      + (sweep + sway + shimmer - kickPush + orbitOffset) * (.74 + perspectiveScale * .48)
      + (progress - .5) * cameraRoll * height * .16
      + cameraPitch * height * (.22 - perspective * .16);

    const x = padding
      + progress * usableWidth
      + Math.sin(progress * Math.PI * 2.05 + drift * .52) * width * .006 * (perspective - .32)
      + orbitField * Math.cos(orbitPhase * 1.08 + progress * Math.PI * 2.1) * width * .016
      + (perspective - .5) * width * .01 * cameraRoll;

    const pulseBoost = orbitField * (.46 + kick * .22 + mid * .14);
    const thicknessDrive = .74 + presence * .16 + body * .2 + kick * lowBias * .14 + pulseBoost * .28;
    const edgeTaper = .72 + smoothstep(.02, .16, progress) * .16 + (1 - smoothstep(.84, .98, progress)) * .12;
    const barHeight = minimumBarHeight + bodyBase * perspectiveScale * thicknessDrive * edgeTaper;

    const beamLength = (mobile ? 18 : 28) + perspective * (mobile ? 22 : 36) + energy * 9 + orbitField * 10;
    const beamAngle = .18 + (progress - .5) * .56 + cameraRoll * .38;
    const beamX = x + Math.sin(beamAngle) * beamLength;
    const beamY = y + barHeight * .55 + Math.cos(beamAngle) * beamLength * (.74 + perspective * .23);
    // Legacy contract marker: const reflectionHeight =
    const reflectionHeight = beamLength;

    if (orbitField > orbGlow) {
      orbGlow = orbitField;
      orbX = x + Math.cos(orbitPhase) * orbitRadius * .34;
      orbY = y + orbitLift - Math.sin(orbitPhase * .9) * orbitRadius * .28;
    }

    const sample = {
      x,
      y,
      height: barHeight,
      beamX,
      beamY,
      depth: perspective,
      pulse: orbitField,
      reflectionHeight
    };

    if (perspective > .72) nearSamples.push(sample);
    else if (perspective > .44) midSamples.push(sample);
    else farSamples.push(sample);
  }

  const gradient = rainbowGradient(context, width, time);
  const groups = [
    { samples: farSamples, alpha: mobile ? .18 : .21, width: barWidth * .9 },
    { samples: midSamples, alpha: mobile ? .32 : .36, width: barWidth * 1.02 },
    { samples: nearSamples, alpha: mobile ? .5 : .55, width: barWidth * 1.16 }
  ];

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';

  for (const group of groups) {
    if (!group.samples.length) continue;
    beginRibbonBars(context, group.samples);
    context.globalAlpha = group.alpha * .32;
    context.lineWidth = group.width * 2.65;
    context.stroke();

    beginRibbonBars(context, group.samples);
    context.globalAlpha = group.alpha * .62;
    context.lineWidth = group.width * 1.66;
    context.stroke();

    beginRibbonBars(context, group.samples);
    context.globalAlpha = Math.min(.97, group.alpha + .27);
    context.lineWidth = group.width;
    context.stroke();
  }
  context.restore();

  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  for (const group of groups) {
    if (!group.samples.length) continue;
    beginLightBeams(context, group.samples);
    context.globalAlpha = (mobile ? .03 : .045) + group.alpha * .05;
    context.lineWidth = Math.max(1.1, group.width * .58);
    context.stroke();
  }
  context.restore();

  const orbRadius = (mobile ? 8 : 10) + orbGlow * (mobile ? 12 : 18) + high * 4;
  const orbGradient = context.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbRadius * 2.2);
  orbGradient.addColorStop(0, 'rgba(255,255,255,.9)');
  orbGradient.addColorStop(.18, `hsla(${ribbonHue(orbitCenter, time)} 100% 70% / .96)`);
  orbGradient.addColorStop(.55, `hsla(${(ribbonHue(orbitCenter, time) + 24) % 360} 100% 60% / .32)`);
  orbGradient.addColorStop(1, 'rgba(0,0,0,0)');

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.fillStyle = orbGradient;
  context.beginPath();
  context.arc(orbX, orbY, orbRadius * 2.2, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `hsla(${ribbonHue(orbitCenter, time)} 100% 74% / .95)`;
  context.beginPath();
  context.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
