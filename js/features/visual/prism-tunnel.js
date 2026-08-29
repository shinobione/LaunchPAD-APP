const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function rgba(color, alpha, fallback = '75, 224, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${clamp(alpha)})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha)})`;
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
  const count = width < 760 ? 44 : 74;
  const points = [];
  const lane = layer - 3;
  const band = layer % 3;
  const baseY = height * .5 + lane * height * (.031 + mid * .012);
  const broadDrive = band === 0 ? bass : band === 1 ? mid : high;
  const amplitude = height * (
    .045
    + broadDrive * (band === 0 ? .19 : band === 1 ? .145 : .105)
    + energy * .035
    + punch * (band === 0 ? .075 : .038)
  );
  const drift = time * (.16 + energy * .2 + broadDrive * .16) * (band === 1 ? -1 : 1) + layer * .79;

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const spectralT = clamp(t * .94 + band * .025);
    const spectral = Math.pow(sample(data, spectralT), 1.12);
    const longWave = Math.sin(t * Math.PI * (1.45 + band * .42) + drift);
    const fold = Math.sin(t * Math.PI * (3.7 + band * 1.15) - drift * 1.45 + layer * .47)
      * (.22 + broadDrive * .24 + mid * .09);
    const fine = Math.sin(t * Math.PI * (8.5 + band * 2.6) + drift * 2.2 + layer)
      * spectral * (.08 + high * .11);
    const audioLift = (spectral - broadDrive * .42) * (.34 + broadDrive * .34 + punch * .18);
    const punchWave = Math.exp(-Math.pow((t - ((time * .58 + layer * .11) % 1)) / .105, 2))
      * punch * (band === 0 ? .62 : .26);
    const y = baseY + (longWave + fold + fine + audioLift - punchWave) * amplitude;
    points.push([t * width, y, spectral]);
  }
  return points;
}

function traceCurtain(context, points, thickness, fillStyle, edgeStyle, alpha, edgeWidth) {
  context.globalAlpha = alpha;
  context.fillStyle = fillStyle;
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y - thickness);
    else context.lineTo(x, y - thickness);
  });
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const [x, y] = points[index];
    context.lineTo(x, y + thickness);
  }
  context.closePath();
  context.fill();

  context.globalAlpha = Math.min(1, alpha * 3.4);
  context.strokeStyle = edgeStyle;
  context.lineWidth = edgeWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
  context.stroke();
  context.globalAlpha = 1;
}

function drawSpectralDust(context, width, height, data, time, high, energy, accent, accent2) {
  const count = width < 760 ? 14 : 24;
  for (let i = 0; i < count; i += 1) {
    const t = (i + .5) / count;
    const raw = sample(data, t);
    if (raw < .34) continue;
    const x = width * t;
    const y = height * (.24 + ((Math.sin(i * 2.17 + time * .24) + 1) * .5) * .52);
    const radius = .55 + raw * (1.05 + high * 1.3);
    context.globalAlpha = .055 + raw * .13 + energy * .025;
    context.fillStyle = i % 4 === 0 ? rgba(accent2 || accent, .9, '220,70,255') : rgba(accent, .9);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
}

function drawVolumetricBloom(context, width, height, bass, mid, high, energy, punch, accent, accent2) {
  const horizon = height * .5;
  const bloom = context.createRadialGradient(width * .5, horizon, 0, width * .5, horizon, width * .48);
  bloom.addColorStop(0, `rgba(244,252,255,${.085 + high * .07 + punch * .055})`);
  bloom.addColorStop(.18, rgba(accent, .085 + energy * .045));
  bloom.addColorStop(.48, rgba(accent2 || accent, .055 + mid * .035, '220,70,255'));
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = bloom;
  context.fillRect(0, height * .12, width, height * .76);

  const floor = context.createLinearGradient(0, horizon - height * .16, 0, horizon + height * .2);
  floor.addColorStop(0, 'rgba(255,255,255,0)');
  floor.addColorStop(.44, rgba(accent, .025 + bass * .035));
  floor.addColorStop(.5, `rgba(242,252,255,${.055 + energy * .045})`);
  floor.addColorStop(.56, rgba(accent2 || accent, .025 + mid * .025, '220,70,255'));
  floor.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = floor;
  context.fillRect(0, horizon - height * .18, width, height * .38);
}

// Historical export name retained because gravity-lens remains the saved compatibility id.
// The renderer itself is Aurora Field: layered cyan/white/magenta luminous ribbons.
export function drawPrismTunnelMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const mobile = width < 760;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#02050c');
  background.addColorStop(.24, '#061126');
  background.addColorStop(.52, '#0a1030');
  background.addColorStop(.78, '#170925');
  background.addColorStop(1, '#050208');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const atmosphere = context.createLinearGradient(0, 0, 0, height);
  atmosphere.addColorStop(0, rgba(accent, .025 + high * .025));
  atmosphere.addColorStop(.36, rgba(accent, .055 + energy * .045));
  atmosphere.addColorStop(.55, rgba(accent2 || accent, .038 + mid * .028, '220,70,255'));
  atmosphere.addColorStop(.82, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  drawVolumetricBloom(context, width, height, bass, mid, high, energy, punch, accent, accent2);

  context.save();
  context.globalCompositeOperation = 'lighter';
  const layers = mobile ? 5 : 7;
  for (let layer = layers - 1; layer >= 0; layer -= 1) {
    const band = layer % 3;
    const bandValue = band === 0 ? bass : band === 1 ? mid : high;
    const points = curtainPoints(width, height, data, time, layer, { bass, mid, high, energy, punch });
    const thickness = height * (
      .0045
      + bandValue * (band === 0 ? .024 : band === 1 ? .018 : .013)
      + energy * .005
      + punch * (band === 0 ? .007 : .003)
    );

    const fill = context.createLinearGradient(0, height * .25, width, height * .72);
    if (band === 0) {
      fill.addColorStop(0, rgba(accent, .018));
      fill.addColorStop(.24, rgba(accent, .18 + bass * .1));
      fill.addColorStop(.5, `rgba(244,253,255,${.055 + high * .045})`);
      fill.addColorStop(.78, rgba(accent2 || accent, .12 + mid * .055, '220,70,255'));
      fill.addColorStop(1, rgba(accent2 || accent, .01, '220,70,255'));
    } else if (band === 1) {
      fill.addColorStop(0, rgba(accent2 || accent, .012, '220,70,255'));
      fill.addColorStop(.28, rgba(accent2 || accent, .14 + mid * .085, '220,70,255'));
      fill.addColorStop(.5, `rgba(247,253,255,${.05 + high * .035})`);
      fill.addColorStop(.76, rgba(accent, .13 + bass * .05));
      fill.addColorStop(1, rgba(accent, .01));
    } else {
      fill.addColorStop(0, 'rgba(255,255,255,0)');
      fill.addColorStop(.34, rgba(accent, .085 + high * .07));
      fill.addColorStop(.5, `rgba(248,254,255,${.15 + high * .11})`);
      fill.addColorStop(.7, rgba(accent2 || accent, .09 + high * .055, '220,70,255'));
      fill.addColorStop(1, 'rgba(255,255,255,0)');
    }

    const edge = context.createLinearGradient(0, 0, width, 0);
    edge.addColorStop(0, rgba(accent, .12));
    edge.addColorStop(.3, rgba(accent, .58 + bandValue * .18));
    edge.addColorStop(.5, `rgba(246,253,255,${.72 + high * .18})`);
    edge.addColorStop(.72, rgba(accent2 || accent, .58 + mid * .16, '220,70,255'));
    edge.addColorStop(1, rgba(accent2 || accent, .1, '220,70,255'));

    context.shadowColor = band === 1 ? (accent2 || accent) : accent;
    context.shadowBlur = mobile ? 5 + bandValue * 5 : 10 + bandValue * 13 + punch * 8;
    traceCurtain(
      context,
      points,
      thickness,
      fill,
      edge,
      .11 + (layers - layer) * .016 + energy * .024,
      .75 + (layers - layer) * .12 + high * .42
    );
  }
  context.restore();

  drawSpectralDust(context, width, height, data, time, high, energy, accent, accent2);

  const horizontalGlow = context.createLinearGradient(0, 0, width, 0);
  horizontalGlow.addColorStop(0, 'rgba(255,255,255,0)');
  horizontalGlow.addColorStop(.18, rgba(accent, .055));
  horizontalGlow.addColorStop(.5, `rgba(246,253,255,${.13 + punch * .08})`);
  horizontalGlow.addColorStop(.82, rgba(accent2 || accent, .055, '220,70,255'));
  horizontalGlow.addColorStop(1, 'rgba(255,255,255,0)');
  context.globalAlpha = .52 + energy * .16;
  context.strokeStyle = horizontalGlow;
  context.lineWidth = .45 + punch * .65;
  context.beginPath();
  context.moveTo(width * .06, height * .5);
  context.lineTo(width * .94, height * .5);
  context.stroke();
  context.globalAlpha = 1;

  const vignette = context.createRadialGradient(width * .5, height * .5, width * .14, width * .5, height * .5, width * .76);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(.72, 'rgba(0,0,0,.08)');
  vignette.addColorStop(1, 'rgba(0,0,0,.6)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
