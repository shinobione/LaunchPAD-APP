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

// Screen-space trace measured from the supplied Rainbow reference. The animation below treats
// this as a stable carrier, then applies slow source-like orbit/breath motion rather than vibrating it per-bin.
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
      spectrum: new Float32Array(64),
      spatial: new Float32Array(64),
      initialized: false,
      lastTime: time,
      carrier: 0,
      wave: 0,
      glow: 0,
      punch: 0
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

function updateSmoothedSpectrum(state, rawSpectrum, frameFactor) {
  for (let index = 0; index < state.spectrum.length; index += 1) {
    const target = rawSpectrum[index];
    if (!state.initialized) {
      state.spectrum[index] = target;
      continue;
    }
    const alpha = target > state.spectrum[index] ? .28 : .075;
    state.spectrum[index] += (target - state.spectrum[index]) * frameBlend(alpha, frameFactor);
  }

  for (let index = 0; index < state.spectrum.length; index += 1) {
    const length = state.spectrum.length;
    const value =
      state.spectrum[(index - 2 + length) % length] * .08 +
      state.spectrum[(index - 1 + length) % length] * .22 +
      state.spectrum[index] * .40 +
      state.spectrum[(index + 1) % length] * .22 +
      state.spectrum[(index + 2) % length] * .08;
    state.spatial[index] = value;
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

function projectedProgress(progress, time) {
  const focus = .5 + Math.sin(time * .115) * .075;
  const k = 2.45 + Math.sin(time * .071 + .8) * .18;
  const normalized = progress - focus;
  const leftSpan = Math.max(.05, focus);
  const rightSpan = Math.max(.05, 1 - focus);
  if (normalized < 0) {
    const local = normalized / leftSpan;
    return focus * (1 + Math.sinh(k * local) / Math.sinh(k));
  }
  const local = normalized / rightSpan;
  return focus + rightSpan * Math.sinh(k * local) / Math.sinh(k);
}

function carrierPoint(width, height, progress, time, state) {
  const xProgress = projectedProgress(progress, time);
  const yProgress = carrierY(xProgress);

  // Source water-wave exists, but it should read as a smooth surface wobble, not per-frame vibration.
  const waveScale = 17 + state.wave * 7;
  const waveStrength = width * (.0018 + state.wave * .0052);
  const wave = Math.sin(yProgress * waveScale + time * .42) * waveStrength;

  let x = xProgress * width + wave;
  let y = yProgress * height;

  // Macro carrier motion: slow orbit + audio-reactive breathing. The bass/mids move the carrier itself;
  // highs/punch are intentionally kept out of geometry so the ribbon stays readable.
  const pivotX = width * .50;
  const pivotY = height * .80;
  const breath = 1 + state.carrier * .055;
  const slowScaleX = 1 + Math.sin(time * .083 + .5) * .055;
  const slowScaleY = 1 + Math.cos(time * .097) * .07 + state.carrier * .035;
  let localX = (x - pivotX) * breath * slowScaleX;
  let localY = (y - pivotY) * breath * slowScaleY;

  const roll = Math.sin(time * .105) * .13 + Math.sin(time * .047 + 1.4) * .055;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const rotatedX = localX * cos - localY * sin;
  const rotatedY = localX * sin + localY * cos;
  const driftX = Math.sin(time * .087 + .35) * width * .055;
  const driftY = Math.cos(time * .073 + .9) * height * .042 - state.carrier * height * .018;

  x = pivotX + rotatedX + driftX;
  y = pivotY + rotatedY + driftY;

  return { x, y, xProgress, yProgress };
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
  state,
  buckets,
  rayPath
}) {
  const spinCycles = time * SOURCE_SPIN_SPEED / TAU;
  const averageSlot = width / Math.max(1, barCount - 1);
  const step = 1 / Math.max(1, barCount - 1);

  for (let index = 0; index < barCount; index += 1) {
    const progress = index * step;
    const previousProgress = Math.max(0, progress - step);
    const nextProgress = Math.min(1, progress + step);
    const previousOuter = carrierPoint(width, height, previousProgress, time, state);
    const outer = carrierPoint(width, height, progress, time, state);
    const nextOuter = carrierPoint(width, height, nextProgress, time, state);
    const slot = Math.max(1, Math.hypot(nextOuter.x - outer.x, nextOuter.y - outer.y));
    const perspectiveScale = clamp(slot / Math.max(1, averageSlot), .42, 2.05);

    const spectrumProgress = ghost
      ? 1 - progress - spinCycles
      : progress + spinCycles;
    const raw = sampleRibbonEnergy(spectrum, spectrumProgress);
    const neighbour = sampleRibbonEnergy(spectrum, spectrumProgress + (ghost ? -1 / 64 : 1 / 64));
    const localPeak = Math.max(0, raw - neighbour * .82);
    const audio = Math.pow(clamp(raw * 1.20 + localPeak * .10), .82);

    const barBound = lerp(SOURCE_BAR_LOWER, SOURCE_BAR_UPPER, audio);
    const maskCut = 1 - SOURCE_MASK_RADIUS;
    const idleFloor = ghost ? .0018 : lerp(.008, .013, clamp((perspectiveScale - .42) / 1.63));
    const visibleBand = ghost
      ? Math.max(idleFloor, (barBound - SOURCE_BAR_LOWER) * .82)
      : Math.max(idleFloor, barBound - maskCut);

    const sourceLengthScale = ghost ? .66 : .91;
    const barLength = Math.min(
      height * (ghost ? .32 : .54),
      height * visibleBand * perspectiveScale * sourceLengthScale
    );

    // Bars follow the carrier normal. This keeps the implicit circle readable while it moves.
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
      slot * (1 - SOURCE_BAR_SPACING) * (ghost ? .33 : .44),
      ghost ? .9 : 1.35,
      ghost ? 7 : 12.5
    );
    const bucket = bucketForWidth(buckets, lineWidth);
    bucket.path.moveTo(outer.x, outer.y);
    bucket.path.lineTo(innerX, innerY);
    bucket.count += 1;

    if (!ghost && audio > .018) {
      const reflectionHeight = Math.min(
        height * .62,
        height * (.08 + audio * .26) * (.74 + perspectiveScale * .32)
      );
      const rayX = outer.x - dirX * reflectionHeight * .10;
      const rayY = outer.y - dirY * reflectionHeight;
      rayPath.moveTo(outer.x, outer.y + Math.max(1.5, lineWidth * .34));
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

    context.globalAlpha = ghost ? .010 : .055;
    context.lineWidth = width * (ghost ? 2.0 : 2.5);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .042 : .22;
    context.lineWidth = width * (ghost ? 1.30 : 1.48);
    context.stroke(bucket.path);

    context.globalAlpha = ghost ? .082 : .96;
    context.lineWidth = width;
    context.stroke(bucket.path);

    if (!ghost && width >= 2.4) {
      context.globalCompositeOperation = 'source-over';
      context.strokeStyle = 'rgba(3, 2, 10, .76)';
      context.globalAlpha = 1;
      context.lineWidth = Math.max(.8, width * .45);
      context.stroke(bucket.path);
      context.globalCompositeOperation = 'lighter';
      context.strokeStyle = gradient;
      context.globalAlpha = .20;
      context.lineWidth = Math.max(.7, width * .12);
      context.stroke(bucket.path);
    }
  }

  context.restore();
}

function drawSourceGodRays(context, rayPath, gradient, mobile, glowDrive) {
  context.save();
  context.lineCap = 'round';
  context.strokeStyle = gradient;
  context.globalCompositeOperation = 'lighter';
  const drive = .7 + glowDrive * .55;
  context.globalAlpha = (mobile ? .010 : .019) * drive;
  context.lineWidth = mobile ? 3 : 5;
  context.stroke(rayPath);
  context.globalAlpha = (mobile ? .0045 : .009) * drive;
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
  const bass = clamp(features.bass);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const punch = clamp(features.punch);

  const state = getRibbonState(context, time);
  const delta = clamp(time - state.lastTime, 1 / 120, .12);
  const frameFactor = delta * 60;
  state.lastTime = time;

  const carrierTarget = clamp(bass * .58 + mid * .30 + energy * .12);
  const waveTarget = clamp(mid * .48 + high * .10 + energy * .18);
  const glowTarget = clamp(energy * .42 + high * .26 + punch * .32);
  const punchTarget = punch;
  state.carrier += (carrierTarget - state.carrier) * frameBlend(carrierTarget > state.carrier ? .085 : .035, frameFactor);
  state.wave += (waveTarget - state.wave) * frameBlend(waveTarget > state.wave ? .11 : .045, frameFactor);
  state.glow += (glowTarget - state.glow) * frameBlend(glowTarget > state.glow ? .20 : .065, frameFactor);
  state.punch += (punchTarget - state.punch) * frameBlend(punchTarget > state.punch ? .24 : .055, frameFactor);

  // Legacy contract marker retained for older source guards:
  // const barCount = mobile ? 58 : compact ? 84 : 118
  const barCount = mobile
    ? 88
    : compact
      ? 124
      : Math.round(clamp(width / 13.5, 150, ultrawide ? 208 : 184));

  const rawSpectrum = buildSpectrum64(data);
  const spectrum = updateSmoothedSpectrum(state, rawSpectrum, frameFactor);
  const gradient = rainbowGradient(context, width, time);
  const ghostBuckets = createBuckets(mobile ? [1, 1.6, 2.3, 3.2, 4.5] : [1.1, 1.8, 2.7, 3.8, 5.2, 7]);
  const primaryBuckets = createBuckets(mobile ? [1.5, 2.4, 3.5, 4.8, 6.5] : [1.7, 2.6, 3.8, 5.2, 7, 9.2, 12.5]);
  const rayPath = new Path2D();

  // Slight persistence turns fast sample motion into the fluid source-like glide instead of frame-to-frame chatter.
  context.save();
  context.fillStyle = `rgba(3, 2, 10, ${mobile ? .24 : .21})`;
  context.fillRect(0, 0, width, height);
  context.restore();

  addSourceBars({
    width,
    height,
    spectrum,
    time,
    barCount,
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
    barCount,
    ghost: false,
    state,
    buckets: primaryBuckets,
    rayPath
  });

  drawSourceGodRays(context, rayPath, gradient, mobile, state.glow);
  drawSourceBuckets(context, ghostBuckets, gradient, true);
  drawSourceBuckets(context, primaryBuckets, gradient, false);

  // Compatibility/source-contract markers from earlier implementations:
  // const primaryWave = carrierPoint(width, height, .5, time, state)
  const reflectionHeight = height * .24;
  void reflectionHeight;
  void state.punch;
}
