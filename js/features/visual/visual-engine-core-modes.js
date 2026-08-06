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

export function drawAuroraGlassMode(context, width, height, data, accent, accent2, time, features) {
  const { bass, middle, high, energy, kick, presence, sparkle, rms, peak, dynamics } = audioBands(data, features);
  const ribbons = width < 600 ? 5 : 6;
  const calmness = 1 - dynamics;
  const expansion = .42 + dynamics * .94 + peak * .2;
  const motionRate = .14 + dynamics * .72 + peak * .16;
  const horizon = height * (.5 + Math.sin(time * (.035 + dynamics * .035)) * (.008 + dynamics * .02));
  const separation = height * (.025 + dynamics * .043);

  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .025 + high * .055 + dynamics * .035));
  ambient.addColorStop(.45, colorWithAlpha(accent, .055 + middle * .1 + rms * .12));
  ambient.addColorStop(.78, colorWithAlpha(accent2, .018 + bass * .045));
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
    const samplePosition = sampleStart + (sampleEnd - sampleStart) * ((Math.floor(ribbon / 3) + .5) / Math.ceil(ribbons / 3));
    const sample = data[Math.min(data.length - 1, Math.floor(samplePosition))] / 255;
    const direction = band === 1 ? -1 : 1;
    const bandSpeed = band === 0 ? .24 : band === 1 ? .34 : .46;
    const speed = direction * bandSpeed * motionRate;
    const offset = (ribbon - (ribbons - 1) / 2) * separation * (1 + dynamics * .32);
    const baseAmplitude = band === 0 ? .048 : band === 1 ? .038 : .027;
    const reactiveAmplitude = band === 0
      ? bass * .12 + kick * .07
      : band === 1
        ? middle * .095 + presence * .035
        : high * .07 + sparkle * .032;
    const amplitude = height * (baseAmplitude * (.55 + calmness * .25) + reactiveAmplitude * expansion + dynamics * .025);
    const thickness = height * (
      .011
      + bandValue * (band === 0 ? .032 : .024)
      + dynamics * .012
      + (ribbon % 2) * .002
    );
    const points = 52;

    const waveAt = progress => {
      const primary = Math.sin(progress * Math.PI * (1.75 + band * .72 + ribbon * .08) + time * speed + ribbon * .78);
      const secondary = Math.sin(
        progress * Math.PI * (4.2 + band * 1.55)
        - time * speed * (band === 2 ? 1.55 : .72)
        + ribbon * .41
      ) * (.14 + bandValue * .36 + dynamics * .16);
      const peakRipple = Math.sin(progress * Math.PI * (7.2 + ribbon * .25) + time * .9 * direction) * peak * (band === 2 ? .18 : .09);
      return primary + secondary + peakRipple;
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
    gradient.addColorStop(0, colorWithAlpha(colorA, .012 + dynamics * .015));
    gradient.addColorStop(.24, colorWithAlpha(colorB, .09 + sample * .19 + rms * .13));
    gradient.addColorStop(.5, colorWithAlpha('#ffffff', .035 + high * .11 + peak * .09));
    gradient.addColorStop(.77, colorWithAlpha(colorA, .08 + bandValue * .18 + dynamics * .08));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = colorB;
    context.shadowBlur = 5 + sample * 11 + dynamics * 8;
    context.fill();
  }

  if (peak > .08) {
    const attackGlow = context.createLinearGradient(0, horizon - height * .18, 0, horizon + height * .18);
    attackGlow.addColorStop(0, 'rgba(0,0,0,0)');
    attackGlow.addColorStop(.5, colorWithAlpha('#ffffff', peak * .1 + kick * .045));
    attackGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = attackGlow;
    context.fillRect(0, horizon - height * .2, width, height * .4);
  }
  context.restore();
}
