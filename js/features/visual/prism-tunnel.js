const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function rgba(color, alpha, fallback = '75, 224, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function sample(data, t) {
  if (!data?.length) return 0;
  const position = clamp(t) * (data.length - 1);
  const index = Math.floor(position);
  const next = Math.min(data.length - 1, index + 1);
  const mix = position - index;
  return (((data[index] || 0) * (1 - mix)) + ((data[next] || 0) * mix)) / 255;
}

function curtainPoints(width, height, data, time, layer, features) {
  const { bass, mid, high, energy, punch } = features;
  const count = width < 760 ? 26 : 42;
  const points = [];
  const baseY = height * (.42 + layer * .12);
  const amplitude = height * (.08 + layer * .025 + bass * .15 + punch * .09);
  const drift = time * (.18 + energy * .16) + layer * 1.37;

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const spectral = Math.pow(sample(data, clamp(t * .88 + layer * .035)), 1.35);
    const broad = Math.sin(t * Math.PI * (1.8 + layer * .24) + drift) * (.52 + mid * .2);
    const secondary = Math.sin(t * Math.PI * 5.2 - drift * 1.45 + layer) * (.18 + high * .09);
    const transient = Math.pow(Math.max(0, Math.sin(t * Math.PI * 7 - time * 1.7 - layer)), 10) * punch * .4;
    const y = baseY + (broad + secondary) * amplitude - spectral * amplitude * (.72 + layer * .1) - transient * amplitude;
    points.push([t * width, y, spectral]);
  }
  return points;
}

function traceCurtain(context, points, floorY, fillStyle, edgeStyle, alpha, width) {
  context.globalAlpha = alpha;
  context.fillStyle = fillStyle;
  context.beginPath();
  context.moveTo(points[0][0], floorY);
  for (const [x, y] of points) context.lineTo(x, y);
  context.lineTo(points[points.length - 1][0], floorY);
  context.closePath();
  context.fill();

  context.globalAlpha = Math.min(1, alpha * 2.4);
  context.strokeStyle = edgeStyle;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
  context.stroke();
  context.globalAlpha = 1;
}

function drawSpectralDust(context, width, height, data, time, high, energy, accent, accent2) {
  const count = width < 760 ? 18 : 34;
  for (let i = 0; i < count; i += 1) {
    const t = (i + .5) / count;
    const raw = sample(data, t);
    if (raw < .18) continue;
    const x = width * t;
    const y = height * (.16 + ((Math.sin(i * 2.31 + time * .35) + 1) * .5) * .62);
    const radius = .7 + raw * (1.4 + high * 1.8);
    context.globalAlpha = .12 + raw * .28 + energy * .06;
    context.fillStyle = i % 3 === 0 ? rgba(accent2 || accent, .9, '205,89,255') : rgba(accent, .9);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

// Historical export name retained because gravity-lens remains the saved compatibility id.
export function drawPrismTunnelMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#01040a');
  background.addColorStop(.46, '#06101c');
  background.addColorStop(.72, '#0c0920');
  background.addColorStop(1, '#030207');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const atmosphere = context.createRadialGradient(width * .52, height * .42, 0, width * .52, height * .42, width * .62);
  atmosphere.addColorStop(0, rgba(accent, .09 + energy * .055));
  atmosphere.addColorStop(.42, rgba(accent2 || accent, .035 + mid * .018, '205,89,255'));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const layers = width < 760 ? 2 : 3;
  for (let layer = layers - 1; layer >= 0; layer -= 1) {
    const points = curtainPoints(width, height, data, time, layer, { bass, mid, high, energy, punch });
    const floorY = height * (.82 + layer * .035);
    const fill = context.createLinearGradient(0, height * .2, 0, floorY);
    fill.addColorStop(0, rgba(accent, 0));
    fill.addColorStop(.18, rgba(accent, .035 + energy * .025));
    fill.addColorStop(.52, layer % 2 === 0 ? rgba(accent, .16 + bass * .055) : rgba(accent2 || accent, .13 + mid * .045, '205,89,255'));
    fill.addColorStop(.82, rgba(accent2 || accent, .04, '205,89,255'));
    fill.addColorStop(1, rgba(accent, 0));

    const edge = context.createLinearGradient(0, 0, width, 0);
    edge.addColorStop(0, rgba(accent, .18));
    edge.addColorStop(.33, rgba(accent, .76));
    edge.addColorStop(.52, 'rgba(241,253,255,.95)');
    edge.addColorStop(.72, rgba(accent2 || accent, .72, '205,89,255'));
    edge.addColorStop(1, rgba(accent2 || accent, .14, '205,89,255'));

    traceCurtain(context, points, floorY, fill, edge, .11 + (layers - layer) * .035 + energy * .02, 1 + (layers - layer) * .35);
  }

  const horizon = context.createLinearGradient(0, 0, width, 0);
  horizon.addColorStop(0, 'rgba(255,255,255,0)');
  horizon.addColorStop(.18, rgba(accent, .18));
  horizon.addColorStop(.5, 'rgba(235,252,255,.46)');
  horizon.addColorStop(.82, rgba(accent2 || accent, .18, '205,89,255'));
  horizon.addColorStop(1, 'rgba(255,255,255,0)');
  context.globalAlpha = .35 + bass * .18 + punch * .16;
  context.strokeStyle = horizon;
  context.lineWidth = .7 + punch * .9;
  context.beginPath();
  context.moveTo(width * .05, height * .78);
  context.lineTo(width * .95, height * .78);
  context.stroke();
  context.globalAlpha = 1;

  drawSpectralDust(context, width, height, data, time, high, energy, accent, accent2);

  const vignette = context.createRadialGradient(width * .5, height * .5, width * .12, width * .5, height * .5, width * .76);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.56)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
