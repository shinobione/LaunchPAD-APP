const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const PEAKS = new WeakMap();

function rgba(color, alpha, fallback = '74, 220, 255') {
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

function spectrumGradient(context, width, accent, accent2, alpha = 1) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, rgba(accent, .98 * alpha));
  gradient.addColorStop(.14, `rgba(26,220,255,${.99 * alpha})`);
  gradient.addColorStop(.34, `rgba(85,233,255,${1 * alpha})`);
  gradient.addColorStop(.49, `rgba(242,253,255,${1 * alpha})`);
  gradient.addColorStop(.63, `rgba(164,122,255,${.99 * alpha})`);
  gradient.addColorStop(.82, `rgba(236,58,255,${.99 * alpha})`);
  gradient.addColorStop(1, rgba(accent2, .98 * alpha, '255,63,198'));
  return gradient;
}

function rearFieldColor(t, accent, accent2, alpha) {
  if (t < .22) return rgba(accent, alpha);
  if (t < .42) return `rgba(58,226,255,${alpha})`;
  if (t < .58) return `rgba(239,251,255,${Math.min(1, alpha * 1.12)})`;
  if (t < .78) return `rgba(177,103,255,${alpha})`;
  return rgba(accent2, alpha, '255,63,198');
}

function drawRearField(context, width, height, data, baseline, maxHeight, energy, bass, accent, accent2) {
  const count = width < 760 ? 30 : 46;
  const span = width * .92;
  const startX = width * .04;
  const step = span / count;
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const raw = sample(data, t);
    const shaped = Math.pow(raw, 1.35);
    const h = shaped * maxHeight * (.72 + bass * .12);
    const x = startX + i * step;
    const band = Math.max(3, step * .62);
    const fog = context.createLinearGradient(0, baseline - h, 0, baseline + 8);
    fog.addColorStop(0, 'rgba(255,255,255,0)');
    fog.addColorStop(.28, rearFieldColor(t, accent, accent2, .13 + energy * .035));
    fog.addColorStop(1, 'rgba(255,255,255,0)');
    context.globalAlpha = .055 + energy * .035;
    context.fillStyle = fog;
    context.fillRect(x - band * .5, baseline - h, band, h + 10);
  }
  context.globalAlpha = 1;
}

export function drawChromaSpectrumMode(context, width, height, data, accent, accent2, time, features = {}) {
  const energy = clamp(features.energy || 0);
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const mobile = width < 760;
  const barCount = mobile ? 96 : 184;
  const baseline = height * .615;
  const maxHeight = height * (.285 + bass * .225 + punch * .105);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#080219');
  background.addColorStop(.22, '#08132f');
  background.addColorStop(.49, '#0c1030');
  background.addColorStop(.78, '#18072c');
  background.addColorStop(1, '#25041f');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const topAtmosphere = context.createRadialGradient(width * .48, height * .3, 0, width * .48, height * .3, width * .56);
  topAtmosphere.addColorStop(0, 'rgba(76,116,255,.13)');
  topAtmosphere.addColorStop(.32, rgba(accent, .05));
  topAtmosphere.addColorStop(.58, rgba(accent2, .045, '224,69,255'));
  topAtmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = topAtmosphere;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = .055 + high * .025;
  context.strokeStyle = 'rgba(191,213,255,.18)';
  context.lineWidth = .5;
  const gridStep = Math.max(42, width / 24);
  for (let x = gridStep; x < width; x += gridStep) {
    context.beginPath();
    context.moveTo(x, height * .12);
    context.lineTo(x, height * .86);
    context.stroke();
  }
  context.globalAlpha = 1;

  const span = width * .91;
  const startX = width * .045;
  const gap = mobile ? .65 : .78;
  const barWidth = Math.max(.68, (span - gap * (barCount - 1)) / barCount);
  const spectrumColor = spectrumGradient(context, width, accent, accent2);

  let peaks = PEAKS.get(context);
  if (!peaks || peaks.length !== barCount) {
    peaks = new Float32Array(barCount);
    PEAKS.set(context, peaks);
  }

  const floorGlow = context.createLinearGradient(0, baseline - height * .12, 0, baseline + height * .15);
  floorGlow.addColorStop(0, 'rgba(255,255,255,0)');
  floorGlow.addColorStop(.42, rgba(accent, .045 + energy * .035));
  floorGlow.addColorStop(.5, 'rgba(236,250,255,.20)');
  floorGlow.addColorStop(.58, rgba(accent2, .04 + energy * .02, '255,63,198'));
  floorGlow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = floorGlow;
  context.fillRect(0, baseline - height * .13, width, height * .28);

  drawRearField(context, width, height, data, baseline, maxHeight, energy, bass, accent, accent2);

  for (let i = 0; i < barCount; i += 1) {
    const t = i / (barCount - 1);
    const raw = sample(data, t);
    const left = sample(data, clamp(t - .0045));
    const right = sample(data, clamp(t + .0045));
    const shaped = Math.pow(raw * .62 + left * .19 + right * .19, 1.58);
    const contour = .76 + Math.sin(Math.PI * t) * .18 + Math.sin(t * 14 + time * .19) * .018 * mid;
    const target = clamp(shaped * contour * (1 + energy * .42 + punch * .08));
    peaks[i] = Math.max(target, peaks[i] * (.965 - high * .02));

    const h = Math.max(.8, target * maxHeight);
    const x = startX + i * (barWidth + gap);
    const reflection = h * (.115 + high * .055);

    context.globalAlpha = .06 + energy * .035;
    context.fillStyle = spectrumColor;
    context.fillRect(x - .7, baseline - h - 4, barWidth + 1.4, h + 6);

    context.globalAlpha = .93;
    context.fillStyle = spectrumColor;
    context.fillRect(x, baseline - h, barWidth, h);

    context.globalAlpha = .62 + target * .28;
    context.fillStyle = 'rgba(247,253,255,.94)';
    context.fillRect(x, baseline - h, Math.max(.45, barWidth * .28), Math.min(2.2, 1 + target * 1.2));

    context.globalAlpha = .13 + high * .055;
    context.fillStyle = spectrumColor;
    context.fillRect(x, baseline + 1, barWidth, reflection);

    const peakY = baseline - peaks[i] * maxHeight - 2.5;
    context.globalAlpha = .34 + peaks[i] * .28;
    context.fillStyle = i % 11 === 0 ? 'rgba(250,254,255,.96)' : spectrumColor;
    context.fillRect(x, peakY, barWidth, .75);
  }
  context.globalAlpha = 1;

  const axis = context.createLinearGradient(0, 0, width, 0);
  axis.addColorStop(0, 'rgba(255,255,255,0)');
  axis.addColorStop(.08, rgba(accent, .34));
  axis.addColorStop(.5, 'rgba(247,253,255,.75)');
  axis.addColorStop(.92, rgba(accent2, .34, '255,63,198'));
  axis.addColorStop(1, 'rgba(255,255,255,0)');
  context.strokeStyle = axis;
  context.lineWidth = .58;
  context.beginPath();
  context.moveTo(startX, baseline);
  context.lineTo(width - startX, baseline);
  context.stroke();

  const haze = context.createRadialGradient(width * .5, baseline, 0, width * .5, baseline, width * .5);
  haze.addColorStop(0, `rgba(210,224,255,${.04 + energy * .03})`);
  haze.addColorStop(.36, rgba(accent2, .024, '255,63,198'));
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = haze;
  context.fillRect(0, baseline - height * .22, width, height * .45);

  const edgeLight = context.createLinearGradient(0, 0, width, 0);
  edgeLight.addColorStop(0, rgba(accent, .08 + high * .04));
  edgeLight.addColorStop(.2, 'rgba(255,255,255,0)');
  edgeLight.addColorStop(.8, 'rgba(255,255,255,0)');
  edgeLight.addColorStop(1, rgba(accent2, .08 + high * .04, '255,63,198'));
  context.fillStyle = edgeLight;
  context.fillRect(0, height * .12, width, height * .75);

  const vignette = context.createRadialGradient(width * .5, height * .5, width * .12, width * .5, height * .5, width * .72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.5)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
