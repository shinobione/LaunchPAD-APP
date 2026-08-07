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
  const beatDrive = clamp(bass * .82 + kick * 1.35 + peak * .55 + dynamics * .45);
  const burst = .22 + beatDrive * 1.38 + middle * .18;

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < fragments; index += 1) {
    const depth = .36 + seeded(index, 31) * 1.02;
    const value = data[index % data.length] / 255;
    const angle = seeded(index, 7) * Math.PI * 2
      + time * (seeded(index, 32) - .5) * (.12 + energy * .32 + dynamics * .22)
      + Math.sin(time * (.5 + high * .42) + index) * (.07 + beatDrive * .14);
    const distance = minSide * (.045 + seeded(index, 8) * .42 * burst) * depth;
    const perspective = .64 + depth * .48;
    const size = minSide * (.014 + seeded(index, 10) * .038)
      * (1 + value * .62 + beatDrive * .68 + high * .16)
      * perspective;
    const x = Math.cos(angle) * distance + Math.sin(time * .78 + index) * minSide * (.008 + beatDrive * .018) * depth;
    const y = Math.sin(angle) * distance * (.73 + depth * .2) + Math.cos(time * .66 + index * .7) * minSide * (.008 + beatDrive * .016) * depth;
    const spin = time * (index % 2 ? -.3 : .36) * (1.18 - depth * .2 + beatDrive * .35) + seeded(index, 9) * Math.PI;

    context.save();
    context.translate(x, y);
    context.rotate(spin);
    context.scale(perspective, perspective);
    context.beginPath();
    context.moveTo(-size * .7, size * .45);
    context.lineTo(size, 0);
    context.lineTo(-size * .25, -size);
    context.closePath();
    context.fillStyle = colorWithAlpha(index % 2 ? accent2 : accent, .045 + value * .22 + dynamics * .09 + beatDrive * .1);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent : accent2, .24 + value * .5 + beatDrive * .34);
    context.lineWidth = .55 + value * 1.5 + high * .5 + beatDrive * .65;
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = mobile
      ? 2.5 + value * 6 + beatDrive * 6
      : 7 + value * 17 + beatDrive * 18;
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();

  const coreRadius = minSide * (.135 + bass * .045 + beatDrive * .095);
  const core = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
  core.addColorStop(0, colorWithAlpha('#ffffff', .68 + high * .2 + beatDrive * .12));
  core.addColorStop(.14, colorWithAlpha(accent, .5 + beatDrive * .34));
  core.addColorStop(.46, colorWithAlpha(accent2, .13 + middle * .23 + beatDrive * .16));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(cx, cy, coreRadius, 0, Math.PI * 2);
  context.fill();

  for (let index = 0; index < cracks; index += 1) {
    const angle = index / cracks * Math.PI * 2 + time * (.035 + energy * .07 + beatDrive * .06);
    const length = minSide * (.15 + seeded(index, 12) * .29 + bass * .07 + beatDrive * .18);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent2 : accent, .18 + high * .45 + peak * .14 + beatDrive * .28);
    context.lineWidth = .55 + high * 1.6 + beatDrive * 1.25;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * minSide * (.055 + beatDrive * .02), cy + Math.sin(angle) * minSide * (.055 + beatDrive * .02));
    context.lineTo(cx + Math.cos(angle + .08) * length, cy + Math.sin(angle + .08) * length);
    context.stroke();
  }

  if (beatDrive > .08) {
    context.save();
    context.globalCompositeOperation = 'lighter';
    context.strokeStyle = colorWithAlpha('#ffffff', beatDrive * .22);
    context.lineWidth = 1 + beatDrive * 2.2;
    context.beginPath();
    context.arc(cx, cy, coreRadius * (1.18 + beatDrive * .5), 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

export function drawAuroraGlassMode(context, width, height, data, accent, accent2, time, features) {
  const { bass, middle, high, energy, kick, presence, sparkle, rms, peak, dynamics } = audioBands(data, features);
  const transient = clamp(Math.max(kick, peak));
  const beatDrive = clamp(bass * .8 + kick * 1.25 + peak * .58 + dynamics * .55);
  const ribbons = width < 600 ? 5 : 6;
  const expansion = .25 + bass * .72 + middle * .48 + high * .24 + dynamics * .48 + beatDrive * 1.05;
  const motionRate = .14 + bass * .52 + middle * .42 + high * .34 + dynamics * .62 + beatDrive * 1.18;
  const horizon = height * (.5 + Math.sin(time * (.05 + dynamics * .1 + beatDrive * .11)) * (.008 + beatDrive * .036));
  const separation = height * (.018 + middle * .02 + dynamics * .025 + beatDrive * .068);

  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .018 + high * .08 + sparkle * .045 + beatDrive * .045));
  ambient.addColorStop(.45, colorWithAlpha(accent, .035 + middle * .12 + rms * .12 + beatDrive * .12));
  ambient.addColorStop(.78, colorWithAlpha(accent2, .014 + bass * .065 + beatDrive * .07));
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
    const baseAmplitude = band === 0 ? .032 : band === 1 ? .028 : .021;
    const bandDrive = band === 0
      ? bass * .15 + kick * .12 + beatDrive * .11
      : band === 1
        ? middle * .12 + presence * .055 + beatDrive * .075
        : high * .095 + sparkle * .055 + beatDrive * .085;
    const amplitude = height * (baseAmplitude + bandDrive * expansion + dynamics * .018 + beatDrive * .055);
    const thickness = height * (
      .0065
      + bandValue * (band === 0 ? .034 : .027)
      + dynamics * .01
      + beatDrive * .018
      + (ribbon % 2) * .0018
    );
    const points = width < 600 ? 42 : 58;

    const waveAt = progress => {
      const spectralIndex = Math.min(
        data.length - 1,
        Math.max(0, Math.floor(sampleStart + (sampleEnd - sampleStart) * progress))
      );
      const spectral = Math.pow((data[spectralIndex] || 0) / 255, 1.04);
      const primary = Math.sin(
        progress * Math.PI * (1.7 + band * .76 + ribbon * .08)
        + time * speed
        + ribbon * .78
      );
      const secondary = Math.sin(
        progress * Math.PI * (4.4 + band * 1.7)
        - time * speed * (band === 2 ? 1.72 : .8)
        + ribbon * .41
      ) * (.11 + bandValue * .34 + dynamics * .15 + beatDrive * .18);
      const spectralRipple = Math.sin(
        progress * Math.PI * (9.2 + band * 3.4 + ribbon * .3)
        + time * speed * (2.1 + beatDrive * 3.2)
        + ribbon
      ) * spectral * (.2 + dynamics * .18 + beatDrive * .5);
      const spectralDeformation = (spectral - bandValue) * (.28 + dynamics * .28 + beatDrive * .34);
      const peakRipple = Math.sin(
        progress * Math.PI * (7.5 + ribbon * .28)
        + time * (1.15 + beatDrive * 2.7) * direction
      ) * beatDrive * (band === 2 ? .3 : .18);
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
    gradient.addColorStop(0, colorWithAlpha(colorA, .01 + dynamics * .016 + beatDrive * .03));
    gradient.addColorStop(.24, colorWithAlpha(colorB, .07 + bandValue * .2 + rms * .12 + beatDrive * .2));
    gradient.addColorStop(.5, colorWithAlpha('#ffffff', .025 + high * .12 + beatDrive * .22));
    gradient.addColorStop(.77, colorWithAlpha(colorA, .065 + bandValue * .2 + dynamics * .07 + beatDrive * .16));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = colorB;
    context.shadowBlur = 3 + bandValue * 9 + dynamics * 6 + beatDrive * 15;
    context.fill();
  }

  if (beatDrive > .035) {
    const attackGlow = context.createLinearGradient(0, horizon - height * .2, 0, horizon + height * .2);
    attackGlow.addColorStop(0, 'rgba(0,0,0,0)');
    attackGlow.addColorStop(.5, colorWithAlpha('#ffffff', beatDrive * .23 + kick * .08));
    attackGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = attackGlow;
    context.fillRect(0, horizon - height * .22, width, height * .44);
  }
  context.restore();
}
