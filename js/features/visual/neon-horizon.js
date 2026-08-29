const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function sample(data, normalized) {
  if (!data?.length) return 0;
  const index = Math.max(0, Math.min(data.length - 1, Math.round(normalized * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function rgba(color, alpha, fallback = '79, 225, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawCyberFigure(context, width, height, time, bass, mid, energy, punch, accent, accent2) {
  const cx = width * (.54 + Math.sin(time * .17) * .012);
  const cy = height * .47;
  const scale = Math.min(width, height) * (.28 + energy * .025 + punch * .018);
  const tilt = Math.sin(time * .31) * .035 + mid * .02;

  context.save();
  context.translate(cx, cy);
  context.rotate(tilt);

  const aura = context.createRadialGradient(0, 0, 0, 0, 0, scale * 1.45);
  aura.addColorStop(0, rgba(accent, .14 + energy * .06));
  aura.addColorStop(.46, rgba(accent2, .07 + bass * .05, '255,83,49'));
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = aura;
  context.fillRect(-scale * 1.5, -scale * 1.5, scale * 3, scale * 3);

  context.globalAlpha = .96;
  const body = context.createLinearGradient(0, -scale, 0, scale);
  body.addColorStop(0, 'rgba(20,38,54,.98)');
  body.addColorStop(.42, 'rgba(9,20,31,.98)');
  body.addColorStop(.72, 'rgba(24,13,17,.98)');
  body.addColorStop(1, 'rgba(7,8,12,.98)');
  context.fillStyle = body;

  context.beginPath();
  context.moveTo(-scale * .42, -scale * .25);
  context.lineTo(-scale * .55, scale * .1);
  context.lineTo(-scale * .35, scale * .68);
  context.lineTo(-scale * .12, scale * .95);
  context.lineTo(scale * .18, scale * .86);
  context.lineTo(scale * .44, scale * .42);
  context.lineTo(scale * .52, -scale * .04);
  context.lineTo(scale * .34, -scale * .38);
  context.closePath();
  context.fill();

  const headY = -scale * .58;
  context.beginPath();
  context.ellipse(0, headY, scale * .28, scale * .34, -.12, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(158,230,255,.38)';
  context.lineWidth = Math.max(1, scale * .008);
  context.beginPath();
  context.moveTo(-scale * .24, headY - scale * .07);
  context.quadraticCurveTo(0, headY - scale * .17, scale * .23, headY - scale * .02);
  context.moveTo(-scale * .18, headY + scale * .1);
  context.quadraticCurveTo(0, headY + scale * .2, scale * .17, headY + scale * .08);
  context.stroke();

  const eyeGlow = context.createLinearGradient(-scale * .16, 0, scale * .16, 0);
  eyeGlow.addColorStop(0, rgba(accent, .15));
  eyeGlow.addColorStop(.5, 'rgba(235,252,255,.98)');
  eyeGlow.addColorStop(1, rgba(accent, .15));
  context.strokeStyle = eyeGlow;
  context.lineWidth = Math.max(1.2, scale * .012);
  context.beginPath();
  context.moveTo(-scale * .16, headY - scale * .025);
  context.lineTo(scale * .16, headY - scale * .01);
  context.stroke();

  const coreY = scale * .2;
  const coreRadius = scale * (.12 + bass * .04 + punch * .04);
  const core = context.createRadialGradient(0, coreY, 0, 0, coreY, coreRadius * 2.8);
  core.addColorStop(0, 'rgba(255,246,226,1)');
  core.addColorStop(.16, 'rgba(255,111,38,.98)');
  core.addColorStop(.44, rgba(accent2, .72, '255,72,32'));
  core.addColorStop(1, 'rgba(255,70,20,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(0, coreY, coreRadius * 2.8, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = rgba(accent, .55 + mid * .25);
  context.lineWidth = Math.max(1, scale * .007);
  for (let ring = 0; ring < 4; ring += 1) {
    context.beginPath();
    context.ellipse(0, coreY, coreRadius * (1.3 + ring * .44), coreRadius * (.62 + ring * .22), time * .08 + ring * .42, 0, Math.PI * 2);
    context.stroke();
  }

  context.strokeStyle = 'rgba(255,108,34,.52)';
  context.lineWidth = Math.max(1, scale * .009);
  context.beginPath();
  context.moveTo(-scale * .38, scale * .05);
  context.lineTo(-scale * .58, scale * .38);
  context.lineTo(-scale * .44, scale * .68);
  context.moveTo(scale * .35, scale * .02);
  context.lineTo(scale * .58, scale * .32);
  context.lineTo(scale * .42, scale * .62);
  context.stroke();

  context.restore();
  context.globalAlpha = 1;
}

function drawHudSpectrum(context, width, height, data, time, bass, high, accent) {
  const startX = width * .08;
  const baseline = height * .79;
  const span = width * .26;
  const bars = width < 800 ? 32 : 48;
  const barWidth = Math.max(1, span / bars * .42);
  for (let i = 0; i < bars; i += 1) {
    const t = i / (bars - 1);
    const raw = sample(data, t * .42);
    const h = Math.max(2, Math.pow(raw, 1.45) * height * (.18 + bass * .14));
    const x = startX + t * span;
    context.globalAlpha = .35 + raw * .55;
    context.fillStyle = i % 7 === 0 ? 'rgba(255,240,220,.96)' : 'rgba(255,91,28,.86)';
    context.fillRect(x, baseline - h, barWidth, h);
  }
  context.globalAlpha = 1;

  context.strokeStyle = 'rgba(255,114,39,.62)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(startX, baseline + 4);
  context.lineTo(startX + span, baseline + 4);
  context.stroke();

  const cursorX = startX + ((time * (.13 + high * .08)) % 1) * span;
  context.fillStyle = 'rgba(255,244,226,.9)';
  context.fillRect(cursorX, baseline - height * .22, 1, height * .24);
}

function drawCyberStreaks(context, width, height, time, high, energy, accent) {
  const count = width < 800 ? 18 : 32;
  for (let i = 0; i < count; i += 1) {
    const seed = i * 1.731;
    const x = (Math.sin(seed * 2.4) * .5 + .5) * width;
    const y = ((Math.sin(seed * 4.1) * .5 + .5) * height + time * (20 + energy * 38) * (i % 2 ? 1 : .6)) % height;
    const length = 5 + (i % 5) * 4 + high * 12;
    context.globalAlpha = .12 + (i % 4) * .045 + high * .12;
    context.strokeStyle = i % 3 === 0 ? 'rgba(255,94,26,.7)' : rgba(accent, .72);
    context.lineWidth = i % 6 === 0 ? 2 : 1;
    context.beginPath();
    context.moveTo(x, y - length);
    context.lineTo(x + (i % 2 ? 4 : -3), y + length);
    context.stroke();
  }
  context.globalAlpha = 1;
}

export function drawNeonHorizonMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#020811');
  background.addColorStop(.38, '#061521');
  background.addColorStop(.63, '#0b1019');
  background.addColorStop(1, '#180706');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const cyanGlow = context.createRadialGradient(width * .38, height * .18, 0, width * .38, height * .18, width * .48);
  cyanGlow.addColorStop(0, rgba(accent, .17 + energy * .05));
  cyanGlow.addColorStop(.5, rgba(accent, .05));
  cyanGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = cyanGlow;
  context.fillRect(0, 0, width, height);

  const orangeGlow = context.createRadialGradient(width * .48, height * .76, 0, width * .48, height * .76, width * .42);
  orangeGlow.addColorStop(0, 'rgba(255,80,20,.16)');
  orangeGlow.addColorStop(.45, 'rgba(255,63,12,.05)');
  orangeGlow.addColorStop(1, 'rgba(255,63,12,0)');
  context.fillStyle = orangeGlow;
  context.fillRect(0, 0, width, height);

  drawCyberStreaks(context, width, height, time, high, energy, accent);
  drawCyberFigure(context, width, height, time, bass, mid, energy, punch, accent, accent2);
  drawHudSpectrum(context, width, height, data, time, bass, high, accent);

  context.save();
  context.translate(width * .5, height * .34);
  context.rotate(-.16);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `800 ${Math.max(18, Math.min(42, width * .033))}px Arial, sans-serif`;
  context.fillStyle = 'rgba(45,224,255,.2)';
  context.fillText('AUDIO REACTIVE', 4, 5);
  context.fillStyle = 'rgba(45,224,255,.94)';
  context.fillText('AUDIO REACTIVE', 0, 0);
  context.font = `700 ${Math.max(11, Math.min(19, width * .014))}px Arial, sans-serif`;
  context.fillStyle = 'rgba(236,250,255,.9)';
  context.fillText('CYBER SCENE', width * .045, Math.max(22, height * .055));
  context.restore();

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.font = `600 ${Math.max(8, Math.min(11, width * .007))}px monospace`;
  context.fillStyle = 'rgba(255,190,79,.86)';
  context.fillText(`ENERGY ${Math.round(energy * 99).toString().padStart(2, '0')}`, width * .76, height * .62);
  context.fillText(`BASS   ${Math.round(bass * 99).toString().padStart(2, '0')}`, width * .76, height * .65);
  context.fillText(`PUNCH  ${Math.round(punch * 99).toString().padStart(2, '0')}`, width * .76, height * .68);

  context.strokeStyle = 'rgba(255,135,52,.42)';
  context.lineWidth = 1;
  context.strokeRect(width * .745, height * .585, width * .16, height * .12);

  context.globalAlpha = .1 + high * .08;
  const scan = 4;
  context.fillStyle = 'rgba(255,255,255,.12)';
  for (let y = 0; y < height; y += scan) context.fillRect(0, y, width, 1);
  context.globalAlpha = 1;

  const vignette = context.createRadialGradient(width * .5, height * .48, width * .08, width * .5, height * .48, width * .72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.5)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
