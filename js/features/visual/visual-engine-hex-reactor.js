const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

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

function average(data, start, end) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  let total = 0;
  for (let index = from; index < to; index += 1) total += data[index];
  return total / Math.max(1, to - from) / 255;
}

function readFeatures(data, features = {}) {
  return {
    bass: features.bass ?? average(data, 0, data.length * .16),
    mid: features.mid ?? average(data, data.length * .16, data.length * .58),
    high: features.high ?? average(data, data.length * .58, data.length),
    energy: features.energy ?? average(data, 0, data.length),
    kick: features.kick ?? 0,
    intensity: features.intensity ?? 0
  };
}

function hexPath(context, x, y, radius, rotation = 0) {
  context.beginPath();
  for (let side = 0; side < 6; side += 1) {
    const angle = Math.PI / 3 * side - Math.PI / 6 + rotation;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (!side) context.moveTo(pointX, pointY); else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

export function drawHexReactorMode(context, width, height, data, accent, accent2, time, features) {
  const { bass, mid, high, energy, kick, intensity } = readFeatures(data, features);
  const minSide = Math.min(width, height);
  const beatDrive = Math.pow(clamp(bass * 1.55 + kick * 2.15 + energy * .38), .62);
  const motionDrive = clamp(energy * .8 + mid * .45 + beatDrive * .32);
  const size = Math.max(24, minSide * .068);
  const horizontalStep = size * 1.84;
  const rowHeight = size * 1.62;
  const columns = Math.ceil(width / horizontalStep) + 3;
  const rows = Math.ceil(height / rowHeight) + 3;
  const centerX = width / 2;
  const centerY = height / 2;
  const travel = time * (.145 + motionDrive * .19);

  const backgroundGlow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, minSide * (.48 + intensity * .05));
  backgroundGlow.addColorStop(0, colorWithAlpha(accent, .075 + energy * .11 + beatDrive * .08));
  backgroundGlow.addColorStop(.5, colorWithAlpha(accent2, .025 + mid * .045));
  backgroundGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = backgroundGlow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  let cell = 0;
  for (let row = -2; row < rows; row += 1) {
    for (let column = -2; column < columns; column += 1) {
      const x = column * horizontalStep + (row % 2 ? horizontalStep * .5 : 0);
      const y = row * rowHeight;
      const sample = data[cell % data.length] / 255;
      const normalizedDistance = Math.hypot(x - centerX, y - centerY) / Math.max(width, height);
      const radialPhase = ((normalizedDistance * 2.18 - travel + 3) % 1);
      const counterPhase = ((normalizedDistance * 1.42 + travel * .72 + row * .025 + 3) % 1);
      const front = Math.max(0, 1 - Math.abs(radialPhase - .5) * 5.1);
      const counterFront = Math.max(0, 1 - Math.abs(counterPhase - .5) * 6.4);
      const hierarchy = Math.max(0, 1 - normalizedDistance * 2.35);
      const pulse = clamp(front * .82 + counterFront * .42 + sample * .3 + beatDrive * hierarchy * .65);
      const radius = size * (.57 + hierarchy * .08 + pulse * .085 + beatDrive * .035);
      const rotation = (row % 2 ? -1 : 1) * time * (.018 + energy * .035) + pulse * .055;

      hexPath(context, x, y, radius, rotation);
      context.strokeStyle = colorWithAlpha(
        cell % 2 ? accent2 : accent,
        .035 + sample * .09 + hierarchy * .105 + front * (.13 + bass * .14) + counterFront * .055
      );
      context.lineWidth = .58 + hierarchy * .42 + pulse * .92 + high * .28;
      context.shadowColor = cell % 2 ? accent2 : accent;
      context.shadowBlur = 2 + pulse * 7 + beatDrive * hierarchy * 5;
      context.stroke();

      if (pulse > .48 && hierarchy > .04) {
        context.fillStyle = colorWithAlpha(
          cell % 2 ? accent : accent2,
          (pulse - .42) * (.055 + hierarchy * .055) + mid * .012
        );
        context.fill();
      }
      cell += 1;
    }
  }
  context.restore();

  const coreRadius = size * (1.18 + beatDrive * .34);
  const coreGlow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 4.4);
  coreGlow.addColorStop(0, colorWithAlpha('#ffffff', .18 + beatDrive * .24));
  coreGlow.addColorStop(.18, colorWithAlpha(accent, .2 + bass * .2));
  coreGlow.addColorStop(.48, colorWithAlpha(accent2, .08 + energy * .09));
  coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = coreGlow;
  context.fillRect(centerX - coreRadius * 4.4, centerY - coreRadius * 4.4, coreRadius * 8.8, coreRadius * 8.8);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ring = 0; ring < 4; ring += 1) {
    const ringPulse = Math.sin(time * (.42 + ring * .07) * (ring % 2 ? -1 : 1) + ring * 1.3) * .5 + .5;
    const ringRadius = size * (1.18 + ring * .82 + beatDrive * (.34 - ring * .035) + ringPulse * .08);
    const ringRotation = time * (.075 + energy * .11) * (ring % 2 ? -1 : 1) + ring * .22;
    hexPath(context, centerX, centerY, ringRadius, ringRotation);
    context.strokeStyle = colorWithAlpha(
      ring % 2 ? accent2 : accent,
      .28 + bass * .27 + beatDrive * .2 - ring * .045
    );
    context.lineWidth = 1.15 + beatDrive * 1.75 + (3 - ring) * .12;
    context.shadowColor = ring % 2 ? accent2 : accent;
    context.shadowBlur = 10 + beatDrive * 23 - ring * 1.4;
    context.stroke();
  }

  if (beatDrive > .18) {
    const shockRadius = size * (4.5 + (1 - beatDrive) * 2.2);
    hexPath(context, centerX, centerY, shockRadius, time * .035);
    context.strokeStyle = colorWithAlpha('#ffffff', (beatDrive - .12) * .22);
    context.lineWidth = 1 + beatDrive * 2.4;
    context.shadowBlur = 0;
    context.stroke();
  }
  context.restore();
}
