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
    intensity: features.intensity ?? 0
  };
}

export function drawOrbitMode(context, width, height, data, accent, accent2, time, features) {
  const centerX = width / 2;
  const centerY = height / 2;
  const minSide = Math.min(width, height);
  const { bass, middle, high, energy, kick, sparkle, intensity } = audioBands(data, features);
  const bassDrive = Math.pow(clamp(bass * 1.7 + energy * .52 + kick * 2.1), .58);
  const spectralDrive = clamp(middle * .72 + high * .58 + energy * .4);
  const spokes = width < 600 ? 52 : 76;
  const coreRadius = minSide * (.145 + bassDrive * .062);
  const rotationSpeed = .045 + energy * .16 + bassDrive * .11;

  const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minSide * (.46 + bassDrive * .13));
  glow.addColorStop(0, colorWithAlpha(accent, .22 + bassDrive * .42));
  glow.addColorStop(.28, colorWithAlpha(accent2, .095 + middle * .22 + kick * .14));
  glow.addColorStop(.62, colorWithAlpha(accent, .025 + high * .1 + intensity * .05));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(time * rotationSpeed + kick * .12);
  context.globalCompositeOperation = 'lighter';

  for (let index = 0; index < spokes; index += 1) {
    const progress = index / spokes;
    const sample = data[Math.floor(progress * data.length)] / 255;
    const angle = progress * Math.PI * 2;
    const lowBias = Math.pow(1 - progress, 1.7);
    const inner = coreRadius * (.92 + Math.sin(time * .62 + index * .31) * .018);
    const spectralLength = minSide * (
      .045
      + sample * .225
      + bassDrive * (.105 + lowBias * .075)
      + (index % 3 === 0 ? high * .072 : middle * .026)
    );
    const outer = inner + spectralLength;
    const tangentialShift = Math.sin(time * (.68 + spectralDrive * .45) + index * .48) * minSide * high * .008;
    const tangentX = -Math.sin(angle) * tangentialShift;
    const tangentY = Math.cos(angle) * tangentialShift;

    context.strokeStyle = colorWithAlpha(index % 3 ? accent : accent2, .2 + sample * .76 + bassDrive * .14);
    context.lineWidth = .82 + sample * 3.2 + bassDrive * 1.45 + high * .35;
    context.shadowColor = index % 3 ? accent : accent2;
    context.shadowBlur = 6 + sample * 19 + sparkle * 8 + bassDrive * 7;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer + tangentX, Math.sin(angle) * outer + tangentY);
    context.stroke();
  }

  const bandValues = [bassDrive, middle, high, energy];
  for (let ring = 0; ring < 4; ring += 1) {
    const bandDrive = Math.pow(clamp(bandValues[ring] * 1.55 + kick * (ring === 0 ? 1.35 : .38)), .68);
    const breathing = Math.sin(time * (.72 + ring * .11) + ring * 1.35) * .5 + .5;
    const radius = minSide * (.17 + ring * .061 + bandDrive * (.04 + ring * .007) + breathing * .008);
    const eccentricity = 1 + (ring % 2 ? middle : high) * .11 + bandDrive * .045;
    context.save();
    context.rotate(time * (.025 + ring * .014) * (ring % 2 ? -1 : 1));
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, .16 + bandDrive * .42 + kick * .1 - ring * .012);
    context.lineWidth = 1 + (3 - ring) * .26 + bandDrive * 2.05;
    context.beginPath();
    context.ellipse(0, 0, radius * eccentricity, radius / eccentricity, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  const satellites = width < 600 ? 3 : 5;
  for (let satellite = 0; satellite < satellites; satellite += 1) {
    const sample = data[(satellite * 17 + 9) % data.length] / 255;
    const angle = time * (.18 + energy * .32) * (satellite % 2 ? -1 : 1) + satellite / satellites * Math.PI * 2;
    const radius = minSide * (.255 + satellite * .026 + bassDrive * .035);
    const size = 1.6 + sample * 4.2 + kick * 2.4;
    context.fillStyle = satellite % 2 ? accent2 : accent;
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 9 + sample * 15 + kick * 9;
    context.beginPath();
    context.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, size, 0, Math.PI * 2);
    context.fill();
  }

  if (bassDrive > .12) {
    const shockRadius = minSide * (.29 + (1 - bassDrive) * .14);
    context.strokeStyle = colorWithAlpha('#ffffff', (bassDrive - .08) * .42);
    context.lineWidth = 1 + bassDrive * 3.3;
    context.beginPath();
    context.arc(0, 0, shockRadius, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

export function drawAuroraGlassMode(context, width, height, data, accent, accent2, time, features) {
  const { bass, middle, high, energy, kick, presence, sparkle, intensity } = audioBands(data, features);
  const ribbons = width < 600 ? 5 : 6;
  const horizon = height * (.5 - kick * .018);
  const bandValues = [bass, middle, high];
  const bandSpeeds = [.105, .155, .225];
  const bandFrequencies = [1.72, 2.65, 4.15];
  const bandDirections = [1, -1, 1];

  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .035 + high * .075));
  ambient.addColorStop(.46, colorWithAlpha(accent, .085 + middle * .14 + energy * .065));
  ambient.addColorStop(.78, colorWithAlpha(accent2, .022 + bass * .055));
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
    const band = ribbon % 3;
    const bandDrive = bandValues[band];
    const direction = bandDirections[band];
    const sample = data[Math.floor((ribbon + .5) / ribbons * data.length)] / 255;
    const layer = Math.floor(ribbon / 3);
    const offset = (band - 1) * height * .075 + (layer - .5) * height * .038;
    const kickInfluence = band === 0 ? kick : 0;
    const amplitude = height * (
      .045
      + bandDrive * ([.16, .115, .085][band])
      + sample * .055
      + kickInfluence * .085
    );
    const thickness = height * (.014 + bandDrive * .02 + presence * .009 + layer * .003);
    const speed = bandSpeeds[band] + energy * .075 + layer * .018;
    const frequency = bandFrequencies[band] + layer * .28;
    const phase = ribbon * 1.18 + band * .62;

    const waveAt = progress => {
      const primary = Math.sin(progress * Math.PI * frequency + time * speed * direction + phase);
      const secondary = Math.sin(
        progress * Math.PI * (frequency * 2.15 + band * .4)
        - time * (speed * .62 + .035) * direction
        + phase * .7
      ) * ([.28, .36, .44][band] + sparkle * (band === 2 ? .12 : .035));
      const transient = band === 0
        ? Math.sin(progress * Math.PI * 3.2 - time * .18 + phase) * kick * .22
        : 0;
      return primary + secondary + transient;
    };

    context.beginPath();
    const points = 48;
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

    const gradient = context.createLinearGradient(0, horizon - amplitude, width, horizon + amplitude);
    gradient.addColorStop(0, colorWithAlpha(ribbon % 2 ? accent : accent2, .02));
    gradient.addColorStop(.22, colorWithAlpha(ribbon % 2 ? accent2 : accent, .14 + bandDrive * .29));
    gradient.addColorStop(.5, colorWithAlpha('#ffffff', .065 + (band === 2 ? high * .2 : bandDrive * .1) + kickInfluence * .08));
    gradient.addColorStop(.78, colorWithAlpha(ribbon % 2 ? accent : accent2, .13 + bandDrive * .24));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = ribbon % 2 ? accent2 : accent;
    context.shadowBlur = 10 + sample * 20 + intensity * 11;
    context.fill();
  }

  if (kick > .04) {
    const attackGlow = context.createLinearGradient(0, horizon - height * .2, 0, horizon + height * .2);
    attackGlow.addColorStop(0, 'rgba(0,0,0,0)');
    attackGlow.addColorStop(.5, colorWithAlpha('#ffffff', kick * .12));
    attackGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = attackGlow;
    context.fillRect(0, horizon - height * .22, width, height * .44);
  }
  context.restore();
}

export function drawWaveCathedralMode(context, width, height, data, accent, accent2, time, features) {
  const centerX = width / 2;
  const baseY = height * .91;
  const minSide = Math.min(width, height);
  const { bass, middle, high, energy, kick, presence, sparkle, intensity } = audioBands(data, features);
  const arches = width < 600 ? 7 : 10;
  const mechanicalDrive = Math.pow(clamp(bass * 1.55 + energy * .48 + kick * 2.2), .6);

  const glow = context.createRadialGradient(centerX, height * .54, 0, centerX, height * .54, minSide * (.58 + intensity * .075));
  glow.addColorStop(0, colorWithAlpha(accent, .105 + middle * .145 + mechanicalDrive * .12));
  glow.addColorStop(.42, colorWithAlpha(accent2, .04 + bass * .09 + energy * .07));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let arch = 0; arch < arches; arch += 1) {
    const progress = arch / Math.max(1, arches - 1);
    const sample = data[Math.floor(progress * (data.length - 1))] / 255;
    const localDrive = clamp(mechanicalDrive * (.82 + (1 - progress) * .24) + sample * .16);
    const span = width * (.115 + progress * .395) * (1 + localDrive * (.075 + progress * .035));
    const peak = height * (.18 + progress * .13)
      + sample * height * .145
      + bass * height * .075
      + localDrive * height * (.095 - progress * .02);
    const apexY = baseY - peak * (1.055 + middle * .105);
    const apexGap = width * (.003 + localDrive * (.025 + (1 - progress) * .024));
    const sway = Math.sin(time * (.12 + arch * .008) + arch * .56) * width * (.003 + presence * .0025);
    const color = arch % 2 ? accent2 : accent;

    context.strokeStyle = colorWithAlpha(color, .085 + sample * .41 + (1 - progress) * .15 + localDrive * .12);
    context.lineWidth = .9 + sample * 2.2 + high * .72 + localDrive * 1.25;
    context.shadowColor = color;
    context.shadowBlur = 7 + sample * 17 + sparkle * 8 + localDrive * 5;

    context.beginPath();
    context.moveTo(centerX - span, baseY);
    context.bezierCurveTo(
      centerX - span * .91 + sway,
      baseY - peak * (.68 + bass * .055),
      centerX - span * .3 - apexGap * .35,
      apexY + peak * .035,
      centerX - apexGap,
      apexY
    );
    context.stroke();

    context.beginPath();
    context.moveTo(centerX + span, baseY);
    context.bezierCurveTo(
      centerX + span * .91 + sway,
      baseY - peak * (.68 + bass * .055),
      centerX + span * .3 + apexGap * .35,
      apexY + peak * .035,
      centerX + apexGap,
      apexY
    );
    context.stroke();
  }

  const columns = width < 600 ? 7 : 9;
  for (let column = 0; column < columns; column += 1) {
    const normalized = (column - (columns - 1) / 2) / ((columns - 1) / 2);
    const distance = Math.abs(normalized);
    const spread = 1 + mechanicalDrive * (.16 + distance * .12);
    const x = centerX + normalized * width * .31 * spread;
    const sample = data[(column * 7) % data.length] / 255;
    const top = height * (.245 + distance * .16 - sample * .09 - high * .04 - mechanicalDrive * .045);
    const gradient = context.createLinearGradient(x, top, x, baseY);
    gradient.addColorStop(0, colorWithAlpha('#ffffff', .2 + high * .25 + mechanicalDrive * .14));
    gradient.addColorStop(.34, colorWithAlpha(column % 2 ? accent2 : accent, .135 + sample * .27 + presence * .07));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = .68 + sample * 1.35 + mechanicalDrive * .65;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, baseY);
    context.stroke();
  }

  if (mechanicalDrive > .12) {
    const floorGlow = context.createLinearGradient(0, baseY - height * .025, width, baseY + height * .025);
    floorGlow.addColorStop(0, 'rgba(0,0,0,0)');
    floorGlow.addColorStop(.5, colorWithAlpha('#ffffff', (mechanicalDrive - .08) * .34));
    floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = floorGlow;
    context.lineWidth = 1.1 + mechanicalDrive * 3.8;
    context.beginPath();
    context.moveTo(width * (.1 - mechanicalDrive * .02), baseY);
    context.lineTo(width * (.9 + mechanicalDrive * .02), baseY);
    context.stroke();
  }
  context.restore();
}
