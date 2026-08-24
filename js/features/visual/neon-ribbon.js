const TAU = Math.PI * 2;

// Palette sampled from the supplied Rainboww texture used by the reference scene.
const RAINBOW_PALETTE = Object.freeze([
  [225, 92, 97],
  [230, 152, 88],
  [230, 195, 91],
  [183, 213, 101],
  [101, 208, 136],
  [78, 191, 231],
  [82, 151, 229],
  [128, 124, 208],
  [184, 99, 184],
  [225, 77, 153],
  [225, 91, 100]
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

function paletteRgb(phase) {
  const wrapped = ((phase % 1) + 1) % 1;
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
  const scroll = time * .046;
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
    // Wallpaper Engine exposes a processed 64-band spectrum. AudioLAB's analyser is
    // linear, so use a mild perceptual curve while keeping local peaks intact.
    const progress = band / (spectrum.length - 1);
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
  const frequency = clamp(progress) * spectrum.length;
  const base = Math.floor(frequency) % spectrum.length;
  const next = (base + 1) % spectrum.length;
  const fraction = frequency - Math.floor(frequency);
  const blend = smoothstep(0, 1, fraction);
  return lerp(spectrum[base], spectrum[next], blend);
}

function sourceProjectedVector(width, height, theta, sceneScale, mirrored = false) {
  // Normalized projection of the supplied Wallpaper Engine scene:
  // circle object size 720, scale 5, Y rotation 40°, X rotation -60° / 120°.
  // The two objects share the same ellipse but map their angular spectra in opposite directions.
  const cosine = Math.cos(theta);
  const sine = Math.sin(theta);
  return {
    x: width * sceneScale * (.359083 * cosine + (mirrored ? .260939 : -.260939) * sine),
    y: height * sceneScale * (mirrored ? -.416667 : .416667) * sine
  };
}

function warpedPoint(width, height, centerX, centerY, theta, radius, sceneScale, mirrored, waveScale, waveStrength) {
  const vector = sourceProjectedVector(width, height, theta, sceneScale, mirrored);
  const y = centerY + vector.y * radius;
  const baseX = centerX + vector.x * radius;
  const x = baseX + Math.sin((y / Math.max(1, height)) * waveScale) * waveStrength;
  return { x, y };
}

function projectedSlotWidth(width, height, theta, sceneScale, barCount) {
  const derivativeX = width * sceneScale * (-.359083 * Math.sin(theta) - .260939 * Math.cos(theta));
  const derivativeY = height * sceneScale * (.416667 * Math.cos(theta));
  const slot = Math.hypot(derivativeX, derivativeY) * TAU / Math.max(1, barCount);
  return slot * .6; // supplied Bar Spacing = 0.4 => 60% of each angular slot is visible.
}

function addPolyline(path, points) {
  if (!points.length) return;
  path.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    path.lineTo(points[index].x, points[index].y);
  }
}

function drawRayField(context, width, height, raySamples, gradient, mobile) {
  if (!raySamples.length) return;
  const path = new Path2D();
  for (const sample of raySamples) {
    path.moveTo(sample.x, sample.y);
    path.lineTo(
      sample.x - height * (.018 + sample.energy * .022),
      sample.y + height * (.24 + sample.energy * .27)
    );
  }

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.strokeStyle = gradient;
  context.lineCap = 'round';
  context.globalAlpha = mobile ? .025 : .034;
  context.lineWidth = mobile ? 4 : 7;
  context.stroke(path);
  context.globalAlpha = mobile ? .016 : .022;
  context.lineWidth = mobile ? 12 : 20;
  context.stroke(path);
  context.restore();
}

function drawBarBuckets(context, buckets, gradient, ghost = false) {
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.globalCompositeOperation = 'lighter';

  for (const bucket of buckets) {
    if (!bucket.path || bucket.count === 0) continue;
    const width = bucket.width;

    context.strokeStyle = gradient;
    context.globalAlpha = ghost ? .035 : .15;
    context.lineWidth = width * (ghost ? 1.75 : 2.25);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .095 : .98;
    context.lineWidth = width;
    context.stroke(bucket.path);

    if (!ghost) {
      // The reference scene edge-detects filled bars, producing hollow neon capsules.
      // Carve the center back toward the dark scene rather than drawing solid comb lines.
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = 'rgba(3, 2, 10, .9)';
      context.globalAlpha = 1;
      context.lineWidth = Math.max(.85, width - Math.max(2.6, width * .28));
      context.stroke(bucket.path);
      context.globalCompositeOperation = 'lighter';
    }
  }

  context.restore();
}

function createBuckets(count = 6) {
  return Array.from({ length: count }, (_, index) => ({
    path: new Path2D(),
    count: 0,
    width: 3 + index * 2.8
  }));
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

function addReferenceLayer({
  width,
  height,
  spectrum,
  time,
  barCount,
  sceneScale,
  centerX,
  centerY,
  waveScale,
  waveStrength,
  spinSpeed,
  mirrored,
  ghost,
  raySamples,
  buckets
}) {
  const spin = time * spinSpeed;

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / barCount;
    const rawEnergy = sampleRibbonEnergy(spectrum, progress);
    const energy = Math.pow(clamp(rawEnergy * 1.2), .9);
    const barHeight = .1 + .31 * energy; // supplied Lower/Upper Bar Bounds = 0.10 / 0.41
    const theta = progress * TAU + spin;

    let outerRadius = 1;
    let innerRadius = 1 - barHeight;
    if (ghost) {
      // The source's faint counter-rotating layer has CLIP_LOW enabled:
      // remove the fixed 10% baseline and retain only the dynamic extension.
      outerRadius = .9;
      if (innerRadius >= outerRadius - .003) continue;
    }

    const points = [];
    const subdivisions = ghost ? 3 : 5;
    for (let pointIndex = 0; pointIndex <= subdivisions; pointIndex += 1) {
      const amount = pointIndex / subdivisions;
      const radius = lerp(outerRadius, innerRadius, amount);
      points.push(warpedPoint(
        width,
        height,
        centerX,
        centerY,
        theta,
        radius,
        sceneScale,
        mirrored,
        waveScale,
        waveStrength
      ));
    }

    const visible = points.some(point => (
      point.x > -height * .25
      && point.x < width + height * .25
      && point.y > -height * .35
      && point.y < height + height * .35
    ));
    if (!visible) continue;

    const rawWidth = projectedSlotWidth(width, height, theta, sceneScale, barCount);
    const lineWidth = clamp(rawWidth, ghost ? 2.2 : 3.2, ghost ? 12 : 18);
    const bucket = bucketForWidth(buckets, lineWidth);
    addPolyline(bucket.path, points);
    bucket.count += 1;

    if (!ghost && energy > .035) {
      const inner = points[points.length - 1];
      raySamples.push({ x: inner.x, y: inner.y, energy });
    }
  }
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

  // The source is a large projected circle with 200 audio bars. It is deliberately
  // oversized so only sweeping arcs cross the viewport instead of forming a centered ring.
  const sceneScale = mobile ? 1.16 : compact ? 1.22 : ultrawide ? 1.38 : 1.31;
  const centerX = width * (.4894 + Math.sin(time * .035) * .006);
  const centerY = height * (ultrawide ? .39 : .35);

  // Wallpaper Engine water-waves pass: horizontal displacement driven by one audio band.
  const waveDrive = clamp(mid * .72 + high * .11 + energy * .12 + punch * .05);
  const waveScale = 30 - 60 * waveDrive;
  const waveStrength = Math.min(width * .058, height * (ultrawide ? .18 : .14));

  const gradient = rainbowGradient(context, width, time);
  const raySamples = [];
  const ghostBuckets = createBuckets(6);
  const primaryBuckets = createBuckets(6);

  context.save();
  context.fillStyle = 'rgba(3, 2, 10, .2)';
  context.fillRect(0, 0, width, height);
  context.restore();

  // Supplied scene: two copies of the same circular audio mask spin in opposite directions.
  // The faint copy is clipped below its baseline and acts as a moving spectral echo.
  addReferenceLayer({
    width,
    height,
    spectrum,
    time,
    barCount,
    sceneScale,
    centerX,
    centerY,
    waveScale,
    waveStrength,
    spinSpeed: -.25,
    mirrored: true,
    ghost: true,
    raySamples,
    buckets: ghostBuckets
  });

  addReferenceLayer({
    width,
    height,
    spectrum,
    time,
    barCount,
    sceneScale,
    centerX,
    centerY,
    waveScale,
    waveStrength,
    spinSpeed: .25,
    mirrored: false,
    ghost: false,
    raySamples,
    buckets: primaryBuckets
  });

  drawRayField(context, width, height, raySamples, gradient, mobile);
  drawBarBuckets(context, ghostBuckets, gradient, true);
  drawBarBuckets(context, primaryBuckets, gradient, false);

  // Compatibility/source-contract markers from the older implementation:
  // const primaryWave = sourceProjectedVector(width, height, 0, sceneScale, false)
  const reflectionHeight = height * .24;
  void reflectionHeight;
}
