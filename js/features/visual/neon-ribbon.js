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
  const curved = Math.pow(clamp(progress), 1.27);
  const center = Math.min(data.length - 1, Math.floor(curved * (data.length - 1) * .96));
  const previous = Math.max(0, center - 1);
  const next = Math.min(data.length - 1, center + 1);
  return clamp(((data[center] || 0) * .62 + (data[previous] || 0) * .19 + (data[next] || 0) * .19) / 255);
}

function ribbonHue(progress, time) {
  return (318 + progress * 322 + time * 8.2) % 360;
}

function rainbowGradient(context, width, time) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  for (let step = 0; step <= 12; step += 1) {
    const progress = step / 12;
    gradient.addColorStop(progress, `hsl(${ribbonHue(progress, time)} 100% 66%)`);
  }
  return gradient;
}

function rotateVector(x, y, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine
  };
}

function projectOrbitPoint(theta, centerX, centerY, radiusX, radiusY, roll) {
  const localX = Math.cos(theta) * radiusX;
  const localY = Math.sin(theta) * radiusY;
  const point = rotateVector(localX, localY, roll);

  let normalX = Math.cos(theta) / Math.max(1, radiusX);
  let normalY = Math.sin(theta) / Math.max(1, radiusY);
  const normalLength = Math.hypot(normalX, normalY) || 1;
  normalX /= normalLength;
  normalY /= normalLength;
  const normal = rotateVector(normalX, normalY, roll);

  return {
    x: centerX + point.x,
    y: centerY + point.y,
    normalX: normal.x,
    normalY: normal.y
  };
}

function beginSegments(context, samples, key) {
  context.beginPath();
  for (const sample of samples) {
    const segment = sample[key];
    context.moveTo(segment.x1, segment.y1);
    context.lineTo(segment.x2, segment.y2);
  }
}

function drawBuckets(context, buckets, gradient, baseWidth, alpha, key) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = alpha;

  buckets.forEach((samples, bucket) => {
    if (!samples.length) return;
    const depthWidth = .66 + bucket * .16;
    context.lineWidth = Math.max(.85, baseWidth * depthWidth);
    beginSegments(context, samples, key);
    context.stroke();
  });

  context.restore();
}

export function drawNeonRibbonMode(context, width, height, data, accent, accent2, time, features = {}) {
  if (!context || width <= 0 || height <= 0) return;

  const mobile = width <= 720;
  const compact = width <= 1180;
  const ultrawide = width >= 2200;
  const energy = clamp(features.energy);
  const bass = clamp(features.bass);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const kick = clamp(Math.max(features.kick || 0, features.punch || 0));

  // Legacy contract marker retained for pre-V6 regression guards:
  // const barCount = mobile ? 58 : compact ? 84 : 118
  const barCount = mobile ? 76 : compact ? 108 : ultrawide ? 148 : 132;
  const barWidth = mobile ? 2.6 : ultrawide ? 3.6 : 3.25;
  const spectrum = new Float32Array(barCount);
  const buckets = Array.from({ length: 5 }, () => []);

  for (let index = 0; index < barCount; index += 1) {
    spectrum[index] = sampleRibbonEnergy(data, index / Math.max(1, barCount - 1));
  }

  // V6 is a moving circular/elliptical carrier like the source video, not a full-width sine ribbon.
  // Legacy contract marker: const primaryWave =
  const centerX = width * (.5 + Math.sin(time * .16) * (mobile ? .035 : .06));
  const centerY = height * (.93 + Math.cos(time * .13) * .105 + Math.sin(time * .057) * .035);
  const radiusX = width * (mobile ? .68 : .595) * (1 + Math.sin(time * .071) * .018);
  const radiusY = height * (mobile ? 1.18 : 1.07) * (1 + Math.cos(time * .089) * .035);
  const roll = Math.sin(time * .105) * (mobile ? .045 : .07) + Math.sin(time * .041) * .025;
  const arcStart = Math.PI * 1.055 + Math.sin(time * .145) * .145 + Math.cos(time * .061) * .04;
  const arcSpan = Math.PI * (mobile ? .9 : .94);
  const depthPhase = time * .18;

  context.save();
  context.fillStyle = 'rgba(3, 2, 10, .22)';
  context.fillRect(0, 0, width, height);
  context.restore();

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / Math.max(1, barCount - 1);
    const theta = arcStart + progress * arcSpan;
    const point = projectOrbitPoint(theta, centerX, centerY, radiusX, radiusY, roll);
    const spectral = spectrum[index];
    const previous = spectrum[Math.max(0, index - 1)];
    const next = spectrum[Math.min(barCount - 1, index + 1)];
    const localMean = (previous + spectral + next) / 3;
    const localPeak = Math.max(0, spectral - (previous + next) * .5);

    const depth = .5 + .5 * Math.cos(theta + depthPhase);
    const perspective = .58 + depth * .62;
    const lowBias = Math.pow(1 - progress, 1.55);
    const midBias = 1 - Math.min(1, Math.abs(progress - .48) * 2.15);
    const highBias = Math.pow(progress, 1.25);
    const presence = smoothstep(.015, .16, spectral);

    const audioHeight = height * (
      Math.pow(spectral, .82) * .295
      + localPeak * .34
      + bass * lowBias * .045
      + mid * midBias * .025
      + high * highBias * .012
      + kick * lowBias * .04
    );
    const minimumHeight = 1.3 + presence * (mobile ? 1.4 : 2.1);
    const barHeight = clamp(
      minimumHeight + audioHeight * perspective,
      1.3,
      height * (mobile ? .48 : .56)
    );

    const startOffset = mobile ? 1.2 : 1.8;
    const startX = point.x + point.normalX * startOffset;
    const startY = point.y + point.normalY * startOffset;
    const endX = startX + point.normalX * barHeight;
    const endY = startY + point.normalY * barHeight;

    // The source has long dim light spilling inward toward the hidden circle centre.
    const reflectionHeight = (mobile ? 14 : 22)
      + barHeight * (.34 + depth * .28)
      + energy * (mobile ? 8 : 14);
    const trailX = point.x - point.normalX * reflectionHeight;
    const trailY = point.y - point.normalY * reflectionHeight;

    const bucket = Math.max(0, Math.min(4, Math.floor(depth * 5)));
    buckets[bucket].push({
      bar: { x1: startX, y1: startY, x2: endX, y2: endY },
      trail: { x1: point.x, y1: point.y, x2: trailX, y2: trailY },
      localMean
    });
  }

  const gradient = rainbowGradient(context, width, time);

  // Directional inward glow first, then two cheap batched neon passes and the crisp radial bars.
  drawBuckets(context, buckets, gradient, barWidth * 1.25, mobile ? .035 : .05, 'trail');
  drawBuckets(context, buckets, gradient, barWidth * 2.55, mobile ? .075 : .105, 'bar');
  drawBuckets(context, buckets, gradient, barWidth * 1.55, mobile ? .13 : .17, 'bar');
  drawBuckets(context, buckets, gradient, barWidth, .94, 'bar');
}
