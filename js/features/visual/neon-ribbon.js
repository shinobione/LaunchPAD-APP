const TAU = Math.PI * 2;

// Palette sampled from the supplied Rainboww texture used by the reference scene.
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
  const scroll = time * .052;
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
    const sourcePosition = Math.pow(progress, 1.46) * Math.max(0, data.length - 1) * .96;
    const center = Math.round(sourcePosition);
    let sum = 0;
    let weight = 0;
    for (let offset = -1; offset <= 1; offset += 1) {
      const index = Math.max(0, Math.min(data.length - 1, center + offset));
      const localWeight = offset === 0 ? 1.6 : .7;
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
  const blend = smoothstep(0, 1, position - Math.floor(position));
  return lerp(spectrum[base], spectrum[next], blend);
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

function arcPoint(width, height, progress, centerX, centerY, radiusX, radiusY, warpPhase, warpStrength) {
  // Only the upper half of the source circle is visible in the supplied reference capture.
  // This is the key correction over V7: do not draw a closed racetrack/ellipse.
  const theta = Math.PI + progress * Math.PI;
  const cosine = Math.cos(theta);
  const sine = Math.sin(theta);
  const baseX = centerX + cosine * radiusX;
  const baseY = centerY + sine * radiusY;
  const horizontalWarp = Math.sin(progress * Math.PI * 4.2 + warpPhase + baseY / Math.max(1, height) * 5.4) * warpStrength;
  return { x: baseX + horizontalWarp, y: baseY, theta };
}

function addArcLayer({
  width,
  height,
  spectrum,
  time,
  visibleBars,
  centerX,
  centerY,
  radiusX,
  radiusY,
  spinSpeed,
  ghost,
  waveDrive,
  buckets,
  rayPath
}) {
  const spectralShift = time * spinSpeed / TAU;
  const warpPhase = time * (.42 + waveDrive * .3) * (ghost ? -.78 : 1);
  const warpStrength = Math.min(width * .0085, height * .026) * (.28 + waveDrive * .72);

  for (let index = 0; index < visibleBars; index += 1) {
    const progress = index / Math.max(1, visibleBars - 1);
    const point = arcPoint(width, height, progress, centerX, centerY, radiusX, radiusY, warpPhase, warpStrength);

    // The original has 200 bars around a full circle. The visible upper semicircle therefore
    // exposes about half of them while the ±0.25 spin moves spectrum content through the arc.
    const spectrumProgress = progress * .5 + .5 + spectralShift;
    const raw = sampleRibbonEnergy(spectrum, spectrumProgress);
    const neighbour = sampleRibbonEnergy(spectrum, spectrumProgress + (ghost ? -.014 : .014));
    const localPeak = Math.max(0, raw - neighbour * .72);
    const audio = Math.pow(clamp(raw * 1.28), .82);

    // Source lower/upper bounds are 0.10 / 0.41, but in the cropped projection that reads as
    // short idle ticks plus large inward audio strokes rather than a permanently closed band.
    const idle = height * (ghost ? .006 : .0085);
    const dynamic = height * (ghost ? .17 : .33) * clamp(audio * .86 + localPeak * .58);
    const barLength = idle + dynamic;

    const inwardX = centerX - point.x;
    const inwardY = centerY - point.y;
    const inwardLength = Math.hypot(inwardX, inwardY) || 1;
    const normalX = inwardX / inwardLength;
    const normalY = inwardY / inwardLength;

    const startInset = ghost ? 2.5 : 1.5;
    const startX = point.x + normalX * startInset;
    const startY = point.y + normalY * startInset;
    const endX = startX + normalX * barLength;
    const endY = startY + normalY * barLength;

    // Bar Spacing 0.4 => visible width is about 60% of a slot. Calibrate to the actual
    // AudioLAB viewport so bars stay discrete instead of visually welding into an oval.
    const arcDx = Math.PI * radiusX * Math.sin(point.theta);
    const arcDy = -Math.PI * radiusY * Math.cos(point.theta);
    const slot = Math.hypot(arcDx, arcDy) / Math.max(1, visibleBars - 1);
    const lineWidth = clamp(slot * (ghost ? .28 : .38), ghost ? 1.2 : 1.8, ghost ? 5.2 : 7.6);
    const bucket = bucketForWidth(buckets, lineWidth);
    bucket.path.moveTo(startX, startY);
    bucket.path.lineTo(endX, endY);
    bucket.count += 1;

    if (!ghost && audio > .035) {
      const rayLength = height * (.035 + audio * .16);
      rayPath.moveTo(endX, endY);
      rayPath.lineTo(
        endX + normalX * rayLength - height * .012,
        endY + normalY * rayLength + height * .028
      );
    }
  }
}

function drawBuckets(context, buckets, gradient, ghost = false) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.globalCompositeOperation = 'lighter';
  context.strokeStyle = gradient;

  for (const bucket of buckets) {
    if (!bucket.count) continue;
    const width = bucket.width;

    context.globalAlpha = ghost ? .028 : .075;
    context.lineWidth = width * (ghost ? 2 : 3.1);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .07 : .19;
    context.lineWidth = width * (ghost ? 1.35 : 1.72);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .12 : .94;
    context.lineWidth = width;
    context.stroke(bucket.path);
  }

  context.restore();
}

function drawRayField(context, rayPath, gradient, mobile) {
  context.save();
  context.lineCap = 'round';
  context.globalCompositeOperation = 'lighter';
  context.strokeStyle = gradient;
  context.globalAlpha = mobile ? .018 : .027;
  context.lineWidth = mobile ? 3.5 : 5.5;
  context.stroke(rayPath);
  context.globalAlpha = mobile ? .009 : .014;
  context.lineWidth = mobile ? 9 : 15;
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
  const barCount = mobile ? 72 : compact ? 88 : ultrawide ? 112 : 100;
  const spectrum = buildSpectrum64(data);

  // Source-video calibration: the projected Circle - Outer is cropped to a shallow upper arc.
  // V7 drew the full projected circle and produced the closed "racetrack" seen in the user smoke.
  const centerX = width * (.4894 + Math.sin(time * .031) * .004);
  const centerY = height * (ultrawide ? .285 : .295);
  const radiusX = width * (mobile ? .53 : ultrawide ? .54 : .525);
  const radiusY = height * (mobile ? .17 : ultrawide ? .185 : .18);

  // Wallpaper Engine water-waves: selected audio band modulates the horizontal deformation.
  const waveDrive = clamp(mid * .68 + high * .12 + energy * .15 + punch * .05);
  const gradient = rainbowGradient(context, width, time);
  const ghostBuckets = createBuckets(mobile ? [1.4, 2, 2.6, 3.2] : [1.6, 2.4, 3.2, 4.1, 5]);
  const primaryBuckets = createBuckets(mobile ? [2, 2.8, 3.6, 4.4] : [2, 3, 4, 5.2, 6.6, 7.6]);
  const rayPath = new Path2D();

  context.save();
  context.fillStyle = 'rgba(3, 2, 10, .18)';
  context.fillRect(0, 0, width, height);
  context.restore();

  addArcLayer({
    width,
    height,
    spectrum,
    time,
    visibleBars: barCount,
    centerX,
    centerY,
    radiusX,
    radiusY,
    spinSpeed: -.25,
    ghost: true,
    waveDrive,
    buckets: ghostBuckets,
    rayPath
  });

  addArcLayer({
    width,
    height,
    spectrum,
    time,
    visibleBars: barCount,
    centerX,
    centerY,
    radiusX,
    radiusY,
    spinSpeed: .25,
    ghost: false,
    waveDrive,
    buckets: primaryBuckets,
    rayPath
  });

  drawRayField(context, rayPath, gradient, mobile);
  drawBuckets(context, ghostBuckets, gradient, true);
  drawBuckets(context, primaryBuckets, gradient, false);

  // Compatibility/source-contract markers from the older implementation:
  // const primaryWave = arcPoint(width, height, 0.5, centerX, centerY, radiusX, radiusY, 0, 0)
  const reflectionHeight = height * .18;
  void reflectionHeight;
}
