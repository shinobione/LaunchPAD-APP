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

function audioBands(data, features = {}) {
  return {
    bass: features.bass ?? bandAverage(data, 0, data.length * .16),
    middle: features.mid ?? bandAverage(data, data.length * .16, data.length * .58),
    high: features.high ?? bandAverage(data, data.length * .58, data.length),
    energy: features.energy ?? bandAverage(data, 0, data.length),
    kick: features.kick ?? 0,
    presence: features.presence ?? 0,
    sparkle: features.sparkle ?? 0,
    intensity: features.intensity ?? 0,
    rms: features.rms ?? features.energy ?? 0,
    peak: features.peak ?? features.kick ?? 0,
    dynamics: features.dynamics ?? features.intensity ?? features.energy ?? 0
  };
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
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
  const fragments = mobile ? 20 : 52;
  const cracks = mobile ? 9 : 16;
  const burst = .3 + bass * .62 + kick * .58 + peak * .18;

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < fragments; index += 1) {
    const depth = .36 + seeded(index, 31) * 1.02;
    const value = data[index % data.length] / 255;
    const angle = seeded(index, 7) * Math.PI * 2
      + time * (seeded(index, 32) - .5) * (.13 + energy * .2 + dynamics * .08)
      + Math.sin(time * (.46 + high * .2) + index) * (.08 + kick * .06);
    const distance = minSide * (.07 + seeded(index, 8) * .43 * burst) * depth;
    const perspective = .64 + depth * .48;
    const size = minSide * (.015 + seeded(index, 10) * .038)
      * (1 + value * .55 + kick * .24 + peak * .1)
      * perspective;
    const x = Math.cos(angle) * distance + Math.sin(time * .7 + index) * minSide * .012 * depth;
    const y = Math.sin(angle) * distance * (.73 + depth * .2) + Math.cos(time * .58 + index * .7) * minSide * .011 * depth;
    const spin = time * (index % 2 ? -.28 : .34) * (1.18 - depth * .2) + seeded(index, 9) * Math.PI;

    context.save();
    context.translate(x, y);
    context.rotate(spin);
    context.scale(perspective, perspective);
    context.beginPath();
    context.moveTo(-size * .7, size * .45);
    context.lineTo(size, 0);
    context.lineTo(-size * .25, -size);
    context.closePath();
    context.fillStyle = colorWithAlpha(index % 2 ? accent2 : accent, .055 + value * .2 + dynamics * .075);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent : accent2, .28 + value * .5 + kick * .15);
    context.lineWidth = .6 + value * 1.5 + high * .42;
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = mobile ? 2.5 + value * 6 + kick * 3 : 7 + value * 17 + kick * 8;
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();

  const coreRadius = minSide * (.17 + bass * .05 + kick * .032);
  const core = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  core.addColorStop(0, colorWithAlpha('#ffffff', .72 + high * .2));
  core.addColorStop(.14, colorWithAlpha(accent, .54 + kick * .18));
  core.addColorStop(.46, colorWithAlpha(accent2, .16 + middle * .23));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  context.fill();

  for (let index = 0; index < cracks; index += 1) {
    const angle = index / cracks * Math.PI * 2 + time * (.04 + energy * .055);
    const length = minSide * (.19 + seeded(index, 12) * .31 + bass * .075 + kick * .085);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent2 : accent, .22 + high * .5 + peak * .16);
    context.lineWidth = .65 + high * 1.7 + kick * .72;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * minSide * .07, cy + Math.sin(angle) * minSide * .07);
    context.lineTo(cx + Math.cos(angle + .08) * length, cy + Math.sin(angle + .08) * length);
    context.stroke();
  }
}

export function drawAuroraGlassMode(context, width, height, data, accent, accent2, time, features) {
  const { bass, middle, high, energy, kick, presence, sparkle, rms, peak, dynamics } = audioBands(data, features);
  const transient = clamp(Math.max(kick, peak));
  const ribbons = width < 600 ? 5 : 6;
  const expansion = .34 + bass * .86 + middle * .54 + high * .28 + dynamics * .62 + transient * .68;
  const motionRate = .16 + bass * .58 + middle * .48 + high * .38 + dynamics * .78 + transient * 1.05;
  const horizon = height * (.5 + Math.sin(time * (.045 + dynamics * .085 + transient * .06)) * (.008 + dynamics * .026 + transient * .012));
  const separation = height * (.024 + middle * .022 + dynamics * .038 + transient * .012);

  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .02 + high * .08 + sparkle * .045));
  ambient.addColorStop(.45, colorWithAlpha(accent, .045 + middle * .13 + rms * .14 + transient * .05));
  ambient.addColorStop(.78, colorWithAlpha(accent2, .015 + bass * .065 + kick * .035));
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
    const band = ribbon % 3;
    const bandValue = band === 0 ? bass : band === 1 ? middle : high;
    const sampleStart = band === 0 ? 0 : band === 1 ? data.length * .16 : data.length * .58;
    const sampleEnd = band === 0 ? data.length * .16 : band === 1 ? data.length * .58 : data.length;
    const direction = band === 1 ? -1 : 1;
    const bandSpeed = band === 0 ? .3 : band === 1 ? .43 : .58;
    const speed = direction * bandSpeed * motionRate;
    const offset = (ribbon - (ribbons - 1) / 2) * separation;
    const baseAmplitude = band === 0 ? .038 : band === 1 ? .031 : .023;
    const bandDrive = band === 0
      ? bass * .15 + kick * .1 + transient * .055
      : band === 1
        ? middle * .12 + presence * .055 + transient * .035
        : high * .095 + sparkle * .055 + transient * .045;
    const amplitude = height * (baseAmplitude + bandDrive * expansion + dynamics * .026);
    const thickness = height * (
      .008
      + bandValue * (band === 0 ? .038 : .029)
      + dynamics * .013
      + transient * .009
      + (ribbon % 2) * .0018
    );
    const points = width < 600 ? 42 : 58;

    const waveAt = progress => {
      const spectralIndex = Math.min(
        data.length - 1,
        Math.max(0, Math.floor(sampleStart + (sampleEnd - sampleStart) * progress))
      );
      const spectral = Math.pow((data[spectralIndex] || 0) / 255, 1.08);
      const primary = Math.sin(
        progress * Math.PI * (1.7 + band * .76 + ribbon * .08)
        + time * speed
        + ribbon * .78
      );
      const secondary = Math.sin(
        progress * Math.PI * (4.4 + band * 1.7)
        - time * speed * (band === 2 ? 1.72 : .8)
        + ribbon * .41
      ) * (.11 + bandValue * .34 + dynamics * .18);
      const spectralRipple = Math.sin(
        progress * Math.PI * (9.2 + band * 3.4 + ribbon * .3)
        + time * speed * (2.1 + transient * 2.7)
        + ribbon
      ) * spectral * (.2 + dynamics * .22 + transient * .34);
      const spectralDeformation = (spectral - bandValue) * (.28 + dynamics * .32 + transient * .18);
      const peakRipple = Math.sin(
        progress * Math.PI * (7.5 + ribbon * .28)
        + time * (1.15 + transient * 2.1) * direction
      ) * transient * (band === 2 ? .24 : .14);
      return primary + secondary + spectralRipple + spectralDeformation + peakRipple;
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
    gradient.addColorStop(0, colorWithAlpha(colorA, .012 + dynamics * .018));
    gradient.addColorStop(.24, colorWithAlpha(colorB, .085 + bandValue * .2 + rms * .14 + transient * .06));
    gradient.addColorStop(.5, colorWithAlpha('#ffffff', .03 + high * .14 + transient * .13));
    gradient.addColorStop(.77, colorWithAlpha(colorA, .075 + bandValue * .2 + dynamics * .09));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = colorB;
    context.shadowBlur = 4 + bandValue * 10 + dynamics * 7 + transient * 8;
    context.fill();
  }

  if (transient > .045) {
    const attackGlow = context.createLinearGradient(0, horizon - height * .2, 0, horizon + height * .2);
    attackGlow.addColorStop(0, 'rgba(0,0,0,0)');
    attackGlow.addColorStop(.5, colorWithAlpha('#ffffff', transient * .16 + kick * .07));
    attackGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = attackGlow;
    context.fillRect(0, horizon - height * .22, width, height * .44);
  }
  context.restore();
}
