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

function waveformPath(context, width, centerY, data, amplitude, time, energy, reflection = false) {
  const samples = Math.min(112, Math.max(48, Math.floor(width / 24)));
  context.beginPath();
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const dataIndex = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[dataIndex] || 0) / 255;
    const envelope = Math.pow(Math.sin(Math.PI * t), .55);
    const carrier = Math.sin(time * 2.4 + t * 18) * .12 + Math.sin(time * 1.1 - t * 8) * .08;
    const response = Math.pow(raw, 1.55) * (0.7 + energy * .8);
    const yOffset = (response + carrier * raw) * amplitude * envelope;
    const y = reflection ? centerY + yOffset : centerY - yOffset;
    const x = t * width;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
}

export function drawPulseLineMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const centerY = height * .51;
  const amplitude = height * (.16 + bass * .24 + punch * .12);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#02050d');
  background.addColorStop(.48, '#040914');
  background.addColorStop(1, '#010207');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const aura = context.createRadialGradient(width * .5, centerY, 0, width * .5, centerY, width * .5);
  aura.addColorStop(0, rgba(accent, .18));
  aura.addColorStop(.44, rgba(accent2, .06, '179, 69, 255'));
  aura.addColorStop(1, rgba(accent, 0));
  context.fillStyle = aura;
  context.fillRect(0, centerY - height * .32, width, height * .64);

  const waveformGradient = context.createLinearGradient(0, 0, width, 0);
  waveformGradient.addColorStop(0, rgba(accent, .92));
  waveformGradient.addColorStop(.34, 'rgba(235,250,255,.98)');
  waveformGradient.addColorStop(.66, rgba(accent2, .96, '208, 78, 255'));
  waveformGradient.addColorStop(1, rgba(accent, .9));

  for (const layer of [
    { width: 24 + punch * 14, alpha: .06 },
    { width: 12 + punch * 7, alpha: .13 },
    { width: 5 + punch * 2, alpha: .42 },
    { width: 1.8, alpha: 1 }
  ]) {
    context.globalAlpha = layer.alpha;
    context.strokeStyle = waveformGradient;
    context.lineWidth = layer.width;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    waveformPath(context, width, centerY, data, amplitude, time, energy, false);
    context.stroke();
  }
  context.globalAlpha = 1;

  context.globalAlpha = .22 + high * .12;
  context.strokeStyle = waveformGradient;
  context.lineWidth = 1.2;
  waveformPath(context, width, centerY + height * .035, data, amplitude * .54, time + .08, energy, true);
  context.stroke();
  context.globalAlpha = 1;

  const baseLine = context.createLinearGradient(0, 0, width, 0);
  baseLine.addColorStop(0, 'rgba(255,255,255,0)');
  baseLine.addColorStop(.18, rgba(accent, .42));
  baseLine.addColorStop(.5, 'rgba(255,255,255,.65)');
  baseLine.addColorStop(.82, rgba(accent2, .42, '208, 78, 255'));
  baseLine.addColorStop(1, 'rgba(255,255,255,0)');
  context.strokeStyle = baseLine;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.stroke();

  const flareX = ((time * (.11 + high * .08)) % 1) * width;
  const flare = context.createRadialGradient(flareX, centerY, 0, flareX, centerY, Math.max(80, width * .08));
  flare.addColorStop(0, 'rgba(255,255,255,.72)');
  flare.addColorStop(.2, rgba(accent, .3));
  flare.addColorStop(1, rgba(accent, 0));
  context.globalAlpha = .35 + high * .35;
  context.fillStyle = flare;
  context.fillRect(flareX - width * .08, centerY - height * .12, width * .16, height * .24);
  context.globalAlpha = 1;

  const edgeFade = context.createLinearGradient(0, 0, width, 0);
  edgeFade.addColorStop(0, 'rgba(0,0,0,.5)');
  edgeFade.addColorStop(.08, 'rgba(0,0,0,0)');
  edgeFade.addColorStop(.92, 'rgba(0,0,0,0)');
  edgeFade.addColorStop(1, 'rgba(0,0,0,.5)');
  context.fillStyle = edgeFade;
  context.fillRect(0, 0, width, height);
}
