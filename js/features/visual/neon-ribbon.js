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
  const targetSpacing = mobile ? 11.4 : compact ? 12.2 : 13.2;
  // Legacy contract marker: const barCount = mobile ? 58 : compact ? 84 : 118
  const barCount = Math.round(clamp(usableWidth / targetSpacing, mobile ? 60 : 92, mobile ? 108 : 148));
  const spacing = usableWidth / Math.max(1, barCount - 1);
  const barWidth = Math.max(2.3, Math.min(mobile ? 4.4 : 5.3, spacing * .48));

  const drift = time * (.16 + energy * .045);
  const centerY = height * (.5 + Math.sin(time * .11) * .01);
  const travelBase = Math.min(height * .18, width * .044);
  // Legacy contract marker: const primaryWave =
  const primaryWave = travelBase * (.78 + bass * .12);
  const secondaryWave = travelBase * (.2 + mid * .09);
  const rippleWave = travelBase * (.028 + high * .032);
  const bodyBase = Math.min(height * .28, width * .055);
  const minimumBarHeight = Math.max(3, Math.min(6.5, height * .013));

  const nearCenter = .24 + (Math.sin(time * .15) * .5 + .5) * .5;
  const secondaryCenter = .14 + (Math.cos(time * .12 + 1.2) * .5 + .5) * .68;
  const cameraRoll = Math.sin(time * .085) * .12;
  const cameraPitch = Math.cos(time * .097) * .045;

  const farSamples = [];
  const midSamples = [];
  const nearSamples = [];

  context.save();
  context.fillStyle = 'rgba(4, 2, 12, .3)';
  context.fillRect(0, 0, width, height);
  context.restore();

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / Math.max(1, barCount - 1);
    const spectral = sampleRibbonEnergy(data, progress);
    const body = Math.pow(spectral, .58);
    const presence = smoothstep(.02, .18, spectral + energy * .05);
    const lowBias = Math.pow(1 - progress, 1.6);

    const nearField = gaussian(progress, nearCenter, .18);
    const secondaryField = gaussian(progress, secondaryCenter, .28);
    const depthWave = .5 + .5 * Math.sin(progress * Math.PI * 3.35 - time * .5 + cameraRoll * 4.8);
    const perspective = clamp(.14 + nearField * .76 + secondaryField * .26 + depthWave * .16);
    const perspectiveScale = lerp(.35, 1.12, perspective);

    const phase = progress * Math.PI * 4.05 - drift;
    const sweep = Math.sin(phase) * primaryWave;
    const sway = Math.sin(progress * Math.PI * 2.2 + drift * .72) * secondaryWave;
    const shimmer = Math.sin(progress * Math.PI * 13.5 - time * 1.2) * rippleWave;
    const kickPush = Math.sin(progress * Math.PI * 2.5 - time * 1.4) * kick * lowBias * travelBase * .2;
    const y = centerY
      + (sweep + sway + shimmer - kickPush) * (.68 + perspectiveScale * .58)
      + (progress - .5) * cameraRoll * height * .2
      + cameraPitch * height * (.24 - perspective * .18);

    const x = padding
      + progress * usableWidth
      + Math.sin(progress * Math.PI * 2.15 + drift * .5) * width * .008 * (perspective - .3)
      + (perspective - .5) * width * .014 * cameraRoll;

    const localPulse = Math.sin(progress * Math.PI * 7.8 - time * (.72 + high * .28)) * (.018 + high * .024);
    const thicknessDrive = .72 + presence * .18 + body * .22 + kick * lowBias * .16 + localPulse;
    const edgeTaper = .72 + smoothstep(.02, .16, progress) * .16 + (1 - smoothstep(.84, .98, progress)) * .12;
    const barHeight = minimumBarHeight + bodyBase * perspectiveScale * thicknessDrive * edgeTaper;

    const beamLength = (mobile ? 18 : 28) + perspective * (mobile ? 22 : 40) + energy * 10;
    const beamAngle = .18 + (progress - .5) * .6 + cameraRoll * .45;
    const beamX = x + Math.sin(beamAngle) * beamLength;
    const beamY = y + barHeight * .55 + Math.cos(beamAngle) * beamLength * (.75 + perspective * .25);
    // Legacy contract marker: const reflectionHeight =
    const reflectionHeight = beamLength;

    const sample = {
      x,
      y,
      height: barHeight,
      beamX,
      beamY,
      depth: perspective,
      reflectionHeight
    };

    if (perspective > .72) nearSamples.push(sample);
    else if (perspective > .42) midSamples.push(sample);
    else farSamples.push(sample);
  }

  const gradient = rainbowGradient(context, width, time);
  const groups = [
    { samples: farSamples, alpha: mobile ? .2 : .22, width: barWidth * .92 },
    { samples: midSamples, alpha: mobile ? .34 : .38, width: barWidth * 1.02 },
    { samples: nearSamples, alpha: mobile ? .52 : .58, width: barWidth * 1.16 }
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
    context.lineWidth = group.width * 2.75;
    context.stroke();

    beginRibbonBars(context, group.samples);
    context.globalAlpha = group.alpha * .64;
    context.lineWidth = group.width * 1.7;
    context.stroke();

    beginRibbonBars(context, group.samples);
    context.globalAlpha = Math.min(.97, group.alpha + .26);
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
    context.globalAlpha = (mobile ? .035 : .05) + group.alpha * .05;
    context.lineWidth = Math.max(1.1, group.width * .62);
    context.stroke();
  }
  context.restore();
}
