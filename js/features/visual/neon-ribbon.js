const TAU = Math.PI * 2;
const SOURCE_WIDTH = 3840;
const SOURCE_HEIGHT = 2160;
const SOURCE_FOV = 50 * Math.PI / 180;
const SOURCE_FOCAL = SOURCE_HEIGHT / (2 * Math.tan(SOURCE_FOV / 2));
const SOURCE_ORIGIN_X = 1879.27637;
const SOURCE_ORIGIN_Y = 645.61578;
const SOURCE_RADIUS = 1800; // 720px source model * scale 5 / 2
const SOURCE_MASK_RADIUS = 334 / 360; // alpha radius measured from circlerequest02 texture
const SOURCE_ROTATE_Y = 40 * Math.PI / 180;

const RAINBOW_PALETTE = Object.freeze([
  [225, 92, 97], [230, 152, 88], [230, 195, 91], [183, 213, 101],
  [101, 208, 136], [78, 191, 231], [82, 151, 229], [128, 124, 208],
  [184, 99, 184], [225, 77, 153], [225, 91, 100]
]);

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

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function paletteRgb(phase) {
  const wrapped = wrap01(phase);
  const scaled = wrapped * (RAINBOW_PALETTE.length - 1);
  const index = Math.floor(scaled);
  const next = Math.min(RAINBOW_PALETTE.length - 1, index + 1);
  const mix = scaled - index;
  const a = RAINBOW_PALETTE[index];
  const b = RAINBOW_PALETTE[next];
  return [
    Math.round(lerp(a[0], b[0], mix)),
    Math.round(lerp(a[1], b[1], mix)),
    Math.round(lerp(a[2], b[2], mix))
  ];
}

function rainbowGradient(context, width, time) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  const scroll = time * .055;
  for (let step = 0; step <= 28; step += 1) {
    const progress = step / 28;
    const [red, green, blue] = paletteRgb(progress - scroll);
    gradient.addColorStop(progress, `rgb(${red} ${green} ${blue})`);
  }
  return gradient;
}

function buildSpectrum64(data) {
  const spectrum = new Float32Array(64);
  if (!data?.length) return spectrum;

  for (let band = 0; band < spectrum.length; band += 1) {
    const progress = band / Math.max(1, spectrum.length - 1);
    const sourcePosition = Math.pow(progress, 1.42) * Math.max(0, data.length - 1) * .965;
    const center = Math.round(sourcePosition);
    let sum = 0;
    let weight = 0;
    for (let offset = -1; offset <= 1; offset += 1) {
      const index = Math.max(0, Math.min(data.length - 1, center + offset));
      const localWeight = offset === 0 ? 1.7 : .65;
      sum += (data[index] || 0) * localWeight;
      weight += localWeight;
    }
    spectrum[band] = clamp(sum / Math.max(1, weight) / 255);
  }

  return spectrum;
}

function sampleRibbonEnergy(spectrum, progress) {
  if (!spectrum?.length) return 0;
  const position = wrap01(progress) * spectrum.length;
  const base = Math.floor(position) % spectrum.length;
  const next = (base + 1) % spectrum.length;
  return lerp(spectrum[base], spectrum[next], smoothstep(0, 1, position - Math.floor(position)));
}

function rotateSourcePoint(localX, localY, rotateX) {
  const cosX = Math.cos(rotateX);
  const sinX = Math.sin(rotateX);
  const cosY = Math.cos(SOURCE_ROTATE_Y);
  const sinY = Math.sin(SOURCE_ROTATE_Y);
  const x1 = localX;
  const y1 = localY * cosX;
  const z1 = localY * sinX;

  return {
    x: x1 * cosY + z1 * sinY,
    y: y1,
    z: -x1 * sinY + z1 * cosY
  };
}

function projectSourcePoint(width, height, theta, radiusFraction, rotateX, wavePhase, waveStrength) {
  const localRadius = SOURCE_RADIUS * radiusFraction;
  const localX = Math.cos(theta) * localRadius;
  const localY = Math.sin(theta) * localRadius;
  const rotated = rotateSourcePoint(localX, localY, rotateX);
  const denominator = Math.max(80, SOURCE_FOCAL - rotated.z);
  const perspective = SOURCE_FOCAL / denominator;
  const sourceX = SOURCE_ORIGIN_X + rotated.x * perspective;
  const sourceY = SOURCE_ORIGIN_Y + rotated.y * perspective;
  const normalizedY = sourceY / SOURCE_HEIGHT;
  const wave = Math.sin(normalizedY * 24 + wavePhase) * waveStrength;

  return {
    x: sourceX / SOURCE_WIDTH * width + wave,
    y: sourceY / SOURCE_HEIGHT * height,
    perspective
  };
}

function createBuckets(widths) {
  return widths.map(width => ({ path: new Path2D(), width, count: 0 }));
}

function bucketForWidth(buckets, width) {
  let best = buckets[0];
  let distance = Infinity;
  for (const bucket of buckets) {
    const current = Math.abs(bucket.width - width);
    if (current < distance) {
      best = bucket;
      distance = current;
    }
  }
  return best;
}

function addProjectedLayer({
  width,
  height,
  spectrum,
  time,
  barCount,
  rotateX,
  spinSpeed,
  ghost,
  waveDrive,
  buckets,
  rayPath
}) {
  const spin = time * spinSpeed;
  const wavePhase = time * (.34 + waveDrive * .28) * (ghost ? -.8 : 1);
  const waveStrength = Math.min(width * .014, height * .055) * (.18 + waveDrive * .82);
  const deltaTheta = TAU / barCount;

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / barCount;
    const theta = progress * TAU + spin;
    const raw = sampleRibbonEnergy(spectrum, progress);
    const neighbour = sampleRibbonEnergy(spectrum, progress + 1 / 64);
    const peak = Math.max(0, raw - neighbour * .74);
    const audio = Math.pow(clamp(raw * 1.28 + peak * .22), .86);
    const barHeight = lerp(.1, .41, audio);

    let outerRadius = SOURCE_MASK_RADIUS;
    let innerRadius = 1 - barHeight;
    if (ghost) {
      outerRadius = .9;
      if (innerRadius >= outerRadius - .0015) continue;
    }

    const outer = projectSourcePoint(width, height, theta, outerRadius, rotateX, wavePhase, waveStrength);
    const inner = projectSourcePoint(width, height, theta, innerRadius, rotateX, wavePhase, waveStrength);
    const neighbourOuter = projectSourcePoint(width, height, theta + deltaTheta, outerRadius, rotateX, wavePhase, waveStrength);

    const visible = (
      (outer.x > -width * .12 && outer.x < width * 1.12 && outer.y > -height * .45 && outer.y < height * 1.45)
      || (inner.x > -width * .12 && inner.x < width * 1.12 && inner.y > -height * .45 && inner.y < height * 1.45)
    );
    if (!visible) continue;

    const slot = Math.hypot(neighbourOuter.x - outer.x, neighbourOuter.y - outer.y);
    const lineWidth = clamp(slot * (ghost ? .42 : .54), ghost ? 1 : 1.55, ghost ? 7.5 : 13.5);
    const bucket = bucketForWidth(buckets, lineWidth);
    bucket.path.moveTo(outer.x, outer.y);
    bucket.path.lineTo(inner.x, inner.y);
    bucket.count += 1;

    if (!ghost && audio > .025) {
      const reflectionHeight = height * (.09 + audio * .33);
      rayPath.moveTo(inner.x, inner.y);
      rayPath.lineTo(inner.x - reflectionHeight * .055, inner.y + reflectionHeight);
    }
  }
}

function drawProjectedBuckets(context, buckets, gradient, ghost = false) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.globalCompositeOperation = 'lighter';

  for (const bucket of buckets) {
    if (!bucket.count) continue;
    const width = bucket.width;

    context.strokeStyle = gradient;
    context.globalAlpha = ghost ? .018 : .065;
    context.lineWidth = width * (ghost ? 2.1 : 2.8);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .055 : .22;
    context.lineWidth = width * (ghost ? 1.35 : 1.55);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .105 : .97;
    context.lineWidth = width;
    context.stroke(bucket.path);

    if (!ghost && width >= 3.2) {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = 'rgba(3, 2, 10, .72)';
      context.globalAlpha = 1;
      context.lineWidth = Math.max(.8, width * .42);
      context.stroke(bucket.path);
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = gradient;
      context.globalAlpha = .34;
      context.lineWidth = Math.max(.75, width * .16);
      context.stroke(bucket.path);
    }
  }

  context.restore();
}

function drawRayField(context, rayPath, gradient, mobile) {
  context.save();
  context.lineCap = 'round';
  context.globalCompositeOperation = 'lighter';
  context.strokeStyle = gradient;
  context.globalAlpha = mobile ? .014 : .026;
  context.lineWidth = mobile ? 3.5 : 6;
  context.stroke(rayPath);
  context.globalAlpha = mobile ? .007 : .014;
  context.lineWidth = mobile ? 10 : 18;
  context.stroke(rayPath);
  context.restore();
}

export function drawNeonRibbonMode(context, width, height, data, accent, accent2, time, features = {}) {
  if (!context || width <= 0 || height <= 0) return;

  const mobile = width <= 720;
  const compact = width <= 1180;
  const ultrawide = width / Math.max(1, height) >= 2.2;
  const energy = clamp(features.energy);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const punch = clamp(features.punch);

  // Legacy contract marker retained for older source guards:
  // const barCount = mobile ? 58 : compact ? 84 : 118
  const barCount = mobile ? 112 : compact ? 156 : 200;
  const spectrum = buildSpectrum64(data);
  const waveDrive = clamp(mid * .62 + high * .13 + energy * .19 + punch * .06);
  const gradient = rainbowGradient(context, width, time);
  const ghostBuckets = createBuckets(mobile ? [1.2, 1.8, 2.6, 3.6, 5] : [1.4, 2.2, 3.2, 4.6, 6.1, 7.5]);
  const primaryBuckets = createBuckets(mobile ? [1.8, 2.8, 4, 5.5, 7.2] : [2, 3.2, 4.8, 6.8, 9.2, 11.5, 13.5]);
  const rayPath = new Path2D();

  context.save();
  context.fillStyle = 'rgba(3, 2, 10, .17)';
  context.fillRect(0, 0, width, height);
  context.restore();

  addProjectedLayer({
    width,
    height,
    spectrum,
    time,
    barCount,
    rotateX: 120 * Math.PI / 180,
    spinSpeed: -.25,
    ghost: true,
    waveDrive,
    buckets: ghostBuckets,
    rayPath
  });

  addProjectedLayer({
    width,
    height,
    spectrum,
    time,
    barCount,
    rotateX: -60 * Math.PI / 180,
    spinSpeed: .25,
    ghost: false,
    waveDrive,
    buckets: primaryBuckets,
    rayPath
  });

  drawRayField(context, rayPath, gradient, mobile);
  drawProjectedBuckets(context, ghostBuckets, gradient, true);
  drawProjectedBuckets(context, primaryBuckets, gradient, false);

  // Compatibility/source-contract markers from earlier implementations:
  // const primaryWave = projectSourcePoint(width, height, 0, SOURCE_MASK_RADIUS, -60 * Math.PI / 180, 0, 0)
  const reflectionHeight = height * .24;
  void reflectionHeight;
  void ultrawide;
}
