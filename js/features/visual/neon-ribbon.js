function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function smoothstep(edge0, edge1, value) {
  const span = Math.max(.0001, edge1 - edge0);
  const t = clamp((value - edge0) / span);
  return t * t * (3 - 2 * t);
}

function sampleRibbonEnergy(data, progress) {
  if (!data?.length) return 0;
  const curved = Math.pow(clamp(progress), 1.42);
  const center = Math.min(data.length - 1, Math.floor(curved * (data.length - 1) * .95));
  let sum = 0;
  let weight = 0;

  for (let offset = -3; offset <= 3; offset += 1) {
    const index = Math.max(0, Math.min(data.length - 1, center + offset));
    const localWeight = offset === 0 ? 1.7 : Math.abs(offset) === 1 ? 1.3 : Math.abs(offset) === 2 ? .85 : .45;
    sum += (data[index] || 0) * localWeight;
    weight += localWeight;
  }

  return clamp(sum / Math.max(1, weight) / 255);
}

function ribbonHue(progress, time) {
  return (314 + progress * 322 + time * 18) % 360;
}

function rainbowGradient(context, width, time) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  for (let step = 0; step <= 8; step += 1) {
    const progress = step / 8;
    gradient.addColorStop(progress, `hsl(${ribbonHue(progress, time)} 100% 67%)`);
  }
  return gradient;
}

function beginRibbonBars(context, samples, reflection = false) {
  context.beginPath();
  for (const sample of samples) {
    const segmentHeight = reflection ? sample.reflectionHeight : sample.height;
    const center = reflection ? sample.reflectionY + segmentHeight / 2 : sample.y;
    const half = segmentHeight / 2;
    context.moveTo(sample.x, center - half);
    context.lineTo(sample.x, center + half);
  }
}

export function drawNeonRibbonMode(context, width, height, data, accent, accent2, time, features = {}) {
  if (!context || width <= 0 || height <= 0) return;

  const mobile = width <= 720;
  const compact = width <= 1100;
  const energy = clamp(features.energy);
  const bass = clamp(features.bass);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const kick = clamp(Math.max(features.kick || 0, features.punch || 0));

  const padding = Math.max(16, width * (mobile ? .04 : .032));
  const usableWidth = Math.max(1, width - padding * 2);
  const targetSpacing = mobile ? 10.5 : compact ? 10.8 : 11.4;
  // V1 fixed geometry (retired): const barCount = mobile ? 58 : compact ? 84 : 118
  const barCount = Math.round(clamp(usableWidth / targetSpacing, mobile ? 62 : 104, mobile ? 110 : 260));
  const spacing = usableWidth / Math.max(1, barCount - 1);
  const barWidth = Math.max(2.4, Math.min(mobile ? 4.4 : 5.2, spacing * .48));

  const centerY = height * (.505 + Math.sin(time * .16) * .008);
  const referenceTravel = Math.min(height * .19, width * .047);
  const primaryWave = referenceTravel * (.72 + bass * .28 + kick * .14);
  const secondaryWave = referenceTravel * (.13 + mid * .11);
  const highRipple = referenceTravel * (.015 + high * .035);
  const referenceThickness = Math.min(height * .33, width * .067);
  const minimumBarHeight = Math.max(3.5, Math.min(7, height * .015));
  const samples = [];

  context.save();
  context.fillStyle = 'rgba(4, 2, 12, .42)';
  context.fillRect(0, 0, width, height);
  context.restore();

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / Math.max(1, barCount - 1);
    const spectral = sampleRibbonEnergy(data, progress);
    const body = Math.pow(spectral, .56);
    const lowBias = Math.pow(1 - progress, 1.75);
    const presence = smoothstep(.025, .175, spectral + bass * lowBias * .045);

    const wavePhase = progress * Math.PI * 4.05 - time * (.78 + bass * .18);
    const wave =
      Math.sin(wavePhase) * primaryWave
      + Math.sin(progress * Math.PI * 2.15 + time * .31) * secondaryWave
      + Math.sin(progress * Math.PI * 12.5 - time * 1.15) * highRipple;
    const kickLift = Math.sin(progress * Math.PI * 2.4 - time * 1.7) * kick * lowBias * referenceTravel * .16;
    const y = centerY + wave - kickLift;

    const thicknessDrive = .78 + body * .36 + energy * .18 + kick * lowBias * .12;
    const barHeight = minimumBarHeight + presence * referenceThickness * thicknessDrive;
    const reflectionHeight = Math.max(2.5, barHeight * (.18 + energy * .035));
    const reflectionY = y + barHeight * .54 + Math.max(5, height * .016);

    samples.push({
      x: padding + progress * usableWidth,
      y,
      height: barHeight,
      reflectionHeight,
      reflectionY
    });
  }

  const gradient = rainbowGradient(context, width, time);

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  beginRibbonBars(context, samples);

  context.globalAlpha = mobile ? .11 : .14;
  context.lineWidth = barWidth * 2.65;
  context.stroke();

  context.globalAlpha = mobile ? .2 : .24;
  context.lineWidth = barWidth * 1.62;
  context.stroke();

  context.globalAlpha = .94;
  context.lineWidth = barWidth;
  context.stroke();
  context.restore();

  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = mobile ? .07 : .09;
  context.lineWidth = Math.max(1.5, barWidth * .82);
  beginRibbonBars(context, samples, true);
  context.stroke();
  context.restore();
}
