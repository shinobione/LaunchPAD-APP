function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function colorWithAlpha(color, alpha) {
  const value = clamp(alpha);
  const six = /^#([0-9a-f]{6})$/i.exec(color);
  if (six) {
    const number = Number.parseInt(six[1], 16);
    return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${value})`;
  }
  const three = /^#([0-9a-f]{3})$/i.exec(color);
  if (three) {
    const [red, green, blue] = three[1].split('').map(part => Number.parseInt(part + part, 16));
    return `rgba(${red},${green},${blue},${value})`;
  }
  return color;
}

function bandAverage(data, start, end) {
  let total = 0;
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  for (let index = from; index < to; index += 1) total += data[index];
  return total / Math.max(1, to - from) / 255;
}

function featureValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function audioBands(data, features = {}) {
  const rawBass = bandAverage(data, 0, data.length * .16);
  const rawMiddle = bandAverage(data, data.length * .16, data.length * .58);
  const rawHigh = bandAverage(data, data.length * .58, data.length);
  const rawEnergy = bandAverage(data, 0, data.length);
  const bass = clamp(Math.max(rawBass * 1.55, featureValue(features.bass)));
  const middle = clamp(Math.max(rawMiddle * 1.38, featureValue(features.mid)));
  const high = clamp(Math.max(rawHigh * 1.48, featureValue(features.high)));
  const energy = clamp(Math.max(rawEnergy * 1.42, featureValue(features.energy)));

  return {
    bass,
    middle,
    high,
    energy,
    kick: clamp(featureValue(features.kick)),
    presence: clamp(Math.max(featureValue(features.presence), middle * .72 + high * .28)),
    sparkle: clamp(Math.max(featureValue(features.sparkle), high * .92)),
    intensity: clamp(Math.max(featureValue(features.intensity), energy * .72 + bass * .38)),
    rms: clamp(Math.max(featureValue(features.rms), rawEnergy * 1.2)),
    peak: clamp(Math.max(featureValue(features.peak), rawBass * 1.18, rawHigh * .92)),
    dynamics: clamp(Math.max(featureValue(features.dynamics), Math.abs(rawBass - rawMiddle) * 1.7))
  };
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function sampleAt(data, progress) {
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(progress * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function localDelta(data, progress, spread = 4) {
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(progress * (data.length - 1))));
  const before = (data[Math.max(0, index - spread)] || 0) / 255;
  const after = (data[Math.min(data.length - 1, index + spread)] || 0) / 255;
  return after - before;
}

function mobileVisualDevice(width) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

export function drawNeonShatterAdaptiveMode(context, width, height, data, accent, accent2, time, features = {}) {
  const { bass, middle, high, energy, kick, peak, dynamics } = audioBands(data, features);
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const fragments = mobile ? 22 : 54;
  const cracks = mobile ? 10 : 18;
  const beatDrive = clamp(bass * .76 + kick * 1.22 + peak * .48 + dynamics * .42);
  const tinyDrift = Math.sin(time * .31) * energy * .025;

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < fragments; index += 1) {
    const progress = (index + .5) / fragments;
    const value = sampleAt(data, progress);
    const delta = localDelta(data, progress, 3);
    const depth = .38 + seeded(index, 31) * .98;
    const direction = index % 2 ? -1 : 1;
    const baseAngle = seeded(index, 7) * Math.PI * 2;
    const angle = baseAngle + direction * (value * .24 + delta * .22 + beatDrive * .08 + tinyDrift);
    const radialDrive = .72 + value * .82 + beatDrive * .62 + Math.abs(delta) * .34;
    const distance = minSide * (.08 + seeded(index, 8) * .34) * radialDrive * depth;
    const perspective = .68 + depth * .44;
    const size = minSide * (.015 + seeded(index, 10) * .036)
      * (1 + value * .78 + beatDrive * .52 + high * .16)
      * perspective;
    const sideKick = delta * minSide * .022 + direction * beatDrive * minSide * .009;
    const x = Math.cos(angle) * distance + Math.cos(baseAngle + Math.PI / 2) * sideKick;
    const y = Math.sin(angle) * distance * (.75 + depth * .18) + Math.sin(baseAngle + Math.PI / 2) * sideKick;
    const spin = seeded(index, 9) * Math.PI + direction * (value * .72 + delta * .55 + high * .18);

    context.save();
    context.translate(x, y);
    context.rotate(spin);
    context.scale(perspective, perspective);
    context.beginPath();
    context.moveTo(-size * .7, size * .45);
    context.lineTo(size, 0);
    context.lineTo(-size * .25, -size);
    context.closePath();
    context.fillStyle = colorWithAlpha(index % 2 ? accent2 : accent, .035 + value * .3 + beatDrive * .09);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent : accent2, .2 + value * .62 + beatDrive * .27);
    context.lineWidth = .55 + value * 1.85 + high * .45 + beatDrive * .55;
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = mobile ? 2 + value * 7 + beatDrive * 5 : 6 + value * 18 + beatDrive * 14;
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();

  const coreRadius = minSide * (.125 + bass * .055 + beatDrive * .105);
  const core = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  core.addColorStop(0, colorWithAlpha('#ffffff', .58 + high * .24 + beatDrive * .13));
  core.addColorStop(.14, colorWithAlpha(accent, .42 + beatDrive * .38));
  core.addColorStop(.48, colorWithAlpha(accent2, .1 + middle * .22 + beatDrive * .18));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  context.fill();

  for (let index = 0; index < cracks; index += 1) {
    const progress = (index + .5) / cracks;
    const value = sampleAt(data, progress);
    const delta = localDelta(data, progress, 5);
    const angle = index / cracks * Math.PI * 2 + delta * .18 + beatDrive * .025 * (index % 2 ? -1 : 1);
    const length = minSide * (.14 + seeded(index, 12) * .25 + value * .13 + bass * .05 + beatDrive * .12);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent2 : accent, .14 + value * .42 + high * .24 + beatDrive * .22);
    context.lineWidth = .5 + value * 1.25 + high * 1.1 + beatDrive * .9;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * coreRadius * .55, cy + Math.sin(angle) * coreRadius * .55);
    context.lineTo(cx + Math.cos(angle + delta * .12) * length, cy + Math.sin(angle + delta * .12) * length);
    context.stroke();
  }
}

export function drawAuroraGlassMode(context, width, height, data, accent, accent2, time, features = {}) {
  const { bass, middle, high, energy, kick, presence, sparkle, rms, peak, dynamics } = audioBands(data, features);
  const beatDrive = clamp(bass * .74 + kick * 1.12 + peak * .5 + dynamics * .48);
  const ribbons = width < 600 ? 5 : 6;
  const horizon = height * (.5 + (bass - high) * .035 + (middle - .25) * .018);
  const separation = height * (.018 + middle * .025 + beatDrive * .04);
  const microDrift = Math.sin(time * .23) * energy * .018;

  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .012 + high * .07 + sparkle * .035));
  ambient.addColorStop(.45, colorWithAlpha(accent, .026 + middle * .11 + rms * .1 + beatDrive * .08));
  ambient.addColorStop(.78, colorWithAlpha(accent2, .01 + bass * .06 + beatDrive * .045));
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
    const band = ribbon % 3;
    const bandValue = band === 0 ? bass : band === 1 ? middle : high;
    const rangeStart = band === 0 ? 0 : band === 1 ? .16 : .58;
    const rangeEnd = band === 0 ? .16 : band === 1 ? .58 : 1;
    const offset = (ribbon - (ribbons - 1) / 2) * separation;
    const baseAmplitude = band === 0 ? .026 : band === 1 ? .023 : .019;
    const reactiveAmplitude = band === 0
      ? bass * .12 + kick * .1 + beatDrive * .08
      : band === 1
        ? middle * .1 + presence * .045 + dynamics * .05
        : high * .085 + sparkle * .045 + peak * .045;
    const amplitude = height * (baseAmplitude + reactiveAmplitude + beatDrive * .035);
    const thickness = height * (.006 + bandValue * .025 + beatDrive * .01 + (ribbon % 2) * .0015);
    const points = width < 600 ? 46 : 64;

    const waveAt = progress => {
      const mapped = rangeStart + (rangeEnd - rangeStart) * progress;
      const spectral = sampleAt(data, mapped);
      const delta = localDelta(data, mapped, 3);
      const baseWave = Math.sin(progress * Math.PI * (1.75 + band * .72 + ribbon * .07) + ribbon * .72);
      const detailWave = Math.sin(progress * Math.PI * (5.1 + band * 1.6) + ribbon * .43) * (.1 + bandValue * .18);
      const spectralLift = (spectral - bandValue * .36) * (1.05 + dynamics * .32 + beatDrive * .28);
      const edge = delta * (.55 + peak * .25 + beatDrive * .22);
      return baseWave * (.48 + bandValue * .42) + detailWave + spectralLift + edge + microDrift;
    };

    context.beginPath();
    for (let point = 0; point <= points; point += 1) {
      const progress = point / points;
      const x = progress * width;
      const y = horizon + offset + waveAt(progress) * amplitude;
      if (!point) context.moveTo(x, y - thickness); else context.lineTo(x, y - thickness);
    }
    for (let point = points; point >= 0; point -= 1) {
      const progress = point / points;
      const x = progress * width;
      const y = horizon + offset + waveAt(progress) * amplitude;
      context.lineTo(x, y + thickness);
    }
    context.closePath();

    const colorA = band === 0 ? accent : band === 1 ? accent2 : '#ffffff';
    const colorB = band === 0 ? accent2 : band === 1 ? accent : accent2;
    const gradient = context.createLinearGradient(0, horizon - amplitude, width, horizon + amplitude);
    gradient.addColorStop(0, colorWithAlpha(colorA, .008 + beatDrive * .018));
    gradient.addColorStop(.24, colorWithAlpha(colorB, .055 + bandValue * .22 + rms * .08));
    gradient.addColorStop(.5, colorWithAlpha('#ffffff', .02 + high * .11 + beatDrive * .12));
    gradient.addColorStop(.77, colorWithAlpha(colorA, .055 + bandValue * .2 + dynamics * .055));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = colorB;
    context.shadowBlur = 2.5 + bandValue * 8 + dynamics * 4 + beatDrive * 9;
    context.fill();
  }
  context.restore();
}

export function drawLiquidChromeLiveMode(context, width, height, data, accent, accent2, time, features = {}) {
  const { bass, middle, high, peak } = audioBands(data, features);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const points = width < 520 ? 72 : 104;
  const baseRadius = .247;

  context.save();
  context.translate(cx, cy);
  context.beginPath();
  for (let index = 0; index <= points; index += 1) {
    const progress = index / points;
    const angle = progress * Math.PI * 2;
    const sample = sampleAt(data, progress);
    const delta = localDelta(data, progress, 3);
    const wave = Math.sin(angle * 3 + time * .28) * (.018 + middle * .034)
      + Math.sin(angle * 7 - time * .36) * (.008 + high * .02);
    const radius = minSide * (baseRadius + bass * .045 + sample * .078 + Math.abs(delta) * .025 + wave);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * (.84 + peak * .035);
    if (!index) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath();
  const gradient = context.createLinearGradient(-minSide * .34, -minSide * .34, minSide * .34, minSide * .34);
  gradient.addColorStop(0, colorWithAlpha('#ffffff', .8));
  gradient.addColorStop(.18, colorWithAlpha(accent, .82));
  gradient.addColorStop(.48, colorWithAlpha('#dce8ff', .43));
  gradient.addColorStop(.72, colorWithAlpha(accent2, .84));
  gradient.addColorStop(1, colorWithAlpha('#05050a', .9));
  context.fillStyle = gradient;
  context.shadowColor = accent;
  context.shadowBlur = 19 + bass * 30;
  context.fill();
  context.lineWidth = 1.25 + high * 2.2;
  context.strokeStyle = colorWithAlpha('#ffffff', .36 + high * .38);
  context.stroke();
  context.restore();
}

export function drawSingularityLiveMode(context, width, height, data, accent, accent2, time, features = {}) {
  const { bass, middle, high, energy, peak } = audioBands(data, features);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const horizon = minSide * (.118 + bass * .04 + peak * .012);
  const outerReach = minSide * .37;
  const glow = context.createRadialGradient(cx, cy, horizon * .72, cx, cy, minSide * .48);
  glow.addColorStop(0, 'rgba(0,0,0,.99)');
  glow.addColorStop(.23, colorWithAlpha(accent, .09 + bass * .13));
  glow.addColorStop(.52, colorWithAlpha(accent2, .04 + middle * .075));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.rotate(-.16 + (high - bass) * .025);
  context.scale(1.07, .38);
  const rings = width < 520 ? 34 : 50;
  for (let index = 0; index < rings; index += 1) {
    const progress = index / rings;
    const value = sampleAt(data, progress);
    const radius = horizon * 1.28 + progress * outerReach * (1 + value * .08);
    const start = time * (.065 + energy * .07) + index * .245 + value * .16;
    const length = Math.PI * (1.04 + value * .68);
    context.beginPath();
    context.arc(0, 0, radius, start, start + length);
    context.strokeStyle = colorWithAlpha(index % 3 ? accent : accent2, .075 + value * .36);
    context.lineWidth = .55 + value * 1.75 + high * .25;
    context.shadowColor = index % 3 ? accent : accent2;
    context.shadowBlur = 1 + value * 4.2;
    context.stroke();
  }
  context.restore();

  context.save();
  context.fillStyle = '#010103';
  context.shadowColor = colorWithAlpha(accent, .44);
  context.shadowBlur = 6 + bass * 9;
  context.beginPath();
  context.arc(cx, cy, horizon, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = colorWithAlpha('#ffffff', .12 + high * .16);
  context.lineWidth = .8 + high * .7;
  context.beginPath();
  context.arc(cx, cy, horizon * 1.015, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
