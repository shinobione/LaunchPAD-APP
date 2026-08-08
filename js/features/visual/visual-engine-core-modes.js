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

function average(data, start, end) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  let total = 0;
  for (let index = from; index < to; index += 1) total += data[index] || 0;
  return total / Math.max(1, to - from) / 255;
}

function feature(features, name) {
  const value = Number(features?.[name]);
  return Number.isFinite(value) ? clamp(value) : 0;
}

function reactiveBands(data, features = {}) {
  const rawBass = average(data, 0, data.length * .16);
  const rawMid = average(data, data.length * .16, data.length * .58);
  const rawHigh = average(data, data.length * .58, data.length);
  const rawEnergy = average(data, 0, data.length);
  let rawPeak = 0;
  for (let index = 0; index < data.length; index += 1) rawPeak = Math.max(rawPeak, (data[index] || 0) / 255);

  const bass = clamp(Math.max(feature(features, 'bass'), Math.pow(rawBass, .72) * 1.3));
  const mid = clamp(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.2));
  const high = clamp(Math.max(feature(features, 'high'), Math.pow(rawHigh, .72) * 1.28));
  const energy = clamp(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .76) * 1.22));
  const peak = clamp(Math.max(feature(features, 'peak'), rawPeak));
  const kick = clamp(feature(features, 'kick'));
  const rms = clamp(Math.max(feature(features, 'rms'), energy * .88));
  const dynamics = clamp(Math.max(
    feature(features, 'dynamics'),
    Math.abs(bass - mid) * .72 + Math.abs(mid - high) * .45 + kick * .55
  ));

  return { bass, mid, high, energy, peak, kick, rms, dynamics };
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function sampleAt(data, progress) {
  if (!data?.length) return 0;
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(progress * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function localDelta(data, progress, spread = 3) {
  if (!data?.length) return 0;
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

export function drawNeonShatterV2Mode(context, width, height, data, accent, accent2, time, features = {}) {
  const { bass, mid, high, energy, peak, kick, rms, dynamics } = reactiveBands(data, features);
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const shardCount = mobile ? 30 : 62;
  const crackCount = mobile ? 12 : 22;
  const impact = clamp(Math.pow(bass, .64) * .72 + kick * 1.08 + dynamics * .48 + peak * .28);
  const activity = clamp(Math.pow(energy, .7) * .7 + rms * .5 + high * .2);
  const gatedDrift = time * activity * .16;

  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, minSide * .62);
  atmosphere.addColorStop(0, colorWithAlpha(accent, .08 + impact * .18));
  atmosphere.addColorStop(.28, colorWithAlpha(accent2, .025 + energy * .08));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  for (let index = 0; index < shardCount; index += 1) {
    const progress = (index + .5) / shardCount;
    const spectral = Math.pow(sampleAt(data, progress), .58);
    const delta = localDelta(data, progress, 3);
    const lowWeight = Math.pow(1 - progress, 2.4);
    const highWeight = Math.pow(progress, 1.4);
    const localDrive = clamp(
      spectral * .82
      + lowWeight * (bass * .55 + kick * .85)
      + highWeight * high * .48
      + Math.abs(delta) * .45
    );
    const baseAngle = seeded(index, 7) * Math.PI * 2;
    const direction = index % 2 ? -1 : 1;
    const angle = baseAngle
      + direction * (mid * .13 + localDrive * .16 + delta * .18)
      + Math.sin(gatedDrift + index * .73) * activity * .025;
    const depth = .62 + seeded(index, 31) * .72;
    const baseDistance = minSide * (.075 + seeded(index, 8) * .31) * depth;
    const distance = baseDistance * (.58 + impact * 1.48 + localDrive * .92);
    const tangentialKick = direction * minSide * (kick * .018 + delta * .025);
    const x = Math.cos(angle) * distance + Math.cos(baseAngle + Math.PI / 2) * tangentialKick;
    const y = Math.sin(angle) * distance * (.76 + depth * .12) + Math.sin(baseAngle + Math.PI / 2) * tangentialKick;
    const size = minSide * (.012 + seeded(index, 10) * .032)
      * (.72 + localDrive * 1.15 + impact * .62)
      * (.78 + depth * .3);
    const spin = seeded(index, 9) * Math.PI
      + direction * (localDrive * .9 + mid * .38 + high * .24)
      + Math.sin(gatedDrift * .7 + index) * activity * .08;

    context.save();
    context.translate(x, y);
    context.rotate(spin);
    context.beginPath();
    context.moveTo(-size * .78, size * .48);
    context.lineTo(size * 1.08, size * .08);
    context.lineTo(size * .14, -size * 1.05);
    context.lineTo(-size * .38, -size * .38);
    context.closePath();
    context.fillStyle = colorWithAlpha(index % 2 ? accent2 : accent, .025 + localDrive * .22 + impact * .075);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent : accent2, .2 + localDrive * .66 + impact * .2);
    context.lineWidth = .55 + localDrive * 2.15 + high * .72 + impact * .55;
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = mobile ? 2 + localDrive * 8 + impact * 5 : 5 + localDrive * 20 + impact * 15;
    context.fill();
    context.stroke();
    context.restore();
  }
  context.restore();

  const coreRadius = minSide * (.07 + bass * .06 + kick * .09 + peak * .035);
  const coreGlow = context.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 2.5);
  coreGlow.addColorStop(0, colorWithAlpha('#ffffff', .68 + high * .24));
  coreGlow.addColorStop(.12, colorWithAlpha(accent, .58 + impact * .35));
  coreGlow.addColorStop(.42, colorWithAlpha(accent2, .14 + mid * .2));
  coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = coreGlow;
  context.beginPath();
  context.arc(cx, cy, coreRadius * 2.5, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.globalCompositeOperation = 'lighter';
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = minSide * (.09 + ring * .055 + impact * (.07 + ring * .025));
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(ring % 2 ? accent2 : accent, .06 + impact * (.22 - ring * .045) + high * .08);
    context.lineWidth = .65 + impact * 1.45;
    context.stroke();
  }

  for (let index = 0; index < crackCount; index += 1) {
    const progress = (index + .5) / crackCount;
    const spectral = Math.pow(sampleAt(data, progress), .62);
    const delta = localDelta(data, progress, 4);
    const highDrive = clamp(spectral * .7 + high * .58 + kick * .35 + Math.abs(delta) * .55);
    const angle = index / crackCount * Math.PI * 2 + delta * .22 + mid * .035 * (index % 2 ? -1 : 1);
    const startRadius = coreRadius * (.62 + seeded(index, 16) * .42);
    const length = minSide * (.16 + seeded(index, 12) * .19 + highDrive * .22 + impact * .16);
    const bend = (seeded(index, 17) - .5) * .24 + delta * .24;
    const midRadius = startRadius + (length - startRadius) * .48;

    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * startRadius, cy + Math.sin(angle) * startRadius);
    context.lineTo(cx + Math.cos(angle + bend) * midRadius, cy + Math.sin(angle + bend) * midRadius);
    context.lineTo(cx + Math.cos(angle - bend * .3) * length, cy + Math.sin(angle - bend * .3) * length);
    context.strokeStyle = colorWithAlpha(index % 2 ? accent2 : accent, .12 + highDrive * .56 + impact * .16);
    context.lineWidth = .45 + highDrive * 1.7 + impact * .72;
    context.shadowColor = index % 2 ? accent2 : accent;
    context.shadowBlur = 2 + highDrive * 8;
    context.stroke();
  }
  context.restore();
}

function traceLiquidContour(context, minSide, data, phase, pulse, fluidity, high, scale = 1) {
  const points = 112;
  context.beginPath();
  for (let index = 0; index <= points; index += 1) {
    const progress = index / points;
    const angle = progress * Math.PI * 2;
    const spectral = Math.pow(sampleAt(data, progress), .62);
    const neighbour = Math.pow(sampleAt(data, (progress + .035) % 1), .68);
    const delta = localDelta(data, progress, 4);
    const waveA = Math.sin(angle * 3 + phase) * (.012 + fluidity * .046);
    const waveB = Math.sin(angle * 7 - phase * .72) * (.006 + high * .027);
    const spectralDeform = spectral * .092 + neighbour * .032 + Math.abs(delta) * .025;
    const radius = minSide * scale * (.205 + pulse * .082 + spectralDeform + waveA + waveB);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * (.86 + fluidity * .035 + Math.cos(angle * 2) * .018);
    if (!index) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath();
}

export function drawLiquidChromeV2Mode(context, width, height, data, accent, accent2, time, features = {}) {
  const { bass, mid, high, energy, peak, kick, rms, dynamics } = reactiveBands(data, features);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);
  const pulse = clamp(Math.pow(bass, .66) * .8 + kick * .88 + rms * .42 + peak * .22);
  const fluidity = clamp(mid * .78 + energy * .42 + dynamics * .34);
  const activity = clamp(energy * .82 + rms * .46 + high * .25);
  const phase = time * activity * .2;

  const haloRadius = minSide * (.34 + pulse * .12);
  const halo = context.createRadialGradient(cx, cy, minSide * .05, cx, cy, haloRadius);
  halo.addColorStop(0, colorWithAlpha('#ffffff', .025 + high * .055));
  halo.addColorStop(.32, colorWithAlpha(accent, .04 + pulse * .11));
  halo.addColorStop(.67, colorWithAlpha(accent2, .018 + energy * .06));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  traceLiquidContour(context, minSide, data, phase, pulse, fluidity, high, 1);
  const chrome = context.createLinearGradient(-minSide * .34, -minSide * .32, minSide * .36, minSide * .35);
  chrome.addColorStop(0, colorWithAlpha('#03040a', .98));
  chrome.addColorStop(.12, colorWithAlpha(accent2, .76 + high * .12));
  chrome.addColorStop(.27, colorWithAlpha('#ffffff', .9));
  chrome.addColorStop(.39, colorWithAlpha('#9da7bf', .52));
  chrome.addColorStop(.52, colorWithAlpha(accent, .86));
  chrome.addColorStop(.68, colorWithAlpha('#f8fbff', .78));
  chrome.addColorStop(.82, colorWithAlpha(accent2, .72));
  chrome.addColorStop(1, colorWithAlpha('#05050a', .98));
  context.fillStyle = chrome;
  context.shadowColor = accent;
  context.shadowBlur = 14 + pulse * 42 + high * 12;
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = colorWithAlpha('#ffffff', .28 + high * .42 + peak * .16);
  context.lineWidth = 1 + high * 2.35 + pulse * .65;
  context.stroke();

  context.globalCompositeOperation = 'lighter';
  traceLiquidContour(context, minSide, data, phase + .22, pulse * .76, fluidity, high, .72);
  context.strokeStyle = colorWithAlpha('#ffffff', .08 + high * .26 + peak * .16);
  context.lineWidth = .7 + high * 1.45;
  context.shadowColor = '#ffffff';
  context.shadowBlur = 4 + high * 10;
  context.stroke();

  traceLiquidContour(context, minSide, data, phase - .16, pulse * .58, fluidity * .82, high, .48);
  context.strokeStyle = colorWithAlpha(accent2, .07 + mid * .18 + pulse * .12);
  context.lineWidth = .55 + mid * 1.1;
  context.shadowColor = accent2;
  context.shadowBlur = 2 + mid * 7;
  context.stroke();

  const highlightWidth = minSide * (.08 + high * .075 + peak * .04);
  const highlightX = -minSide * (.08 + mid * .025);
  const highlightY = -minSide * (.105 + pulse * .02);
  const highlight = context.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, highlightWidth);
  highlight.addColorStop(0, colorWithAlpha('#ffffff', .62 + high * .25));
  highlight.addColorStop(.28, colorWithAlpha('#ffffff', .16 + high * .18));
  highlight.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = highlight;
  context.beginPath();
  context.ellipse(highlightX, highlightY, highlightWidth, highlightWidth * .48, -.42, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
