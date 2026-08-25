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
// Keep this clean carrier stable: audio dynamics belong in the bars and global breathing,
// not in local geometry deformations.
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
  // WebAudio byte FFT is much "fuller" than Wallpaper Engine's spectrum. Rainbow therefore
  // needs an adaptive gate/range before the original 0.10 -> 0.41 bar shader mapping.
  // Percentiles keep the quiet majority near the tiny source ticks while real spectral peaks
  // still reach the tall bars seen in the reference video.
  const floorTarget = clamp(percentile64(rawSpectrum, .22) * .92, .025, .42);
  const highTarget = percentile64(rawSpectrum, .91);
  const ceilingTarget = clamp(Math.max(highTarget * 1.08, floorTarget + .18), .24, .96);

  if (!state.initialized) {
    state.audioFloor = floorTarget;
    state.audioCeiling = ceilingTarget;
  } else {
    const floorAlpha = floorTarget > state.audioFloor ? .035 : .075;
    const ceilingAlpha = ceilingTarget > state.audioCeiling ? .16 : .045;
    state.audioFloor += (floorTarget - state.audioFloor) * frameBlend(floorAlpha, frameFactor);
    state.audioCeiling += (ceilingTarget - state.audioCeiling) * frameBlend(ceilingAlpha, frameFactor);
  }

  const span = Math.max(.16, state.audioCeiling - state.audioFloor);
  for (let index = 0; index < rawSpectrum.length; index += 1) {
    const raw = rawSpectrum[index];
    const relative = clamp((raw - state.audioFloor) / span);
    const absolute = smoothstep(.08, .76, raw);
    const shaped = Math.pow(clamp(relative * .88 + absolute * .12), 1.34);
    state.normalized[index] = shaped < .018 ? 0 : shaped;
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

    // Responsive bars, but no frame-to-frame buzz.
    const alpha = target > state.spectrum[index] ? .52 : .14;
    state.spectrum[index] += (target - state.spectrum[index]) * frameBlend(alpha, frameFactor);
  }

  // Much lighter spatial smoothing than Build 111: preserve the deep valleys and isolated peaks
  // that make Rainbow read as individual bars instead of a permanently filled ribbon.
  for (let index = 0; index < state.spectrum.length; index += 1) {
    const length = state.spectrum.length;
    state.spatial[index] =
      state.spectrum[(index - 2 + length) % length] * .025 +
      state.spectrum[(index - 1 + length) % length] * .10 +
      state.spectrum[index] * .75 +
      state.spectrum[(index + 1) % length] * .10 +
      state.spectrum[(index + 2) % length] * .025;
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
  const maskCut = 1 - SOURCE_MASK_RADIUS;
  const sourceIdleBand = Math.max(0, SOURCE_BAR_LOWER - maskCut);
  const sourceDynamicBand = SOURCE_BAR_UPPER - SOURCE_BAR_LOWER;

  for (let index = 0; index < barCount; index += 1) {
    const progress = index * step;
    const previousOuter = samples[Math.max(0, index - 1)];
    const outer = samples[index];
    const nextOuter = samples[Math.min(barCount - 1, index + 1)];
    const slot = Math.max(1, Math.hypot(nextOuter.x - outer.x, nextOuter.y - outer.y));
    const perspectiveScale = clamp(slot / Math.max(1, averageSlot), .38, 2.18);

    const spectrumProgress = ghost
      ? 1 - progress - spinCycles
      : progress + spinCycles;
    const raw = sampleRibbonEnergy(spectrum, spectrumProgress);
    const before = sampleRibbonEnergy(spectrum, spectrumProgress - 1 / 64);
    const after = sampleRibbonEnergy(spectrum, spectrumProgress + 1 / 64);
    const localMean = (before + after) * .5;
    const localPeak = Math.max(0, raw - localMean);

    // Do not boost low FFT values. Build 111 used an exponent < 1, which kept almost every bar tall.
    // Rainbow needs the opposite: valleys collapse to the idle ring, peaks retain the drama.
    let audio = Math.pow(clamp(raw * 1.02 + localPeak * .32), 1.20);
    if (audio < .025) audio = 0;

    // Exact source shader concept:
    //   barHeight = mix(0.10, 0.41, audio)
    //   primary is INTERSECTed with the 334/360 alpha circle.
    // In our screen-space port the constant 0.10 annulus needs a smaller projection factor,
    // otherwise the idle ribbon looks permanently filled. Dynamic extension stays full strength.
    const idleProjection = ghost ? 0 : lerp(.38, .62, clamp((perspectiveScale - .38) / 1.8));
    const dynamicBand = sourceDynamicBand * audio;
    const visibleBand = ghost
      ? dynamicBand * .82
      : sourceIdleBand * idleProjection + dynamicBand;

    const transientLift = 1 + state.punch * (.08 + audio * .24) + state.carrier * .045;
    const sourceLengthScale = ghost ? .62 : .96;
    const barLength = Math.min(
      height * (ghost ? .36 : .67),
      height * visibleBand * perspectiveScale * sourceLengthScale * transientLift
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
    const lineWidth = clamp(
      slot * (1 - SOURCE_BAR_SPACING) * (ghost ? .30 : .44),
      ghost ? .8 : 1.25,
      ghost ? 6.8 : 12.8
    );
    const bucket = bucketForWidth(buckets, lineWidth);
    bucket.path.moveTo(outer.x, outer.y);
    bucket.path.lineTo(innerX, innerY);
    bucket.count += 1;

    if (!ghost && audio > .035) {
      const reflectionHeight = Math.min(
        height * .78,
        height * (.035 + audio * .39) * (.68 + perspectiveScale * .40) * (1 + state.punch * .22)
      );
      const rayX = outer.x - dirX * reflectionHeight * .11;
      const rayY = outer.y - dirY * reflectionHeight;
      rayPath.moveTo(outer.x, outer.y + Math.max(1.4, lineWidth * .32));
      rayPath.lineTo(rayX, rayY);
    }
  }
}

function drawCarrier(context, path, gradient, state, mobile) {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = (mobile ? .012 : .018) + state.carrier * .030;
  context.lineWidth = (mobile ? .7 : .9) + state.carrier * .85;
  context.stroke(path);
  context.globalAlpha *= .26;
  context.lineWidth *= 3;
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

    context.globalAlpha = ghost ? .009 : .060;
    context.lineWidth = width * (ghost ? 2 : 2.5);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .036 : .235;
    context.lineWidth = width * (ghost ? 1.26 : 1.48);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .068 : .98;
    context.lineWidth = width;
    context.stroke(bucket.path);

    if (!ghost && width >= 2.3) {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = 'rgba(3, 2, 10, .76)';
      context.globalAlpha = 1;
      context.lineWidth = Math.max(.8, width * .45);
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

function drawSourceGodRays(context, rayPath, gradient, mobile, glowDrive, punchDrive) {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  const drive = .70 + glowDrive * .75 + punchDrive * .48;
  context.globalAlpha = (mobile ? .012 : .027) * drive;
  context.lineWidth = mobile ? 3 : 5.8;
  context.stroke(rayPath);
  context.globalAlpha = (mobile ? .0055 : .013) * drive;
  context.lineWidth = mobile ? 9 : 18;
  context.stroke(rayPath);
  context.globalAlpha = (mobile ? .0022 : .0055) * drive;
  context.lineWidth = mobile ? 20 : 34;
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
  state.punch += (punchTarget - state.punch) * frameBlend(punchTarget > state.punch ? .44 : .11, frameFactor);

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
  const ghostBuckets = createBuckets(mobile ? [1, 1.6, 2.3, 3.2, 4.5] : [1.1, 1.8, 2.7, 3.8, 5.2, 6.8]);
  const primaryBuckets = createBuckets(mobile ? [1.5, 2.4, 3.5, 4.8, 6.5] : [1.6, 2.6, 3.8, 5.2, 7, 9.1, 11, 12.8]);
  const rayPath = new Path2D();

  // Slight persistence for continuity; bar contrast now comes from the audio range rather than after-image.
  context.save();
  context.fillStyle = `rgba(3, 2, 10, ${mobile ? .37 : .355})`;
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
}
