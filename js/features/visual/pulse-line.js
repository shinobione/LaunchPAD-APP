const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function rgba(color, alpha, fallback = '71, 220, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function waveformPath(context, width, centerY, data, amplitude, time, energy, opts = {}) {
  const { reflection = false, phaseOffset = 0, scale = 1, harmonic = .12 } = opts;
  const samples = Math.min(168, Math.max(72, Math.floor(width / 15)));
  context.beginPath();
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const dataIndex = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[dataIndex] || 0) / 255;
    const neighbor = (data[Math.min(data.length - 1, dataIndex + 2)] || 0) / 255;
    const envelope = Math.pow(Math.sin(Math.PI * t), .5);
    const carrier = Math.sin(time * 2.2 + t * 20 + phaseOffset) * harmonic + Math.sin(time * .93 - t * 9.5 + phaseOffset) * .065;
    const detail = Math.sin(time * 4.8 - t * 42 + phaseOffset) * raw * .035;
    const response = Math.pow(raw * .78 + neighbor * .22, 1.42) * (.72 + energy * .92);
    const yOffset = (response + carrier * raw + detail) * amplitude * envelope * scale;
    const y = reflection ? centerY + yOffset : centerY - yOffset;
    const x = t * width;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
}

function drawParticleTicks(context, width, centerY, data, time, high, accent, accent2) {
  const count = width < 800 ? 28 : 52;
  for (let i = 0; i < count; i += 1) {
    const t = (i + .5) / count;
    const index = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[index] || 0) / 255;
    if (raw < .14) continue;
    const drift = Math.sin(time * (1.2 + (i % 5) * .18) + i * 2.41);
    const y = centerY + drift * (9 + raw * 22);
    const alpha = clamp((raw - .1) * (.55 + high * .8));
    context.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,.92)' : (i % 2 === 0 ? rgba(accent2, alpha, '198,72,255') : rgba(accent, alpha));
    context.fillRect(t * width, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
  }
}

export function drawPulseLineMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const centerY = height * (.505 + Math.sin(time * .18) * .004);
  const amplitude = height * (.17 + bass * .28 + punch * .16);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#01040a');
  background.addColorStop(.44, '#040914');
  background.addColorStop(.56, '#06101c');
  background.addColorStop(1, '#010207');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const aura = context.createRadialGradient(width * .5, centerY, 0, width * .5, centerY, width * .52);
  aura.addColorStop(0, rgba(accent, .22 + energy * .08));
  aura.addColorStop(.34, rgba(accent2, .09 + mid * .05, '179, 69, 255'));
  aura.addColorStop(.72, rgba(accent, .025));
  aura.addColorStop(1, rgba(accent, 0));
  context.fillStyle = aura;
  context.fillRect(0, centerY - height * .38, width, height * .76);

  const waveformGradient = context.createLinearGradient(0, 0, width, 0);
  waveformGradient.addColorStop(0, rgba(accent, .95));
  waveformGradient.addColorStop(.24, 'rgba(115,238,255,.98)');
  waveformGradient.addColorStop(.5, 'rgba(248,253,255,1)');
  waveformGradient.addColorStop(.76, rgba(accent2, .98, '208, 78, 255'));
  waveformGradient.addColorStop(1, rgba(accent, .92));

  const echoes = [
    { alpha: .12, width: 2.4, scale: .74, offset: -0.18, y: -height * .018 },
    { alpha: .09, width: 1.6, scale: .58, offset: .22, y: height * .022 }
  ];
  for (const echo of echoes) {
    context.globalAlpha = echo.alpha + energy * .05;
    context.strokeStyle = waveformGradient;
    context.lineWidth = echo.width;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    waveformPath(context, width, centerY + echo.y, data, amplitude, time, energy, { phaseOffset: echo.offset, scale: echo.scale, harmonic: .16 });
    context.stroke();
  }
  context.globalAlpha = 1;

  for (const layer of [
    { width: 30 + punch * 18, alpha: .055 },
    { width: 16 + punch * 9, alpha: .11 },
    { width: 7 + punch * 3, alpha: .31 },
    { width: 2.2, alpha: .88 }
  ]) {
    context.globalAlpha = layer.alpha;
    context.strokeStyle = waveformGradient;
    context.lineWidth = layer.width;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    waveformPath(context, width, centerY, data, amplitude, time, energy, { harmonic: .14 });
    context.stroke();
  }

  context.globalAlpha = .95;
  context.strokeStyle = 'rgba(248,253,255,.98)';
  context.lineWidth = 1.05;
  waveformPath(context, width, centerY, data, amplitude * .92, time, energy, { harmonic: .1 });
  context.stroke();
  context.globalAlpha = 1;

  context.globalAlpha = .24 + high * .16;
  context.strokeStyle = waveformGradient;
  context.lineWidth = 1.1;
  waveformPath(context, width, centerY + height * .035, data, amplitude * .5, time + .08, energy, { reflection: true, scale: .72, harmonic: .08 });
  context.stroke();
  context.globalAlpha = 1;

  drawParticleTicks(context, width, centerY, data, time, high, accent, accent2);

  const baseLine = context.createLinearGradient(0, 0, width, 0);
  baseLine.addColorStop(0, 'rgba(255,255,255,0)');
  baseLine.addColorStop(.12, rgba(accent, .28));
  baseLine.addColorStop(.34, rgba(accent, .52));
  baseLine.addColorStop(.5, 'rgba(255,255,255,.82)');
  baseLine.addColorStop(.66, rgba(accent2, .55, '208, 78, 255'));
  baseLine.addColorStop(.88, rgba(accent2, .3, '208,78,255'));
  baseLine.addColorStop(1, 'rgba(255,255,255,0)');
  context.strokeStyle = baseLine;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.stroke();

  const tickCount = width < 800 ? 28 : 54;
  context.globalAlpha = .36 + high * .2;
  for (let i = 0; i <= tickCount; i += 1) {
    const x = i / tickCount * width;
    const major = i % 6 === 0;
    context.strokeStyle = major ? 'rgba(255,255,255,.62)' : rgba(accent, .44);
    context.lineWidth = major ? 1 : .7;
    context.beginPath();
    context.moveTo(x, centerY - (major ? 5 : 2));
    context.lineTo(x, centerY + (major ? 5 : 2));
    context.stroke();
  }
  context.globalAlpha = 1;

  const flareX = ((time * (.15 + high * .14 + energy * .04)) % 1) * width;
  const flare = context.createRadialGradient(flareX, centerY, 0, flareX, centerY, Math.max(80, width * .085));
  flare.addColorStop(0, 'rgba(255,255,255,.9)');
  flare.addColorStop(.14, rgba(accent, .4));
  flare.addColorStop(.46, rgba(accent2, .14, '208,78,255'));
  flare.addColorStop(1, rgba(accent, 0));
  context.globalAlpha = .32 + high * .42;
  context.fillStyle = flare;
  context.fillRect(flareX - width * .09, centerY - height * .15, width * .18, height * .3);
  context.globalAlpha = 1;

  const edgeFade = context.createLinearGradient(0, 0, width, 0);
  edgeFade.addColorStop(0, 'rgba(0,0,0,.58)');
  edgeFade.addColorStop(.065, 'rgba(0,0,0,0)');
  edgeFade.addColorStop(.935, 'rgba(0,0,0,0)');
  edgeFade.addColorStop(1, 'rgba(0,0,0,.58)');
  context.fillStyle = edgeFade;
  context.fillRect(0, 0, width, height);
}
