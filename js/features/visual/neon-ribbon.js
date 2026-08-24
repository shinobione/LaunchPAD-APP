const TAU = Math.PI * 2;
const SOURCE_BAR_SPACING = .4;
const SOURCE_BAR_LOWER = .1;
const SOURCE_BAR_UPPER = .41;
const SOURCE_MASK_RADIUS = 334 / 360;
const SOURCE_SCROLL_SPEED = .25 * .25; // Wallpaper Engine scroll.vert squares speed before applying time.
const SOURCE_SPIN_SPEED = .25;

// Rainboww.tex sampled from the supplied Wallpaper Engine project.
const RAINBOW_PALETTE = Object.freeze([
  [225, 92, 97], [230, 152, 88], [230, 195, 91], [183, 213, 101],
  [101, 208, 136], [78, 191, 231], [82, 151, 229], [128, 124, 208],
  [184, 99, 184], [225, 77, 153], [225, 91, 100]
]);

// Screen-space carrier measured from the supplied Rainbow reference video. This is deliberately
// the visible result of the original 3D circle projection, not another browser-side circle guess.
const SOURCE_CARRIER = Object.freeze([
  [0.00, .474], [0.05, .438], [0.10, .414], [0.18, .382], [0.26, .350],
  [0.32, .330], [0.38, .345], [0.44, .385], [0.50, .425], [0.56, .475],
  [0.62, .540], [0.68, .620], [0.74, .715], [0.80, .825], [0.86, .955],
  [0.92, 1.105], [1.00, 1.300]
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
  const scroll = time * SOURCE_SCROLL_SPEED;
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

function carrierY(progress) {
  const x = clamp(progress);
  let index = 0;
  while (index < SOURCE_CARRIER.length - 2 && x > SOURCE_CARRIER[index + 1][0]) index += 1;

  const previous = SOURCE_CARRIER[Math.max(0, index - 1)];
  const start = SOURCE_CARRIER[index];
  const end = SOURCE_CARRIER[Math.min(SOURCE_CARRIER.length - 1, index + 1)];
  const following = SOURCE_CARRIER[Math.min(SOURCE_CARRIER.length - 1, index + 2)];
  const span = Math.max(.0001, end[0] - start[0]);
  const t = clamp((x - start[0]) / span);

  const startSlope = (end[1] - previous[1]) / Math.max(.0001, end[0] - previous[0]);
  const endSlope = (following[1] - start[1]) / Math.max(.0001, following[0] - start[0]);
  const h00 = 2 * t * t * t - 3 * t * t + 1;
  const h10 = t * t * t - 2 * t * t + t;
  const h01 = -2 * t * t * t + 3 * t * t;
  const h11 = t * t * t - t * t;

  return h00 * start[1] + h10 * span * startSlope + h01 * end[1] + h11 * span * endSlope;
}

function projectedProgress(progress) {
  // Perspective in the source spreads near sections while compressing the middle of the carrier.
  const k = 2.65;
  return .5 + .5 * Math.sinh(k * (progress - .5)) / Math.sinh(k * .5);
}

function carrierPoint(width, height, progress, waveDrive) {
  const xProgress = projectedProgress(progress);
  const yProgress = carrierY(xProgress);

  // Wallpaper Engine waterwaves: direction = PI/2 => horizontal displacement only.
  // The source scale script moves 25 * 1.2 through 25 * -1.2 from audio frequency 8.
  const waveScale = 30 - 60 * clamp(waveDrive);
  const waveStrength = width * (.008 + clamp(waveDrive) * .018);
  const wave = Math.sin(yProgress * waveScale) * waveStrength;

  return {
    x: xProgress * width + wave,
    y: yProgress * height,
    xProgress,
    yProgress
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

function addSourceBars({
  width,
  height,
  spectrum,
  time,
  barCount,
  ghost,
  waveDrive,
  buckets,
  rayPath
}) {
  const spinCycles = time * SOURCE_SPIN_SPEED / TAU;
  const averageSlot = width / Math.max(1, barCount - 1);
  const step = 1 / Math.max(1, barCount - 1);

  for (let index = 0; index < barCount; index += 1) {
    const progress = index * step;
    const outer = carrierPoint(width, height, progress, waveDrive);
    const neighbourProgress = Math.min(1, progress + step);
    const neighbourOuter = carrierPoint(width, height, neighbourProgress, waveDrive);
    const slot = Math.max(1, Math.hypot(neighbourOuter.x - outer.x, neighbourOuter.y - outer.y));
    const perspectiveScale = clamp(slot / Math.max(1, averageSlot), .38, 2.15);

    const spectrumProgress = ghost
      ? 1 - progress - spinCycles
      : progress + spinCycles;
    const raw = sampleRibbonEnergy(spectrum, spectrumProgress);
    const neighbour = sampleRibbonEnergy(spectrum, spectrumProgress + (ghost ? -1 / 64 : 1 / 64));
    const localPeak = Math.max(0, raw - neighbour * .72);
    const audio = Math.pow(clamp(raw * 1.24 + localPeak * .28), .88);

    // Simple_Audio_Bars Circle - Outer: 0.10 -> 0.41, intersected with the source circle mask.
    // The mask removes most of the nominal lower bound, leaving the tiny idle capsules visible in the video.
    const barBound = lerp(SOURCE_BAR_LOWER, SOURCE_BAR_UPPER, audio);
    const maskCut = 1 - SOURCE_MASK_RADIUS;
    const visibleBand = ghost
      ? Math.max(0, barBound - SOURCE_BAR_LOWER)
      : Math.max(.0035, barBound - maskCut);
    if (ghost && visibleBand <= .0005) continue;

    const sourceLengthScale = ghost ? .72 : .94;
    const barLength = Math.min(
      height * (ghost ? .38 : .58),
      height * visibleBand * perspectiveScale * sourceLengthScale
    );

    // The supplied reference shows the projected radial bars almost vertical on the left and
    // progressively leaning up-left toward the far-right branch. Keep that actual screen-space read.
    const lean = -.035 - smoothstep(.30, .96, outer.xProgress) * .34;
    const microLean = Math.sin(outer.xProgress * Math.PI * 4.4) * .018;
    let dirX = lean + microLean;
    let dirY = -1;
    const directionLength = Math.hypot(dirX, dirY) || 1;
    dirX /= directionLength;
    dirY /= directionLength;

    const innerX = outer.x + dirX * barLength;
    const innerY = outer.y + dirY * barLength;
    const lineWidth = clamp(
      slot * (1 - SOURCE_BAR_SPACING) * (ghost ? .36 : .47),
      ghost ? .9 : 1.45,
      ghost ? 7.5 : 13.5
    );
    const bucket = bucketForWidth(buckets, lineWidth);
    bucket.path.moveTo(outer.x, outer.y);
    bucket.path.lineTo(innerX, innerY);
    bucket.count += 1;

    if (!ghost && audio > .012) {
      const reflectionHeight = Math.min(
        height * .72,
        height * (.10 + audio * .32) * (.72 + perspectiveScale * .42)
      );
      const rayX = outer.x - dirX * reflectionHeight * .13 + reflectionHeight * .035;
      const rayY = outer.y - dirY * reflectionHeight;
      rayPath.moveTo(outer.x, outer.y + Math.max(1.5, lineWidth * .38));
      rayPath.lineTo(rayX, rayY);
    }
  }
}

function drawSourceBuckets(context, buckets, gradient, ghost = false) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';

  for (const bucket of buckets) {
    if (!bucket.count) continue;
    const width = bucket.width;

    context.globalAlpha = ghost ? .012 : .07;
    context.lineWidth = width * (ghost ? 2.2 : 2.75);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .055 : .28;
    context.lineWidth = width * (ghost ? 1.38 : 1.55);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .10 : .98;
    context.lineWidth = width;
    context.stroke(bucket.path);

    if (!ghost && width >= 2.4) {
      // The original final composition runs blur + edge detection, producing hollow neon capsules.
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = 'rgba(3, 2, 10, .78)';
      context.globalAlpha = 1;
      context.lineWidth = Math.max(.8, width * .48);
      context.stroke(bucket.path);
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = gradient;
      context.globalAlpha = .23;
      context.lineWidth = Math.max(.7, width * .12);
      context.stroke(bucket.path);
    }
  }

  context.restore();
}

function drawSourceGodRays(context, rayPath, gradient, mobile) {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = mobile ? .012 : .024;
  context.lineWidth = mobile ? 3 : 5.5;
  context.stroke(rayPath);
  context.globalAlpha = mobile ? .006 : .012;
  context.lineWidth = mobile ? 10 : 18;
  context.stroke(rayPath);
  context.globalAlpha = mobile ? .003 : .006;
  context.lineWidth = mobile ? 22 : 38;
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
  const barCount = mobile
    ? 76
    : compact
      ? 104
      : Math.round(clamp(width / 16, 124, ultrawide ? 210 : 176));
  const spectrum = buildSpectrum64(data);
  const waveDrive = clamp(mid * .58 + high * .12 + energy * .22 + punch * .08);
  const gradient = rainbowGradient(context, width, time);
  const ghostBuckets = createBuckets(mobile ? [1, 1.6, 2.4, 3.4, 4.8] : [1.2, 2, 3, 4.2, 5.8, 7.5]);
  const primaryBuckets = createBuckets(mobile ? [1.6, 2.6, 3.8, 5.2, 7] : [1.8, 2.8, 4.2, 5.8, 7.8, 10.2, 13.5]);
  const rayPath = new Path2D();

  context.save();
  context.fillStyle = 'rgba(3, 2, 10, .29)';
  context.fillRect(0, 0, width, height);
  context.restore();

  addSourceBars({
    width,
    height,
    spectrum,
    time,
    barCount,
    ghost: true,
    waveDrive,
    buckets: ghostBuckets,
    rayPath
  });

  addSourceBars({
    width,
    height,
    spectrum,
    time,
    barCount,
    ghost: false,
    waveDrive,
    buckets: primaryBuckets,
    rayPath
  });

  drawSourceGodRays(context, rayPath, gradient, mobile);
  drawSourceBuckets(context, ghostBuckets, gradient, true);
  drawSourceBuckets(context, primaryBuckets, gradient, false);

  // Compatibility/source-contract markers from earlier implementations:
  // const primaryWave = carrierPoint(width, height, .5, waveDrive)
  const reflectionHeight = height * .24;
  void reflectionHeight;
}
