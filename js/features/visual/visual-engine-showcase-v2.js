import {
  colorWithAlpha,
  drawSoftVignette,
  polygonPath,
  sampleSpectrum,
  seeded
} from './visual-engine-utils.js';

export function drawOrbitMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const spokes = width < 600 ? 56 : 82;

  const glow = context.createRadialGradient(cx, cy, 0, cx, cy, minSide * .46);
  glow.addColorStop(0, colorWithAlpha(accent, .15 + bass * .23));
  glow.addColorStop(.34, colorWithAlpha(accent2, .055 + mid * .14));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.rotate(time * (.06 + bass * .045));
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < spokes; index += 1) {
    const progress = index / spokes;
    const sample = sampleSpectrum(signal, progress);
    const angle = progress * Math.PI * 2;
    const inner = minSide * (.175 + bass * .03);
    const outer = inner + minSide * (.025 + sample * .19 + signal.transients.kick * .035);
    context.strokeStyle = colorWithAlpha(index % 3 ? accent : accent2, .12 + sample * .76);
    context.lineWidth = .7 + sample * 3.2;
    context.shadowColor = index % 3 ? accent : accent2;
    context.shadowBlur = 4 + sample * 18;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }

  for (let ring = 0; ring < 5; ring += 1) {
    const pulse = Math.sin(time * (1.15 + ring * .16) + ring * 1.35) * .5 + .5;
    const radius = minSide * (.16 + ring * .048 + pulse * .013 + bass * .024);
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, .1 + mid * .28 - ring * .01);
    context.lineWidth = .8 + (4 - ring) * .24 + bass * 1.7;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
  drawSoftVignette(context, width, height, .38);
}

export function drawWaveCathedralMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, lowMid, mid, high } = signal.bands;
  const cx = width / 2;
  const baseY = height * .9;
  const minSide = Math.min(width, height);
  const arches = width < 600 ? 15 : 23;

  const ambient = context.createRadialGradient(cx, height * .64, 0, cx, height * .64, minSide * .62);
  ambient.addColorStop(0, colorWithAlpha(accent, .09 + lowMid * .12));
  ambient.addColorStop(.42, colorWithAlpha(accent2, .04 + mid * .08));
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let index = 0; index < arches; index += 1) {
    const progress = index / Math.max(1, arches - 1);
    const depth = Math.pow(progress, 1.55);
    const sample = sampleSpectrum(signal, progress);
    const halfWidth = minSide * (.08 + depth * .43);
    const topY = height * (.12 + depth * .24 - sample * .045);
    const color = index % 2 ? accent2 : accent;
    context.strokeStyle = colorWithAlpha(color, .05 + sample * .38 + (1 - progress) * .15);
    context.lineWidth = .65 + sample * 2.2 + high * .65;
    context.shadowColor = color;
    context.shadowBlur = 6 + sample * 17;
    context.beginPath();
    context.moveTo(cx - halfWidth, baseY);
    context.bezierCurveTo(
      cx - halfWidth * .92,
      height * (.42 - bass * .035),
      cx - halfWidth * .34,
      topY,
      cx,
      topY
    );
    context.bezierCurveTo(
      cx + halfWidth * .34,
      topY,
      cx + halfWidth * .92,
      height * (.42 - bass * .035),
      cx + halfWidth,
      baseY
    );
    context.stroke();
  }

  const columns = width < 600 ? 9 : 13;
  for (let column = 0; column < columns; column += 1) {
    const distance = Math.abs(column - (columns - 1) / 2) / ((columns - 1) / 2);
    const x = cx + (column - (columns - 1) / 2) * width * .065;
    const sample = sampleSpectrum(signal, (column + 1) / (columns + 1));
    const top = height * (.22 + distance * .17 - sample * .1);
    const gradient = context.createLinearGradient(x, top, x, baseY);
    gradient.addColorStop(0, colorWithAlpha('#ffffff', .18 + high * .2));
    gradient.addColorStop(.35, colorWithAlpha(column % 2 ? accent2 : accent, .12 + sample * .3));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = .55 + sample * 1.5;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, baseY);
    context.stroke();
  }
  context.restore();
  drawSoftVignette(context, width, height, .46);
}

export function drawPrismTunnelMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const kick = signal.transients.kick;
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const layers = width < 600 ? 28 : 42;
  const speed = .08 + bass * .18 + kick * .14;

  const backdrop = context.createRadialGradient(cx, cy, 0, cx, cy, minSide * .68);
  backdrop.addColorStop(0, colorWithAlpha('#ffffff', .025 + high * .045));
  backdrop.addColorStop(.22, colorWithAlpha(accent2, .1 + mid * .11));
  backdrop.addColorStop(.55, colorWithAlpha(accent, .04 + bass * .08));
  backdrop.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = backdrop;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let layer = layers - 1; layer >= 0; layer -= 1) {
    const phase = (layer / layers + time * speed) % 1;
    const depth = Math.pow(phase, 1.75);
    const sample = sampleSpectrum(signal, phase);
    const radius = minSide * (.035 + depth * .59 + kick * .018 * (1 - phase));
    const sides = layer % 4 === 0 ? 3 : layer % 4 === 1 ? 4 : layer % 4 === 2 ? 6 : 8;
    const rotation = time * (layer % 2 ? -.17 : .14) + phase * 2.15 + bass * .2;
    const squeeze = .56 + mid * .1 + Math.sin(time * .2) * .02;
    polygonPath(context, cx, cy, radius, sides, rotation, squeeze);
    const color = layer % 2 ? accent2 : accent;
    context.strokeStyle = colorWithAlpha(color, .045 + (1 - phase) * .42 + sample * .32);
    context.lineWidth = .65 + sample * 2.8 + high * .9 + kick * .8;
    context.shadowColor = color;
    context.shadowBlur = 5 + sample * 18 + kick * 10;
    context.stroke();
  }

  const rays = width < 600 ? 12 : 18;
  for (let ray = 0; ray < rays; ray += 1) {
    const angle = ray / rays * Math.PI * 2 + time * (.035 + bass * .02);
    const inner = minSide * (.035 + bass * .025);
    const outer = minSide * (.58 + kick * .04);
    const gradient = context.createLinearGradient(
      cx + Math.cos(angle) * inner,
      cy + Math.sin(angle) * inner * .58,
      cx + Math.cos(angle) * outer,
      cy + Math.sin(angle) * outer * .58
    );
    gradient.addColorStop(0, colorWithAlpha(ray % 2 ? accent2 : '#ffffff', .3 + high * .28));
    gradient.addColorStop(.3, colorWithAlpha(ray % 2 ? accent : accent2, .12 + mid * .16));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.strokeStyle = gradient;
    context.lineWidth = .5 + high * 1.15;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner * .58);
    context.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer * .58);
    context.stroke();
  }

  const core = context.createRadialGradient(cx, cy, 0, cx, cy, minSide * (.11 + kick * .025));
  core.addColorStop(0, colorWithAlpha('#ffffff', .65 + high * .24));
  core.addColorStop(.2, colorWithAlpha(accent2, .42 + mid * .2));
  core.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(cx, cy, minSide * (.11 + kick * .025), 0, Math.PI * 2);
  context.fill();
  context.restore();
  drawSoftVignette(context, width, height, .48);
}

export function drawAuroraGlassMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const ribbons = width < 600 ? 7 : 10;
  const horizon = height * (.48 + Math.sin(time * .13) * .025);
  const ambient = context.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, colorWithAlpha(accent2, .03 + high * .05));
  ambient.addColorStop(.5, colorWithAlpha(accent, .07 + mid * .1));
  ambient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
    const sample = sampleSpectrum(signal, ribbon / ribbons);
    const offset = (ribbon - (ribbons - 1) / 2) * height * .043;
    const amplitude = height * (.05 + sample * .145 + bass * .04);
    const thickness = height * (.015 + mid * .028 + (ribbon % 3) * .004);
    context.beginPath();
    const points = 56;
    for (let point = 0; point <= points; point += 1) {
      const progress = point / points;
      const x = progress * width;
      const wave = Math.sin(progress * Math.PI * (2.2 + ribbon * .12) + time * (.32 + ribbon * .035))
        + Math.sin(progress * Math.PI * 5.2 - time * .21 + ribbon) * .34;
      const y = horizon + offset + wave * amplitude;
      if (!point) context.moveTo(x, y - thickness);
      else context.lineTo(x, y - thickness);
    }
    for (let point = points; point >= 0; point -= 1) {
      const progress = point / points;
      const x = progress * width;
      const wave = Math.sin(progress * Math.PI * (2.2 + ribbon * .12) + time * (.32 + ribbon * .035))
        + Math.sin(progress * Math.PI * 5.2 - time * .21 + ribbon) * .34;
      const y = horizon + offset + wave * amplitude;
      context.lineTo(x, y + thickness);
    }
    context.closePath();
    const gradient = context.createLinearGradient(0, horizon - amplitude, width, horizon + amplitude);
    gradient.addColorStop(0, colorWithAlpha(ribbon % 2 ? accent : accent2, .015));
    gradient.addColorStop(.28, colorWithAlpha(ribbon % 2 ? accent2 : accent, .15 + sample * .24));
    gradient.addColorStop(.55, colorWithAlpha('#ffffff', .07 + high * .14));
    gradient.addColorStop(.78, colorWithAlpha(ribbon % 2 ? accent : accent2, .13 + mid * .2));
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.shadowColor = ribbon % 2 ? accent2 : accent;
    context.shadowBlur = 14 + sample * 28;
    context.fill();
  }
  context.restore();
  drawSoftVignette(context, width, height, .34);
}

export function drawCyberRainMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const kick = signal.transients.kick;
  const columns = width < 600 ? 34 : 58;
  const columnWidth = width / columns;
  const horizon = height * .19;

  const wash = context.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, colorWithAlpha(accent2, .055 + high * .04));
  wash.addColorStop(.45, 'rgba(0,0,0,0)');
  wash.addColorStop(1, colorWithAlpha(accent, .07 + bass * .07));
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let column = 0; column < columns; column += 1) {
    const progress = column / columns;
    const sample = sampleSpectrum(signal, progress);
    const lane = progress * 2 - 1;
    const depth = .35 + seeded(column, 5) * .65;
    const speed = .11 + seeded(column, 4) * .22 + bass * .18 + kick * .1;
    const phase = (seeded(column, 6) + time * speed) % 1.18;
    const headY = horizon + phase * (height - horizon) * 1.12;
    const perspectiveX = width / 2 + lane * width * (.18 + phase * .42);
    const lean = lane * width * .025 + Math.sin(time * .35 + column) * 2.2;
    const trail = height * (.08 + sample * .24 + depth * .08);
    const tailX = perspectiveX - lean;
    const tailY = headY - trail;
    const gradient = context.createLinearGradient(tailX, tailY, perspectiveX, headY);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(.55, colorWithAlpha(column % 3 ? accent2 : accent, .08 + sample * .28));
    gradient.addColorStop(.88, colorWithAlpha(column % 2 ? accent : accent2, .18 + sample * .44));
    gradient.addColorStop(1, colorWithAlpha('#ffffff', .48 + high * .38));
    context.strokeStyle = gradient;
    context.lineWidth = .65 + sample * 1.85 + phase * .8;
    context.shadowColor = column % 3 ? accent2 : accent;
    context.shadowBlur = 4 + sample * 14 + kick * 8;
    context.beginPath();
    context.moveTo(tailX, tailY);
    context.lineTo(perspectiveX, headY);
    context.stroke();

    const glyphs = 2 + Math.floor(sample * 6);
    for (let glyph = 0; glyph < glyphs; glyph += 1) {
      const ratio = (glyph + 1) / (glyphs + 1);
      const x = tailX + (perspectiveX - tailX) * ratio;
      const y = tailY + (headY - tailY) * ratio;
      const size = 1 + mid * 2.6 + seeded(column * 10 + glyph, 7) * 2.8;
      context.fillStyle = colorWithAlpha(column % 2 ? accent : accent2, .09 + sample * .34);
      context.fillRect(x - size * .5, y, size, 1 + high * 1.6);
    }
  }

  const rings = 7;
  for (let ring = 0; ring < rings; ring += 1) {
    const phase = (time * (.18 + bass * .16) + ring / rings) % 1;
    const radius = Math.min(width, height) * (.04 + phase * .5);
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, (1 - phase) * (.08 + kick * .18));
    context.lineWidth = .55 + (1 - phase) * 1.4;
    context.beginPath();
    context.ellipse(width / 2, height * .73, radius, radius * .18, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
  drawSoftVignette(context, width, height, .52);
}

export function drawQuantumGridMode({ context, width, height, signal, accent, accent2, time }) {
  const { bass, mid, high } = signal.bands;
  const kick = signal.transients.kick;
  const horizon = height * .47;
  const cx = width / 2;
  const groundHeight = height - horizon;

  const sky = context.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, colorWithAlpha(accent2, .02 + high * .025));
  sky.addColorStop(1, colorWithAlpha(accent, .1 + mid * .08));
  context.fillStyle = sky;
  context.fillRect(0, 0, width, horizon);

  const ground = context.createLinearGradient(0, horizon, 0, height);
  ground.addColorStop(0, colorWithAlpha(accent, .07 + bass * .06));
  ground.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = ground;
  context.fillRect(0, horizon, width, groundHeight);

  context.save();
  context.globalCompositeOperation = 'lighter';
  const horizonGlow = context.createLinearGradient(0, horizon - 2, width, horizon + 2);
  horizonGlow.addColorStop(0, 'rgba(0,0,0,0)');
  horizonGlow.addColorStop(.3, colorWithAlpha(accent2, .3 + high * .2));
  horizonGlow.addColorStop(.5, colorWithAlpha('#ffffff', .5 + high * .26));
  horizonGlow.addColorStop(.7, colorWithAlpha(accent, .3 + high * .2));
  horizonGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.strokeStyle = horizonGlow;
  context.lineWidth = 1.2 + high * 1.7;
  context.beginPath();
  context.moveTo(0, horizon);
  context.lineTo(width, horizon);
  context.stroke();

  const verticals = width < 600 ? 17 : 27;
  for (let line = 0; line < verticals; line += 1) {
    const ratio = line / (verticals - 1) * 2 - 1;
    const sample = sampleSpectrum(signal, line / verticals);
    const targetX = cx + ratio * width * (.68 + bass * .05);
    context.strokeStyle = colorWithAlpha(line % 2 ? accent2 : accent, .07 + sample * .24);
    context.lineWidth = .5 + sample * .95;
    context.beginPath();
    context.moveTo(cx + ratio * width * .012, horizon);
    const bend = Math.sin(time * .38 + line * .7) * width * .008 * (1 + mid);
    context.quadraticCurveTo(cx + ratio * width * .28 + bend, height * .72, targetX, height);
    context.stroke();
  }

  const rows = 20;
  for (let row = 0; row < rows; row += 1) {
    const phase = (row / rows + time * (.055 + bass * .06 + kick * .035)) % 1;
    const perspective = Math.pow(phase, 2.15);
    const y = horizon + perspective * groundHeight;
    const sample = sampleSpectrum(signal, phase);
    const ripple = Math.sin(time * 1.15 + phase * 12) * (bass + kick) * height * .014;
    const inset = (1 - perspective) * width * .46;
    context.strokeStyle = colorWithAlpha(row % 2 ? accent2 : accent, .06 + perspective * .3 + sample * .16);
    context.lineWidth = .45 + perspective * 1.5 + high * .45;
    context.beginPath();
    context.moveTo(inset, y + ripple);
    context.quadraticCurveTo(cx, y - (bass + kick) * height * .035, width - inset, y + ripple);
    context.stroke();
  }

  const nodes = width < 600 ? 22 : 34;
  for (let index = 0; index < nodes; index += 1) {
    const lane = seeded(index, 20) * 2 - 1;
    const phase = (seeded(index, 21) + time * (.025 + bass * .045)) % 1;
    const perspective = Math.pow(phase, 2.1);
    const x = cx + lane * width * (.03 + perspective * .64);
    const y = horizon + perspective * groundHeight;
    const sample = sampleSpectrum(signal, seeded(index, 22));
    const radius = .65 + perspective * 2.2 + sample * 2.4 + kick * 1.5;
    context.fillStyle = colorWithAlpha(index % 2 ? accent2 : accent, .14 + sample * .55);
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = 5 + sample * 16;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
  drawSoftVignette(context, width, height, .5);
}
