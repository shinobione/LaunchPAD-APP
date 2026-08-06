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
  const spokes = width < 600 ? 56 : 84;
  const corePulse = 1 + bass * .15 + kick * .34;

  const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minSide * (.44 + intensity * .06));
  glow.addColorStop(0, colorWithAlpha(accent, .2 + bass * .34 + kick * .22));
  glow.addColorStop(.3, colorWithAlpha(accent2, .08 + middle * .2 + energy * .12));
  glow.addColorStop(.68, colorWithAlpha(accent, .02 + high * .08));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(time * (.055 + energy * .17) + kick * .08);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < spokes; index += 1) {
    const sample = data[Math.floor(index / spokes * data.length)] / 255;
    const angle = index / spokes * Math.PI * 2;
    const lowBias = 1 - index / spokes;
    const inner = minSide * (.175 + bass * .028 + kick * .015);
    const length = minSide * (
      .04
      + sample * .19
      + kick * (.045 + lowBias * .055)
      + (index % 4 === 0 ? high * .065 : 0)
    );
    const outer = inner + length * corePulse;
    context.strokeStyle = colorWithAlpha(index % 3 ? accent : accent2, .18 + sample * .76 + high * .08);
    context.lineWidth = .85 + sample * 3.1 + kick * 1.2;
    context.shadowColor = index % 3 ? accent : accent2;
    context.shadowBlur = 5 + sample * 18 + sparkle * 8;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }

  for (let ring = 0; ring < 4; ring += 1) {
    const pulse = Math.sin(time * (1.1 + ring * .16) + ring * 1.4) * .5 + .5;
    const radius = minSide * (.17 + ring * .058 + pulse * .012 + bass * .025 + kick * (.028 - ring * .004));
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, .14 + middle * .3 + kick * .18 - ring * .014);
    context.lineWidth = 1 + (3 - ring) * .28 + bass * 1.7 + kick * 1.8;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }

  if (kick > .035) {
    const shockRadius = minSide * (.25 + (1 - kick) * .12);
    context.strokeStyle = colorWithAlpha('#ffffff', kick * .36);
    context.lineWidth = 1 + kick * 3;
    context.beginPath();
    context.arc(0, 0, shockRadius, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

export function drawAuroraGlassMode(context, width, height, data, accent, accent2, time, features) {
  const { bass, middle, high, energy, kick, presence, sparkle, intensity } = audioBands(data, features);
  const ribbons = width < 600 ? 7 : 10;
  const horizon = height * (.49 + Math.sin(time * .13) * .028 - kick * .028);

  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .04 + high * .09 + kick * .06));
  ambient.addColorStop(.46, colorWithAlpha(accent, .1 + middle * .18 + energy * .08));
  ambient.addColorStop(.78, colorWithAlpha(accent2, .025 + bass * .07));
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
    const sample = data[Math.floor(ribbon / ribbons * data.length)] / 255;
    const offset = (ribbon - (ribbons - 1) / 2) * height * .05;
    const amplitude = height * (.06 + sample * .17 + bass * .075 + kick * .085);
    const thickness = height * (.019 + middle * .045 + presence * .018 + (ribbon % 3) * .004);
    const speed = .34 + ribbon * .04 + energy * .5 + kick * .3;
    context.beginPath();
    const points = 56;
    for (let point = 0; point <= points; point += 1) {
      const progress = point / points;
      const x = progress * width;
      const wave = Math.sin(progress * Math.PI * (2.35 + ribbon * .13) + time * speed)
        + Math.sin(progress * Math.PI * 5.6 - time * (.24 + high * .3) + ribbon) * (.34 + sparkle * .18)
        + Math.sin(progress * Math.PI * 10.4 + time * .9 + ribbon * .4) * kick * .16;
      const y = horizon + offset + wave * amplitude;
      if (!point) context.moveTo(x, y - thickness); else context.lineTo(x, y - thickness);
    }
    for (let point = points; point >= 0; point -= 1) {
      const progress = point / points;
      const x = progress * width;
      const wave = Math.sin(progress * Math.PI * (2.35 + ribbon * .13) + time * speed)
        + Math.sin(progress * Math.PI * 5.6 - time * (.24 + high * .3) + ribbon) * (.34 + sparkle * .18)
        + Math.sin(progress * Math.PI * 10.4 + time * .9 + ribbon * .4) * kick * .16;
      const y = horizon + offset + wave * amplitude;
      context.lineTo(x, y + thickness);
    }
    context.closePath();
    const gradient = context.createLinearGradient(0, horizon - amplitude, width, horizon + amplitude);
    gradient.addColorStop(0, colorWithAlpha(ribbon % 2 ? accent : accent2, .025));
    gradient.addColorStop(.25, colorWithAlpha(ribbon % 2 ? accent2 : accent, .19 + sample * .27 + kick * .12));
    gradient.addColorStop(.52, colorWithAlpha('#ffffff', .09 + high * .23 + kick * .12));
    gradient.addColorStop(.78, colorWithAlpha(ribbon % 2 ? accent : accent2, .16 + middle * .24));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = ribbon % 2 ? accent2 : accent;
    context.shadowBlur = 16 + sample * 30 + intensity * 18;
    context.fill();
  }

  if (kick > .03) {
    const attackGlow = context.createLinearGradient(0, horizon - height * .22, 0, horizon + height * .22);
    attackGlow.addColorStop(0, 'rgba(0,0,0,0)');
    attackGlow.addColorStop(.5, colorWithAlpha('#ffffff', kick * .18));
    attackGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = attackGlow;
    context.fillRect(0, horizon - height * .24, width, height * .48);
  }
  context.restore();
}

export function drawWaveCathedralMode(context, width, height, data, accent, accent2, time, features) {
  const centerX = width / 2;
  const baseY = height * .91;
  const minSide = Math.min(width, height);
  const { bass, middle, high, energy, kick, presence, sparkle, intensity } = audioBands(data, features);
  const arches = width < 600 ? 11 : 16;

  const glow = context.createRadialGradient(centerX, height * .54, 0, centerX, height * .54, minSide * (.6 + intensity * .08));
  glow.addColorStop(0, colorWithAlpha(accent, .11 + middle * .16 + kick * .12));
  glow.addColorStop(.42, colorWithAlpha(accent2, .045 + bass * .1 + energy * .08));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let arch = 0; arch < arches; arch += 1) {
    const progress = arch / Math.max(1, arches - 1);
    const sample = data[Math.floor(progress * (data.length - 1))] / 255;
    const span = width * (.1 + progress * .405 + kick * .016);
    const peak = height * (.17 + progress * .135)
      + sample * height * .2
      + bass * height * .09
      + kick * height * (.13 - progress * .035);
    const sway = Math.sin(time * (.25 + energy * .3 + arch * .012) + arch * .6) * width * (.009 + presence * .006);
    context.beginPath();
    context.moveTo(centerX - span, baseY);
    context.bezierCurveTo(
      centerX - span * .92 + sway,
      baseY - peak * (.72 + bass * .08),
      centerX - span * .28,
      baseY - peak,
      centerX,
      baseY - peak * (1.08 + middle * .13 + kick * .08)
    );
    context.bezierCurveTo(
      centerX + span * .28,
      baseY - peak,
      centerX + span * .92 + sway,
      baseY - peak * (.72 + bass * .08),
      centerX + span,
      baseY
    );
    const color = arch % 2 ? accent2 : accent;
    context.strokeStyle = colorWithAlpha(color, .07 + sample * .42 + (1 - progress) * .14 + kick * .11);
    context.lineWidth = .8 + sample * 2.4 + high * .85 + kick * 1.15;
    context.shadowColor = color;
    context.shadowBlur = 7 + sample * 19 + sparkle * 9;
    context.stroke();
  }

  const columns = width < 600 ? 9 : 13;
  for (let column = 0; column < columns; column += 1) {
    const distance = Math.abs(column - (columns - 1) / 2) / ((columns - 1) / 2);
    const x = centerX + (column - (columns - 1) / 2) * width * .066;
    const sample = data[(column * 5) % data.length] / 255;
    const top = height * (.23 + distance * .17 - sample * .12 - high * .055 - kick * .035);
    const gradient = context.createLinearGradient(x, top, x, baseY);
    gradient.addColorStop(0, colorWithAlpha('#ffffff', .24 + high * .3 + kick * .13));
    gradient.addColorStop(.34, colorWithAlpha(column % 2 ? accent2 : accent, .15 + sample * .3 + presence * .09));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = .7 + sample * 1.55 + kick * .7;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, baseY);
    context.stroke();
  }

  if (kick > .025) {
    const floorGlow = context.createLinearGradient(0, baseY - height * .025, width, baseY + height * .025);
    floorGlow.addColorStop(0, 'rgba(0,0,0,0)');
    floorGlow.addColorStop(.5, colorWithAlpha('#ffffff', kick * .35));
    floorGlow.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = floorGlow;
    context.lineWidth = 1.2 + kick * 4;
    context.beginPath();
    context.moveTo(width * .08, baseY);
    context.lineTo(width * .92, baseY);
    context.stroke();
  }
  context.restore();
}
