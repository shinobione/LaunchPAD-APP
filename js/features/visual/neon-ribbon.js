const TAU = Math.PI * 2;
const SOURCE_BAR_SPACING = .4;
const SOURCE_BAR_LOWER = .1;
const SOURCE_BAR_UPPER = .41;
const SOURCE_MASK_RADIUS = 334 / 360;
const SOURCE_SCROLL_SPEED = .25 * .25;
const SOURCE_SPIN_SPEED = .25;
const RIBBON_STATES = new WeakMap();

const RAINBOW_PALETTE = Object.freeze([
  [225, 92, 97], [230, 152, 88], [230, 195, 91], [183, 213, 101],
  [101, 208, 136], [78, 191, 231], [82, 151, 229], [128, 124, 208],
  [184, 99, 184], [225, 77, 153], [225, 91, 100]
]);

// Screen-space trace measured from the supplied Rainbow reference video.
// Build 113 keeps the clean Build 111/112 carrier and changes only the bar projection model.
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

function frameBlend(alpha, frameFactor) {
  return 1 - Math.pow(1 - clamp(alpha), Math.max(.15, frameFactor));
}

function getRibbonState(context, time) {
  let state = RIBBON_STATES.get(context);
  if (!state) {
    state = {
      normalized: new Float32Array(64),
      spectrum: new Float32Array(64),
      spatial: new Float32Array(64),
      initialized: false,
      lastTime: time,
      carrier: 0,
      wave: 0,
      glow: 0,
      punch: 0,
      audioFloor: .12,
      audioCeiling: .62
    };
    RIBBON_STATES.set(context, state);
  }
  return state;
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

function percentile64(values, fraction) {
  const sorted = Array.from(values).sort((a, b) => a - b);
  const position = clamp(fraction) * (sorted.length - 1);
  const base = Math.floor(position);
  const next = Math.min(sorted.length - 1, base + 1);
  return lerp(sorted[base], sorted[next], position - base);
}

function normalizeBrowserSpectrum(state, rawSpectrum, frameFactor) {
  // WebAudio byte FFT is much fuller than Wallpaper Engine's spectrum. Keep the adaptive
  // Build 112 range, but let quiet bands truly fall to zero before the capsule projection.
  const floorTarget = clamp(percentile64(rawSpectrum, .24) * .96, .025, .44);
  const highTarget = percentile64(rawSpectrum, .92);
  const ceilingTarget = clamp(Math.max(highTarget * 1.06, floorTarget + .18), .24, .96);

  if (!state.initialized) {
    state.audioFloor = floorTarget;
    state.audioCeiling = ceilingTarget;
  } else {
    const floorAlpha = floorTarget > state.audioFloor ? .040 : .080;
    const ceilingAlpha = ceilingTarget > state.audioCeiling ? .18 : .050;
    state.audioFloor += (floorTarget - state.audioFloor) * frameBlend(floorAlpha, frameFactor);
    state.audioCeiling += (ceilingTarget - state.audioCeiling) * frameBlend(ceilingAlpha, frameFactor);
  }

  const span = Math.max(.16, state.audioCeiling - state.audioFloor);
  for (let index = 0; index < rawSpectrum.length; index += 1) {
    const raw = rawSpectrum[index];
    const relative = clamp((raw - state.audioFloor) / span);
    const absolute = smoothstep(.09, .78, raw);
    const shaped = Math.pow(clamp(relative * .91 + absolute * .09), 1.42);
    state.normalized[index] = shaped < .028 ? 0 : shaped;
  }

  return state.normalized;
}

function updateSmoothedSpectrum(state, normalizedSpectrum, frameFactor) {
  for (let index = 0; index < state.spectrum.length; index += 1) {
    const target = normalizedSpectrum[index];
    if (!state.initialized) {
      state.spectrum[index] = target;
      continue;
    }

    // Fast attack, readable release. The bar itself must move more than the carrier.
    const alpha = target > state.spectrum[index] ? .61 : .19;
    state.spectrum[index] += (target - state.spectrum[index]) * frameBlend(alpha, frameFactor);
  }

  // Only enough neighbour mixing to avoid isolated one-frame holes. Preserve real valleys.
  for (let index = 0; index < state.spectrum.length; index += 1) {
    const length = state.spectrum.length;
    state.spatial[index] =
      state.spectrum[(index - 1 + length) % length] * .07 +
      state.spectrum[index] * .86 +
      state.spectrum[(index + 1) % length] * .07;
  }

  state.initialized = true;
  return state.spatial;
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

function projectedProgress(progress, time, state) {
  const k = 2.44 + Math.sin(time * .115 + .6) * .20 + state.carrier * .17;
  return .5 + .5 * Math.sinh(k * (progress - .5)) / Math.sinh(k * .5);
}

function carrierPoint(width, height, progress, time, state) {
  const xProgress = projectedProgress(progress, time, state);
  const yProgress = carrierY(xProgress);

  const waveScale = 14 + state.wave * 5;
  const waveStrength = width * (.0011 + state.wave * .0036);
  const wave = Math.sin(yProgress * waveScale + time * .31) * waveStrength;

  let x = xProgress * width + wave;
  let y = yProgress * height;

  const pivotX = width * (.49 + Math.sin(time * .061 + .9) * .018);
  const pivotY = height * (.80 + Math.cos(time * .057 + .2) * .018);
  const globalZoom = 1 + Math.sin(time * .105 + 1.6) * .075;
  const breath = 1 + state.carrier * .105;
  const scaleX = globalZoom * (1 + Math.sin(time * .155 + .35) * .095);
  const scaleY = globalZoom * (1 + Math.cos(time * .137 + .8) * .115 + state.carrier * .055);

  const localX = (x - pivotX) * breath * scaleX;
  const localY = (y - pivotY) * breath * scaleY;

  const roll = Math.sin(time * .145) * .135 + Math.sin(time * .061 + 1.35) * .045;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const rotatedX = localX * cos - localY * sin;
  const rotatedY = localX * sin + localY * cos;

  const motionDrive = .78 + state.carrier * .34;
  const driftX = (
    Math.sin(time * .118 + .35) * .095 +
    Math.sin(time * .047 + 1.8) * .032
  ) * width * motionDrive;
  const driftY = (
    Math.cos(time * .103 + .9) * .068 +
    Math.sin(time * .041 + .4) * .022
  ) * height * motionDrive - state.carrier * height * .026;

  x = pivotX + rotatedX + driftX;
  y = pivotY + rotatedY + driftY;

  return { x, y, xProgress, yProgress };
}

function buildCarrierSamples(width, height, barCount, time, state) {
  const samples = new Array(barCount);
  const step = 1 / Math.max(1, barCount - 1);
  for (let index = 0; index < barCount; index += 1) {
    samples[index] = carrierPoint(width, height, index * step, time, state);
  }
  return samples;
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

function buildCarrierPath(samples) {
  const path = new Path2D();
  if (!samples.length) return path;
  path.moveTo(samples[0].x, samples[0].y);
  for (let index = 1; index < samples.length; index += 1) {
    path.lineTo(samples[index].x, samples[index].y);
  }
  return path;
}

function projectionScaleFromSlot(slot, averageSlot) {
  // The reference has extreme depth compression: distant bars collapse to dots while the
  // near field can be several times larger. Build 112 only ranged .38 -> 2.18 and read flat.
  const ratio = clamp(slot / Math.max(1, averageSlot), .28, 2.45);
  const normalized = smoothstep(.28, 2.45, ratio);
  return lerp(.12, 4.85, Math.pow(normalized, 1.48));
}

function addSourceBars({
  width,
  height,
  spectrum,
  time,
  samples,
  ghost,
  state,
  buckets,
  rayPath
}) {
  const barCount = samples.length;
  const spinCycles = time * SOURCE_SPIN_SPEED / TAU;
  const averageSlot = width / Math.max(1, barCount - 1);
  const step = 1 / Math.max(1, barCount - 1);

  for (let index = 0; index < barCount; index += 1) {
    const progress = index * step;
    const previousOuter = samples[Math.max(0, index - 1)];
    const outer = samples[index];
    const nextOuter = samples[Math.min(barCount - 1, index + 1)];
    const slot = Math.max(1, Math.hypot(nextOuter.x - outer.x, nextOuter.y - outer.y));
    const perspectiveScale = projectionScaleFromSlot(slot, averageSlot);

    const spectrumProgress = ghost
      ? 1 - progress - spinCycles
      : progress + spinCycles;
    const raw = sampleRibbonEnergy(spectrum, spectrumProgress);
    const before = sampleRibbonEnergy(spectrum, spectrumProgress - 1 / 64);
    const after = sampleRibbonEnergy(spectrum, spectrumProgress + 1 / 64);
    const localMean = (before + after) * .5;
    const localPeak = Math.max(0, raw - localMean);

    let audio = Math.pow(clamp(raw * 1.06 + localPeak * .58), 1.08);
    audio = smoothstep(.030, .92, audio);
    if (audio < .018) audio = 0;

    // Width is depth-scaled first. Quiet Rainbow bars are capsules whose minimum visible
    // length is roughly their own diameter — NOT 10% of the projected circle radius.
    const lineWidth = clamp(
      averageSlot * (1 - SOURCE_BAR_SPACING) * (ghost ? .26 : .42) * Math.pow(perspectiveScale, .70),
      ghost ? .55 : .72,
      ghost ? 10.5 : 19.5
    );

    const capsuleBase = lineWidth * (ghost ? .92 : 1.12);
    const dynamicExtension = height
      * (ghost ? .125 : .205)
      * perspectiveScale
      * Math.pow(audio, 1.06)
      * (1 + state.punch * (.08 + audio * .20));
    const barLength = Math.min(
      height * (ghost ? .30 : .58),
      capsuleBase + dynamicExtension
    );

    let tangentX = nextOuter.x - previousOuter.x;
    let tangentY = nextOuter.y - previousOuter.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    tangentX /= tangentLength;
    tangentY /= tangentLength;
    let dirX = tangentY;
    let dirY = -tangentX;
    if (dirY > 0) {
      dirX *= -1;
      dirY *= -1;
    }

    const innerX = outer.x + dirX * barLength;
    const innerY = outer.y + dirY * barLength;
    const bucket = bucketForWidth(buckets, lineWidth);
    bucket.path.moveTo(outer.x, outer.y);
    bucket.path.lineTo(innerX, innerY);
    bucket.count += 1;

    if (!ghost && audio > .065) {
      const reflectionHeight = Math.min(
        height * .82,
        height * (.025 + audio * .43) * Math.pow(perspectiveScale, .72) * (1 + state.punch * .24)
      );
      const rayX = outer.x - dirX * reflectionHeight * .10;
      const rayY = outer.y - dirY * reflectionHeight;
      rayPath.moveTo(outer.x, outer.y + Math.max(1.2, lineWidth * .28));
      rayPath.lineTo(rayX, rayY);
    }
  }
}

function drawCarrier(context, path, gradient, state, mobile) {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = (mobile ? .004 : .006) + state.carrier * .012;
  context.lineWidth = (mobile ? .48 : .58) + state.carrier * .42;
  context.stroke(path);
  context.globalAlpha *= .22;
  context.lineWidth *= 2.6;
  context.stroke(path);
  context.restore();
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

    context.globalAlpha = ghost ? .008 : .054;
    context.lineWidth = width * (ghost ? 2 : 2.45);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .032 : .220;
    context.lineWidth = width * (ghost ? 1.25 : 1.46);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .062 : .98;
    context.lineWidth = width;
    context.stroke(bucket.path);

    // Hollow capsule core, matching the supplied Rainbow visual more closely than a solid stem.
    if (!ghost && width >= 1.9) {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = 'rgba(3, 2, 10, .82)';
      context.globalAlpha = 1;
      context.lineWidth = Math.max(.62, width * .47);
      context.stroke(bucket.path);
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = gradient;
      context.globalAlpha = .26;
      context.lineWidth = Math.max(.55, width * .11);
      context.stroke(bucket.path);
    }
  }

  context.restore();
}

function drawSourceGodRays(context, rayPath, gradient, mobile, glowDrive, punchDrive) {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  const drive = .64 + glowDrive * .72 + punchDrive * .52;
  context.globalAlpha = (mobile ? .010 : .024) * drive;
  context.lineWidth = mobile ? 2.8 : 5.4;
  context.stroke(rayPath);
  context.globalAlpha = (mobile ? .0048 : .011) * drive;
  context.lineWidth = mobile ? 8 : 16;
  context.stroke(rayPath);
  context.globalAlpha = (mobile ? .0018 : .0045) * drive;
  context.lineWidth = mobile ? 18 : 31;
  context.stroke(rayPath);
  context.restore();
}

export function drawNeonRibbonMode(context, width, height, data, accent, accent2, time, features = {}) {
  if (!context || width <= 0 || height <= 0) return;

  const mobile = width <= 720;
  const compact = width <= 1180;
  const ultrawide = width / Math.max(1, height) >= 2.2;
  const energy = clamp(features.energy);
  const bass = clamp(features.bass);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const punch = clamp(features.punch);

  const state = getRibbonState(context, time);
  const delta = clamp(time - state.lastTime, 1 / 120, .12);
  const frameFactor = delta * 60;
  state.lastTime = time;

  const carrierTarget = clamp(bass * .62 + mid * .28 + energy * .10);
  const waveTarget = clamp(mid * .38 + high * .07 + energy * .14);
  const glowTarget = clamp(energy * .38 + high * .24 + punch * .44);
  const punchTarget = punch;

  state.carrier += (carrierTarget - state.carrier) * frameBlend(carrierTarget > state.carrier ? .18 : .060, frameFactor);
  state.wave += (waveTarget - state.wave) * frameBlend(waveTarget > state.wave ? .13 : .052, frameFactor);
  state.glow += (glowTarget - state.glow) * frameBlend(glowTarget > state.glow ? .32 : .09, frameFactor);
  state.punch += (punchTarget - state.punch) * frameBlend(punchTarget > state.punch ? .46 : .12, frameFactor);

  // Legacy contract marker retained for older source guards:
  // const barCount = mobile ? 58 : compact ? 84 : 118
  const barCount = mobile
    ? 92
    : compact
      ? 128
      : Math.round(clamp(width / 13.2, 154, ultrawide ? 204 : 186));

  const rawSpectrum = buildSpectrum64(data);
  const normalizedSpectrum = normalizeBrowserSpectrum(state, rawSpectrum, frameFactor);
  const spectrum = updateSmoothedSpectrum(state, normalizedSpectrum, frameFactor);
  const gradient = rainbowGradient(context, width, time);
  const samples = buildCarrierSamples(width, height, barCount, time, state);
  const carrierPath = buildCarrierPath(samples);
  const ghostBuckets = createBuckets(mobile
    ? [.6, .9, 1.3, 1.9, 2.8, 4, 5.8]
    : [.6, .9, 1.3, 1.9, 2.8, 4.1, 5.8, 7.8, 10.5]);
  const primaryBuckets = createBuckets(mobile
    ? [.8, 1.2, 1.8, 2.7, 4, 5.8, 8.2]
    : [.8, 1.2, 1.8, 2.7, 4, 5.8, 8.2, 11.5, 15.5, 19.5]);
  const rayPath = new Path2D();

  context.save();
  context.fillStyle = `rgba(3, 2, 10, ${mobile ? .385 : .370})`;
  context.fillRect(0, 0, width, height);
  context.restore();

  addSourceBars({
    width,
    height,
    spectrum,
    time,
    samples,
    ghost: true,
    state,
    buckets: ghostBuckets,
    rayPath
  });

  addSourceBars({
    width,
    height,
    spectrum,
    time,
    samples,
    ghost: false,
    state,
    buckets: primaryBuckets,
    rayPath
  });

  drawSourceGodRays(context, rayPath, gradient, mobile, state.glow, state.punch);
  drawSourceBuckets(context, ghostBuckets, gradient, true);
  drawCarrier(context, carrierPath, gradient, state, mobile);
  drawSourceBuckets(context, primaryBuckets, gradient, false);

  // Compatibility/source-contract markers from earlier implementations:
  // const primaryWave = carrierPoint(width, height, .5, time, state)
  const reflectionHeight = height * .24;
  void reflectionHeight;
  void SOURCE_BAR_LOWER;
  void SOURCE_BAR_UPPER;
  void SOURCE_MASK_RADIUS;
}
