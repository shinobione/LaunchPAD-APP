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

export function drawNeonHorizonMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const horizonY = height * (0.43 - mid * 0.025);
  const centerX = width * (0.5 + Math.sin(time * 0.12) * 0.025);

  const sky = context.createLinearGradient(0, 0, 0, horizonY + height * .15);
  sky.addColorStop(0, '#03040c');
  sky.addColorStop(.48, '#090b22');
  sky.addColorStop(.78, rgba(accent2, .12, '155, 76, 255'));
  sky.addColorStop(1, rgba(accent, .15));
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const sunRadius = Math.min(width, height) * (0.12 + energy * .025);
  const sunX = width * .66;
  const sunY = horizonY - sunRadius * .38;
  const sun = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 1.8);
  sun.addColorStop(0, 'rgba(255,255,255,.96)');
  sun.addColorStop(.12, rgba(accent2, .92, '255, 86, 214'));
  sun.addColorStop(.45, rgba(accent, .36));
  sun.addColorStop(1, rgba(accent, 0));
  context.fillStyle = sun;
  context.beginPath();
  context.arc(sunX, sunY, sunRadius * 1.8, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  context.clip();
  const disk = context.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
  disk.addColorStop(0, 'rgba(255,255,255,.98)');
  disk.addColorStop(.28, rgba(accent2, .98, '255, 86, 214'));
  disk.addColorStop(1, rgba(accent, .95));
  context.fillStyle = disk;
  context.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);
  const stripeGap = Math.max(6, sunRadius * .11);
  for (let y = sunY - sunRadius; y < sunY + sunRadius; y += stripeGap) {
    const fade = clamp((y - (sunY - sunRadius)) / (sunRadius * 2));
    context.fillStyle = `rgba(3,4,12,${.08 + fade * .55})`;
    context.fillRect(sunX - sunRadius, y, sunRadius * 2, Math.max(2, stripeGap * .32));
  }
  context.restore();

  const floor = context.createLinearGradient(0, horizonY, 0, height);
  floor.addColorStop(0, 'rgba(4,5,14,.22)');
  floor.addColorStop(1, '#020309');
  context.fillStyle = floor;
  context.fillRect(0, horizonY, width, height - horizonY);

  const scroll = (time * (0.13 + energy * .18)) % 1;
  const rowCount = 24;
  const colCount = width < 800 ? 10 : 18;

  context.lineWidth = 1;
  for (let row = 0; row <= rowCount; row += 1) {
    let z = (row + scroll) / rowCount;
    if (z > 1) z -= 1;
    const perspective = z * z;
    const yBase = horizonY + perspective * (height - horizonY);
    const audio = sample(data, clamp(.03 + z * .32));
    const phase = time * (1.1 + energy * .8) - z * 9.5;
    const wave = Math.sin(phase) * (10 + bass * 42) * perspective;
    const punchWave = Math.exp(-Math.pow((z - ((time * .55) % 1)), 2) / .012) * punch * 42 * perspective;
    const y = yBase - wave - punchWave - audio * (12 + bass * 28) * perspective;
    context.strokeStyle = row % 4 === 0 ? rgba(accent2, .72, '255, 86, 214') : rgba(accent, .34);
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  for (let col = -colCount; col <= colCount; col += 1) {
    const spread = col / colCount;
    const xBottom = centerX + spread * width * .78;
    const xHorizon = centerX + spread * width * .018;
    context.strokeStyle = col % 3 === 0 ? rgba(accent2, .48, '255, 86, 214') : rgba(accent, .3);
    context.beginPath();
    context.moveTo(xHorizon, horizonY);
    context.lineTo(xBottom, height);
    context.stroke();
  }

  const horizonGlow = context.createLinearGradient(0, horizonY - 24, 0, horizonY + 40);
  horizonGlow.addColorStop(0, rgba(accent2, 0, '255, 86, 214'));
  horizonGlow.addColorStop(.5, rgba(accent2, .22, '255, 86, 214'));
  horizonGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = horizonGlow;
  context.fillRect(0, horizonY - 24, width, 64);

  const vignette = context.createRadialGradient(width / 2, height * .58, Math.min(width, height) * .12, width / 2, height * .58, Math.max(width, height) * .72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.52)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
