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

function drawStars(context, width, height, horizonY, time, high, accent) {
  const count = width < 800 ? 26 : 48;
  for (let index = 0; index < count; index += 1) {
    const seed = index * 17.137;
    const x = ((Math.sin(seed * 1.91) * .5 + .5) * width + time * (4 + high * 14) * (index % 3 === 0 ? 1 : -.55)) % width;
    const y = (Math.sin(seed * 2.71) * .5 + .5) * horizonY * .84;
    const twinkle = .18 + (.5 + .5 * Math.sin(time * (1.2 + (index % 5) * .17) + seed)) * (.22 + high * .4);
    context.fillStyle = index % 6 === 0 ? 'rgba(255,255,255,.92)' : rgba(accent, twinkle);
    const radius = index % 7 === 0 ? 1.4 : .75;
    context.fillRect(x, y, radius, radius);
  }
}

function terrainHeight(data, z, lane, time, bass, mid, punch) {
  const low = sample(data, clamp(.015 + z * .22));
  const lowMid = sample(data, clamp(.12 + z * .28));
  const ridge = Math.sin(time * (1.6 + bass * .9) - z * 11.5 + lane * .66);
  const cross = Math.sin(time * .72 + z * 6.8 - lane * 1.1);
  const punchCenter = (time * (.62 + punch * .18)) % 1;
  const punchWave = Math.exp(-Math.pow((z - punchCenter), 2) / .0075) * punch;
  return (ridge * (9 + bass * 48) + cross * (5 + mid * 20) + low * (18 + bass * 44) + lowMid * 12 + punchWave * 78);
}

export function drawNeonHorizonMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const horizonY = height * (0.42 - mid * 0.035 - punch * .012);
  const cameraSway = Math.sin(time * (.21 + mid * .13)) * (.025 + mid * .035);
  const centerX = width * (0.5 + cameraSway);

  const sky = context.createLinearGradient(0, 0, 0, horizonY + height * .2);
  sky.addColorStop(0, '#02030a');
  sky.addColorStop(.42, '#07091a');
  sky.addColorStop(.72, rgba(accent2, .16, '155, 76, 255'));
  sky.addColorStop(1, rgba(accent, .22));
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  drawStars(context, width, height, horizonY, time, high, accent);

  const sunRadius = Math.min(width, height) * (0.13 + energy * .035 + punch * .018);
  const sunX = width * (.665 + Math.sin(time * .11) * .018);
  const sunY = horizonY - sunRadius * (.42 + bass * .08);
  const sun = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 2.35);
  sun.addColorStop(0, 'rgba(255,255,255,.98)');
  sun.addColorStop(.12, rgba(accent2, .98, '255, 86, 214'));
  sun.addColorStop(.38, rgba(accent, .44));
  sun.addColorStop(1, rgba(accent, 0));
  context.fillStyle = sun;
  context.beginPath();
  context.arc(sunX, sunY, sunRadius * 2.35, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  context.clip();
  const disk = context.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
  disk.addColorStop(0, 'rgba(255,255,255,.99)');
  disk.addColorStop(.22, rgba(accent2, .98, '255, 86, 214'));
  disk.addColorStop(.72, rgba(accent, .96));
  disk.addColorStop(1, rgba(accent2, .86, '255, 86, 214'));
  context.fillStyle = disk;
  context.fillRect(sunX - sunRadius, sunY - sunRadius, sunRadius * 2, sunRadius * 2);
  const stripeGap = Math.max(5, sunRadius * (.095 - high * .015));
  for (let y = sunY - sunRadius; y < sunY + sunRadius; y += stripeGap) {
    const fade = clamp((y - (sunY - sunRadius)) / (sunRadius * 2));
    const audioBand = sample(data, clamp(.24 + fade * .46));
    context.fillStyle = `rgba(3,4,12,${.08 + fade * .48 + audioBand * .18})`;
    context.fillRect(sunX - sunRadius, y, sunRadius * 2, Math.max(2, stripeGap * (.26 + audioBand * .28)));
  }
  context.restore();

  const mountains = context.createLinearGradient(0, horizonY - height * .13, 0, horizonY + 30);
  mountains.addColorStop(0, 'rgba(10,10,28,.1)');
  mountains.addColorStop(1, 'rgba(2,3,9,.94)');
  context.fillStyle = mountains;
  context.beginPath();
  context.moveTo(0, horizonY + 12);
  const peaks = width < 800 ? 12 : 20;
  for (let i = 0; i <= peaks; i += 1) {
    const x = i / peaks * width;
    const heightScale = (0.35 + 0.65 * Math.abs(Math.sin(i * 1.73 + time * .07))) * height * (.045 + mid * .03);
    context.lineTo(x, horizonY - heightScale);
  }
  context.lineTo(width, horizonY + 28);
  context.closePath();
  context.fill();

  const floor = context.createLinearGradient(0, horizonY, 0, height);
  floor.addColorStop(0, 'rgba(4,5,14,.12)');
  floor.addColorStop(1, '#010207');
  context.fillStyle = floor;
  context.fillRect(0, horizonY, width, height - horizonY);

  const scroll = (time * (.22 + energy * .62 + bass * .12)) % 1;
  const rowCount = width < 800 ? 24 : 34;
  const colCount = width < 800 ? 12 : 22;
  const laneCount = width < 800 ? 8 : 14;

  context.lineWidth = 1;
  for (let row = 0; row <= rowCount; row += 1) {
    let z = (row + scroll) / rowCount;
    if (z > 1) z -= 1;
    const perspective = z * z;
    const yBase = horizonY + perspective * (height - horizonY);
    const wave = terrainHeight(data, z, 0, time, bass, mid, punch) * perspective;
    const y = yBase - wave;
    context.strokeStyle = row % 5 === 0 ? rgba(accent2, .86, '255, 86, 214') : rgba(accent, .42 + perspective * .2);
    context.lineWidth = row % 5 === 0 ? 1.45 : .85;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  for (let col = -colCount; col <= colCount; col += 1) {
    const spread = col / colCount;
    const xBottom = centerX + spread * width * .86;
    const xHorizon = centerX + spread * width * .012;
    context.strokeStyle = col % 4 === 0 ? rgba(accent2, .62, '255, 86, 214') : rgba(accent, .34);
    context.lineWidth = col % 4 === 0 ? 1.35 : .8;
    context.beginPath();
    context.moveTo(xHorizon, horizonY);
    context.lineTo(xBottom, height);
    context.stroke();
  }

  context.globalAlpha = .24 + energy * .2;
  for (let lane = 0; lane < laneCount; lane += 1) {
    const laneT = lane / Math.max(1, laneCount - 1);
    const spread = laneT * 2 - 1;
    const z = ((time * (.34 + energy * .54) + lane * .113) % 1);
    const perspective = z * z;
    const y = horizonY + perspective * (height - horizonY) - terrainHeight(data, z, lane, time, bass, mid, punch) * perspective;
    const x = centerX + spread * width * (.02 + perspective * .78);
    const length = 10 + perspective * (46 + high * 42);
    const glow = context.createLinearGradient(x - length, y, x + length, y);
    glow.addColorStop(0, rgba(accent, 0));
    glow.addColorStop(.5, lane % 3 === 0 ? 'rgba(255,255,255,.95)' : rgba(accent2, .88, '255,86,214'));
    glow.addColorStop(1, rgba(accent, 0));
    context.strokeStyle = glow;
    context.lineWidth = 1 + perspective * 1.8;
    context.beginPath();
    context.moveTo(x - length, y);
    context.lineTo(x + length, y);
    context.stroke();
  }
  context.globalAlpha = 1;

  const horizonGlow = context.createLinearGradient(0, horizonY - 38, 0, horizonY + 52);
  horizonGlow.addColorStop(0, rgba(accent2, 0, '255, 86, 214'));
  horizonGlow.addColorStop(.45, rgba(accent2, .28 + energy * .16, '255, 86, 214'));
  horizonGlow.addColorStop(.58, rgba(accent, .2 + bass * .12));
  horizonGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = horizonGlow;
  context.fillRect(0, horizonY - 38, width, 90);

  const vignette = context.createRadialGradient(width / 2, height * .58, Math.min(width, height) * .12, width / 2, height * .58, Math.max(width, height) * .72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.48)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
