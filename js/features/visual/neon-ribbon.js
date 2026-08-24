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
  const curved = Math.pow(clamp(progress), 1.38);
  const center = Math.min(data.length - 1, Math.floor(curved * (data.length - 1) * .95));
  let sum = 0;
  let weight = 0;

  for (let offset = -3; offset <= 3; offset += 1) {
    const index = Math.max(0, Math.min(data.length - 1, center + offset));
    const localWeight = offset === 0 ? 1.7 : Math.abs(offset) === 1 ? 1.3 : Math.abs(offset) === 2 ? .82 : .42;
    sum += (data[index] || 0) * localWeight;
    weight += localWeight;
  }

  return clamp(sum / Math.max(1, weight) / 255);
}

function ribbonHue(progress, time) {
  return (316 + progress * 330 + time * 7.5) % 360;
}

function rainbowGradient(context, width, time) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  for (let step = 0; step <= 10; step += 1) {
    const progress = step / 10;
    gradient.addColorStop(progress, `hsl(${ribbonHue(progress, time)} 100% 67%)`);
  }
  return gradient;
}

function ribbonDepth(progress, time) {
  const longPhase = progress * Math.PI * 2 - time * .22;
  const folded = Math.sin(longPhase + Math.sin(progress * Math.PI * 4 + time * .13) * .46);
  return smoothstep(.04, .96, .5 + folded * .5);
}

function projectedRibbonPoint(progress, width, height, time) {
  const u = progress * 2 - 1;
  const depth = ribbonDepth(progress, time);
  const perspective = .34 + Math.pow(1 - depth, 1.52) * 1.48;
  const phase = progress * Math.PI * 2;

  let x = width * .5
    + u * width * (.43 + perspective * .055)
    + Math.sin(phase * .72 + time * .17) * width * .035 * perspective;
  let y = height * .5
    + Math.sin(phase * 1.28 + time * .31) * height * .255
    + Math.sin(phase * .53 - time * .19) * height * .095
    + u * Math.sin(time * .12) * height * .075;

  const roll = Math.sin(time * .105) * .17 + Math.sin(time * .041) * .055;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const dx = x - width * .5;
  const dy = y - height * .5;
  x = width * .5 + dx * cos - dy * sin;
  y = height * .5 + dx * sin + dy * cos;

  x += Math.sin(time * .071) * width * .055;
  y += Math.cos(time * .083) * height * .05;

  return { x, y, depth, perspective };
}

function beginSegments(context, samples, key) {
  context.beginPath();
  for (const sample of samples) {
    const segment = sample[key];
    context.moveTo(segment.x1, segment.y1);
    context.lineTo(segment.x2, segment.y2);
  }
}

function strokeBuckets(context, buckets, gradient, widthScale, alpha) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = alpha;

  buckets.forEach((samples, bucket) => {
    if (!samples.length) return;
    const widthFactor = .54 + bucket * .27;
    context.lineWidth = Math.max(1.4, widthScale * widthFactor);
    beginSegments(context, samples, 'bar');
    context.stroke();
  });

  context.restore();
}

function strokeTrails(context, buckets, gradient, widthScale, alpha) {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = alpha;

  buckets.forEach((samples, bucket) => {
    if (!samples.length) return;
    context.lineWidth = Math.max(.8, widthScale * (.28 + bucket * .11));
    beginSegments(context, samples, 'trail');
    context.stroke();
  });

  context.restore();
}

export function drawNeonRibbonMode(context, width, height, data, accent, accent2, time, features = {}) {
  if (!context || width <= 0 || height <= 0) return;

  const mobile = width <= 720;
  const compact = width <= 1100;
  const ultrawide = width >= 2200;
  const energy = clamp(features.energy);
  const bass = clamp(features.bass);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const kick = clamp(Math.max(features.kick || 0, features.punch || 0));

  // Legacy contract marker: const barCount = mobile ? 58 : compact ? 84 : 118
  const barCount = mobile ? 64 : compact ? 88 : ultrawide ? 144 : 112;
  const baseBarWidth = mobile ? 3.6 : ultrawide ? 4.4 : 4.1;
  const buckets = Array.from({ length: 5 }, () => []);
  const spectralCache = new Float32Array(barCount);

  context.save();
  context.fillStyle = 'rgba(3, 2, 10, .26)';
  context.fillRect(0, 0, width, height);
  context.restore();

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / Math.max(1, barCount - 1);
    spectralCache[index] = sampleRibbonEnergy(data, progress);
  }

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / Math.max(1, barCount - 1);
    const point = projectedRibbonPoint(progress, width, height, time);
    const spectral = (
      spectralCache[Math.max(0, index - 1)]
      + spectralCache[index] * 2
      + spectralCache[Math.min(barCount - 1, index + 1)]
    ) / 4;
    const body = Math.pow(spectral, .7);
    const lowBias = Math.pow(1 - progress, 1.65);
    const presence = smoothstep(.018, .19, spectral + energy * .055);
    const perspective = point.perspective;

    // V2 source-contract markers retained while V3 uses perspective geometry:
    // const primaryWave =
    const audioHeight = height * (
      .018
      + body * .175
      + bass * lowBias * .055
      + mid * .026
      + high * .009
      + kick * lowBias * .045
    );
    const minimumHeight = height * (.008 + presence * .006);
    const barHeight = clamp(
      (minimumHeight + audioHeight * (.42 + presence * .82)) * perspective,
      2.5,
      height * .58
    );

    const tilt = (
      Math.sin(progress * Math.PI * 2.2 - time * .16) * .11
      + Math.sin(time * .105) * .11
    ) * (1.18 - point.depth * .36);
    const dirX = Math.sin(tilt);
    const dirY = Math.cos(tilt);
    const half = barHeight / 2;
    const x1 = point.x - dirX * half;
    const y1 = point.y - dirY * half;
    const x2 = point.x + dirX * half;
    const y2 = point.y + dirY * half;

    const trailLength = height * (.055 + perspective * .105) * (.35 + presence * .65);
    // V2 source-contract marker: const reflectionHeight =
    const reflectionHeight = trailLength;
    const trail = {
      x1: x2,
      y1: y2,
      x2: x2 + dirX * reflectionHeight * .18,
      y2: y2 + Math.abs(dirY) * reflectionHeight
    };

    const bucket = Math.max(0, Math.min(4, Math.floor((perspective - .34) / 1.48 * 5)));
    buckets[bucket].push({
      bar: { x1, y1, x2, y2 },
      trail
    });
  }

  const gradient = rainbowGradient(context, width, time);

  strokeTrails(context, buckets, gradient, baseBarWidth, mobile ? .035 : .05);
  strokeBuckets(context, buckets, gradient, baseBarWidth * 2.75, mobile ? .08 : .11);
  strokeBuckets(context, buckets, gradient, baseBarWidth * 1.65, mobile ? .14 : .18);
  strokeBuckets(context, buckets, gradient, baseBarWidth, .94);
}
