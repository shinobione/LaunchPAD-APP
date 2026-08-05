import {
  clamp,
  colorWithAlpha,
  drawSoftVignette,
  polygonPath,
  sampleSpectrum,
  seeded
} from './visual-engine-utils.js';

export function drawSpectrumMode({ context, width, height, signal, accent, accent2 }) {
  const spectrum = signal.spectrum;
  const bars = Math.min(spectrum.length, width < 600 ? 64 : 96);
  const gap = Math.max(1.5, width / bars * .28);
  const barWidth = width / bars - gap;
  const gradient = context.createLinearGradient(0, height, width, 0);
  gradient.addColorStop(0, accent);
  gradient.addColorStop(.55, accent2);
  gradient.addColorStop(1, '#ffffff');
  context.fillStyle = gradient;
  context.globalCompositeOperation = 'lighter';

  for (let index = 0; index < bars; index += 1) {
    const value = spectrum[Math.floor(index / bars * spectrum.length)] / 255;
    const shaped = Math.pow(value, .82);
    const barHeight = Math.max(2, shaped * height * .78);
    const x = index / bars * width + gap * .5;
    const y = height - barHeight;
    context.globalAlpha = .32 + shaped * .68;
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = 3 + shaped * 12;
    context.fillRect(x, y, barWidth, barHeight);
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

export function drawNebulaMode({ context, width, height, signal, accent, accent2, time }) {
  const { energy, high } = signal;
  const minSide = Math.min(width, height);
  context.save();
  context.globalCompositeOperation = 'lighter';

  for (let cloud = 0; cloud < 9; cloud += 1) {
    const value = sampleSpectrum(signal, cloud / 9);
    const angle = time * (.025 + cloud * .004) * (cloud % 2 ? -1 : 1) + cloud * 1.7;
    const orbit = minSide * (.1 + cloud * .042);
    const x = width / 2 + Math.cos(angle) * orbit;
    const y = height / 2 + Math.sin(angle * 1.22) * orbit * .66;
    const radius = minSide * (.12 + value * .12 + signal.bands.bass * .025);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colorWithAlpha(cloud % 2 ? accent2 : accent, .1 + value * .28));
    gradient.addColorStop(.55, colorWithAlpha(cloud % 2 ? accent : accent2, .03 + energy * .13));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const stars = width < 520 ? 44 : 72;
  for (let index = 0; index < stars; index += 1) {
    const value = sampleSpectrum(signal, (index % 41) / 41);
    const x = seeded(index, 1) * width;
    const y = seeded(index, 2) * height;
    const size = .45 + value * 2.8 + (index % 13 === 0 ? 1.2 : 0);
    context.globalAlpha = .12 + value * .72 + high * .12;
    context.fillStyle = index % 3 ? accent2 : accent;
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 4 + value * 16;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  drawSoftVignette(context, width, height, .42);
}

export function drawSingularityMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const horizon = minSide * (.1 + bass * .05 + signal.transients.kick * .035);
  const glow = context.createRadialGradient(cx, cy, horizon * .4, cx, cy, minSide * .5);
  glow.addColorStop(0, 'rgba(0,0,0,.98)');
  glow.addColorStop(.22, colorWithAlpha(accent, .15 + bass * .23));
  glow.addColorStop(.56, colorWithAlpha(accent2, .06 + mid * .16));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.rotate(-.16 + Math.sin(time * .12) * .03);
  context.scale(1, .34);
  context.globalCompositeOperation = 'lighter';
  const rings = width < 520 ? 44 : 68;
  for (let index = 0; index < rings; index += 1) {
    const progress = index / rings;
    const value = sampleSpectrum(signal, progress);
    const radius = horizon * 1.28 + progress * minSide * .35;
    const start = time * (.18 + bass * .28) + index * .22;
    context.beginPath();
    context.arc(0, 0, radius, start, start + Math.PI * (1.1 + value * .9));
    context.strokeStyle = colorWithAlpha(index % 3 ? accent : accent2, .035 + value * .4);
    context.lineWidth = .65 + value * 3.5 + signal.transients.kick * .8;
    context.shadowColor = index % 3 ? accent : accent2;
    context.shadowBlur = 8 + value * 20;
    context.stroke();
  }
  context.restore();

  context.fillStyle = '#010103';
  context.shadowColor = colorWithAlpha(accent, .9);
  context.shadowBlur = 20 + bass * 34;
  context.beginPath();
  context.arc(cx, cy, horizon, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;

  const dust = width < 520 ? 54 : 82;
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < dust; index += 1) {
    const value = sampleSpectrum(signal, (index % 53) / 53);
    const progress = (seeded(index, 4) + time * (.018 + value * .04)) % 1;
    const radius = horizon * 1.4 + progress * minSide * .42;
    const angle = seeded(index, 5) * Math.PI * 2 - time * (.22 + bass * .45) - progress * 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * .42;
    context.globalAlpha = .1 + value * .7 + high * .1;
    context.fillStyle = index % 2 ? accent2 : accent;
    context.beginPath();
    context.arc(x, y, .5 + value * 2.4, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
}

export function drawNeonShatterMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const fragments = width < 520 ? 32 : 48;
  const burst = .18 + bass * .72 + signal.transients.kick * .4;

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < fragments; index += 1) {
    const angle = seeded(index, 7) * Math.PI * 2 + Math.sin(time * .17 + index) * .08;
    const value = sampleSpectrum(signal, (index % 37) / 37);
    const distance = minSide * (.06 + seeded(index, 8) * .31 * (burst + .35));
    const spin = time * (index % 2 ? -.22 : .26) + seeded(index, 9) * Math.PI;
    const size = minSide * (.016 + seeded(index, 10) * .047) * (1 + value * .55);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    context.save();
    context.translate(x, y);
    context.rotate(spin);
    context.beginPath();
    context.moveTo(-size * .7, size * .45);
    context.lineTo(size, 0);
    context.lineTo(-size * .25, -size);
    context.closePath();
    context.fillStyle = colorWithAlpha(index % 2 ? accent2 : accent, .06 + value * .3);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent : accent2, .3 + value * .58);
    context.lineWidth = .7 + value * 1.8;
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = 8 + value * 20;
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();

  const core = context.createRadialGradient(cx, cy, 0, cx, cy, minSide * (.18 + bass * .045));
  core.addColorStop(0, colorWithAlpha('#ffffff', .7 + high * .24));
  core.addColorStop(.12, colorWithAlpha(accent, .58));
  core.addColorStop(.42, colorWithAlpha(accent2, .16 + mid * .2));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(cx, cy, minSide * (.18 + bass * .045), 0, Math.PI * 2);
  context.fill();
}

export function drawHyperdriveMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const speed = .12 + bass * 1.05 + mid * .24 + signal.transients.kick * .45;
  const streaks = width < 520 ? 54 : 84;
  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < streaks; index += 1) {
    const phase = (seeded(index, 14) + time * speed * (.21 + seeded(index, 15) * .31)) % 1;
    const angle = seeded(index, 16) * Math.PI * 2;
    const inner = minSide * (.025 + phase * .2);
    const outer = inner + minSide * (.04 + phase * .4 + bass * .14);
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;
    const gradient = context.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, colorWithAlpha(index % 2 ? accent2 : accent, .22 + phase * .68 + high * .12));
    context.strokeStyle = gradient;
    context.lineWidth = .65 + phase * 3 + signal.transients.kick;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }
  for (let ring = 0; ring < 10; ring += 1) {
    const phase = (time * speed * .28 + ring / 10) % 1;
    const radius = minSide * (.04 + phase * .44);
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, (1 - phase) * (.1 + bass * .25));
    context.lineWidth = .8 + (1 - phase) * 2.2;
    context.beginPath();
    context.ellipse(cx, cy, radius, radius * .52, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

export function drawTeslaVeinsMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const branches = width < 520 ? 12 : 18;
  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let branch = 0; branch < branches; branch += 1) {
    const value = sampleSpectrum(signal, branch / branches);
    const angle = branch / branches * Math.PI * 2 + Math.sin(time * .7 + branch) * .07;
    const segments = 9;
    let x = cx;
    let y = cy;
    context.beginPath();
    context.moveTo(x, y);
    for (let segment = 1; segment <= segments; segment += 1) {
      const progress = segment / segments;
      const radius = minSide * progress * (.4 + bass * .09);
      const jitter = (seeded(branch * 20 + segment, Math.floor(time * 7)) - .5)
        * minSide * (.025 + high * .045 + signal.transients.snare * .02);
      x = cx + Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * jitter;
      y = cy + Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * jitter;
      context.lineTo(x, y);
    }
    context.strokeStyle = colorWithAlpha(branch % 2 ? accent2 : accent, .28 + value * .56);
    context.lineWidth = .7 + value * 2 + mid;
    context.shadowColor = branch % 2 ? accent2 : accent;
    context.shadowBlur = 9 + high * 27;
    context.stroke();
  }
  context.restore();
  const core = context.createRadialGradient(cx, cy, 0, cx, cy, minSide * .18);
  core.addColorStop(0, colorWithAlpha('#ffffff', .74));
  core.addColorStop(.18, colorWithAlpha(accent, .66));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(cx, cy, minSide * (.12 + bass * .045), 0, Math.PI * 2);
  context.fill();
}

export function drawLiquidChromeMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, lowMid, mid, high } = signal.bands;
  const kick = signal.transients.kick;
  const snare = signal.transients.snare;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const points = width < 520 ? 92 : 132;
  const violence = clamp(.72 + signal.intensity * .78 + kick * .9, .72, 2.2);
  const baseRadius = minSide * (.2 + bass * .055 + kick * .03);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  for (let halo = 2; halo >= 0; halo -= 1) {
    context.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const progress = index / points;
      const angle = progress * Math.PI * 2;
      const sample = sampleSpectrum(signal, progress);
      const lowWave = Math.sin(angle * 3 + time * (.7 + bass * .7)) * (.026 + lowMid * .06);
      const midWave = Math.sin(angle * 7 - time * (1.05 + mid * .65)) * (.016 + mid * .045);
      const detail = Math.sin(angle * 13 + time * 1.42) * (.006 + high * .022 + snare * .012);
      const pulse = Math.sin(time * 2.1 + angle * 2) * kick * .022;
      const radius = baseRadius + minSide * (sample * .085 * violence + (lowWave + midWave + detail + pulse) * violence);
      const squeeze = .8 + Math.sin(time * .28) * .045 + bass * .035;
      const x = Math.cos(angle) * (radius + halo * minSide * .009);
      const y = Math.sin(angle) * (radius + halo * minSide * .009) * squeeze;
      if (!index) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    if (halo) {
      context.strokeStyle = colorWithAlpha(halo === 2 ? accent2 : accent, .08 + signal.energy * .18);
      context.lineWidth = 4 + halo * 3 + kick * 8;
      context.shadowColor = halo === 2 ? accent2 : accent;
      context.shadowBlur = 18 + bass * 34 + kick * 30;
      context.stroke();
      continue;
    }

    const gradient = context.createLinearGradient(-minSide * .36, -minSide * .34, minSide * .38, minSide * .36);
    gradient.addColorStop(0, colorWithAlpha('#ffffff', .96));
    gradient.addColorStop(.12, colorWithAlpha(accent, .88));
    gradient.addColorStop(.3, colorWithAlpha('#dce8ff', .58));
    gradient.addColorStop(.47, colorWithAlpha('#07070d', .92));
    gradient.addColorStop(.63, colorWithAlpha(accent2, .93));
    gradient.addColorStop(.82, colorWithAlpha('#ffffff', .62));
    gradient.addColorStop(1, colorWithAlpha('#030308', .98));
    context.fillStyle = gradient;
    context.shadowColor = accent;
    context.shadowBlur = 22 + bass * 42 + kick * 26;
    context.fill();
    context.lineWidth = 1.2 + high * 3.6 + snare * 2;
    context.strokeStyle = colorWithAlpha('#ffffff', .42 + high * .45);
    context.stroke();
  }

  const highlights = width < 520 ? 9 : 14;
  for (let index = 0; index < highlights; index += 1) {
    const angle = index / highlights * Math.PI * 2 + time * (index % 2 ? -.16 : .12);
    const sample = sampleSpectrum(signal, index / highlights);
    const distance = baseRadius * (.52 + sample * .32);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * .78;
    context.fillStyle = colorWithAlpha('#ffffff', .1 + high * .45 + sample * .22);
    context.shadowColor = '#ffffff';
    context.shadowBlur = 10 + sample * 20;
    context.beginPath();
    context.ellipse(x, y, 1.5 + sample * 5.5, .6 + sample * 2.2, angle, 0, Math.PI * 2);
    context.fill();
  }

  if (kick > .08) {
    const droplets = 8 + Math.floor(kick * 12);
    for (let index = 0; index < droplets; index += 1) {
      const angle = seeded(index, Math.floor(time * 4)) * Math.PI * 2;
      const distance = baseRadius * (1.15 + seeded(index, 43) * (.4 + kick * .6));
      const radius = minSide * (.003 + seeded(index, 44) * .009) * (1 + kick);
      context.fillStyle = colorWithAlpha(index % 2 ? accent2 : '#ffffff', .14 + kick * .5);
      context.beginPath();
      context.arc(Math.cos(angle) * distance, Math.sin(angle) * distance * .82, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
  drawSoftVignette(context, width, height, .34);
}

export function drawHexReactorMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const size = Math.max(18, Math.min(width, height) * .055);
  const rowHeight = size * 1.5;
  const columns = Math.ceil(width / (size * 1.72)) + 2;
  const rows = Math.ceil(height / rowHeight) + 2;
  context.save();
  context.globalCompositeOperation = 'lighter';
  let cell = 0;
  for (let row = -1; row < rows; row += 1) {
    for (let column = -1; column < columns; column += 1) {
      const x = column * size * 1.72 + (row % 2 ? size * .86 : 0);
      const y = row * rowHeight;
      const value = sampleSpectrum(signal, (cell % 73) / 73);
      const distance = Math.hypot(x - width / 2, y - height / 2) / Math.max(width, height);
      const wave = Math.max(0, 1 - Math.abs((((distance * 2.4 - time * (.25 + bass * .42)) % 1) + 1) % 1 - .5) * 5);
      polygonPath(context, x, y, size * .72, 6, -Math.PI / 6);
      context.strokeStyle = colorWithAlpha(cell % 2 ? accent2 : accent, .045 + value * .14 + wave * (.17 + bass * .32));
      context.lineWidth = .55 + wave * 1.5 + high * .45;
      context.stroke();
      if (wave > .64) {
        context.fillStyle = colorWithAlpha(cell % 2 ? accent : accent2, wave * .06 + mid * .03);
        context.fill();
      }
      cell += 1;
    }
  }
  context.restore();

  for (let ring = 0; ring < 4; ring += 1) {
    polygonPath(context, width / 2, height / 2, size * (1.25 + ring * .68 + bass * .2), 6, -Math.PI / 6 + time * .04 * (ring % 2 ? -1 : 1));
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, .2 + bass * .36 - ring * .03);
    context.lineWidth = 1 + bass * 2.4 + signal.transients.kick;
    context.shadowColor = ring % 2 ? accent2 : accent;
    context.shadowBlur = 10 + bass * 22;
    context.stroke();
  }
  context.shadowBlur = 0;
}
