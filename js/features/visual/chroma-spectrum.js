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
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(t * data.length)));
  const next = Math.min(data.length - 1, index + 1);
  return ((data[index] || 0) * .78 + (data[next] || 0) * .22) / 255;
}

function chromaAt(context, x, width, accent, accent2) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, rgba(accent, .98));
  gradient.addColorStop(.22, 'rgba(65,226,255,.99)');
  gradient.addColorStop(.46, 'rgba(232,251,255,1)');
  gradient.addColorStop(.64, 'rgba(153,111,255,.99)');
  gradient.addColorStop(.82, 'rgba(236,68,255,.99)');
  gradient.addColorStop(1, rgba(accent2, .98, '255,74,205'));
  return gradient;
}

export function drawChromaSpectrumMode(context, width, height, data, accent, accent2, time, features = {}) {
  const energy = clamp(features.energy || 0);
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const mobile = width < 760;
  const barCount = mobile ? 68 : 126;
  const baseline = height * .62;
  const maxHeight = height * (.31 + bass * .2 + punch * .09);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#060317');
  background.addColorStop(.33, '#08102b');
  background.addColorStop(.62, '#090b28');
  background.addColorStop(1, '#19041f');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const atmosphere = context.createRadialGradient(width * .5, baseline, 0, width * .5, baseline, width * .62);
  atmosphere.addColorStop(0, 'rgba(81,119,255,.16)');
  atmosphere.addColorStop(.28, rgba(accent, .09));
  atmosphere.addColorStop(.58, rgba(accent2, .075, '255,74,205'));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  const spectrumColor = chromaAt(context, 0, width, accent, accent2);
  const gap = mobile ? 1.4 : 1.7;
  const totalGap = gap * (barCount - 1);
  const barWidth = Math.max(.85, (width * .88 - totalGap) / barCount);
  const startX = width * .06;

  let peaks = PEAKS.get(context);
  if (!peaks || peaks.length !== barCount) {
    peaks = new Float32Array(barCount);
    PEAKS.set(context, peaks);
  }

  const baselineGlow = context.createLinearGradient(0, baseline - height * .06, 0, baseline + height * .06);
  baselineGlow.addColorStop(0, 'rgba(255,255,255,0)');
  baselineGlow.addColorStop(.45, rgba(accent, .1 + energy * .05));
  baselineGlow.addColorStop(.5, 'rgba(238,250,255,.3)');
  baselineGlow.addColorStop(.55, rgba(accent2, .08, '255,74,205'));
  baselineGlow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = baselineGlow;
  context.fillRect(0, baseline - height * .07, width, height * .14);

  for (let i = 0; i < barCount; i += 1) {
    const t = i / (barCount - 1);
    const raw = sample(data, t);
    const shaped = Math.pow(raw, 1.52);
    const contour = .72 + Math.sin(Math.PI * t) * .22;
    const target = clamp(shaped * contour * (1 + energy * .38 + mid * .08));
    peaks[i] = Math.max(target, peaks[i] * (.953 - high * .018));

    const h = Math.max(1, target * maxHeight);
    const reflection = h * (.14 + high * .08);
    const x = startX + i * (barWidth + gap);

    context.globalAlpha = .1 + energy * .05;
    context.fillStyle = spectrumColor;
    context.fillRect(x - .7, baseline - h - 5, barWidth + 1.4, h + reflection + 10);

    context.globalAlpha = .92;
    context.fillStyle = spectrumColor;
    context.fillRect(x, baseline - h, barWidth, h);

    context.globalAlpha = .22 + high * .12;
    context.fillRect(x, baseline + 1, barWidth, reflection);

    const peakY = baseline - peaks[i] * maxHeight - 3;
    context.globalAlpha = .62 + peaks[i] * .3;
    context.fillStyle = i % 5 === 0 ? 'rgba(255,255,255,.98)' : spectrumColor;
    context.fillRect(x, peakY, barWidth, 1.25);
  }
  context.globalAlpha = 1;

  context.strokeStyle = 'rgba(238,250,255,.72)';
  context.lineWidth = .75;
  context.beginPath();
  context.moveTo(startX - 8, baseline);
  context.lineTo(width - startX + 8, baseline);
  context.stroke();

  const titleY = height * .30;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `600 ${Math.max(9, Math.min(12, width * .008))}px Arial, sans-serif`;
  context.fillStyle = 'rgba(223,232,255,.78)';
  context.fillText('SHINOBIWAN', width * .5, titleY - 15);
  context.font = `700 ${Math.max(15, Math.min(25, width * .018))}px Arial, sans-serif`;
  const titleGradient = context.createLinearGradient(width * .38, 0, width * .62, 0);
  titleGradient.addColorStop(0, 'rgba(111,228,255,.96)');
  titleGradient.addColorStop(.5, 'rgba(247,251,255,1)');
  titleGradient.addColorStop(1, 'rgba(238,87,255,.97)');
  context.fillStyle = titleGradient;
  context.fillText('CHROMA SPECTRUM', width * .5, titleY + 5);

  context.font = `500 ${Math.max(8, Math.min(10, width * .0065))}px Arial, sans-serif`;
  context.fillStyle = 'rgba(216,229,255,.55)';
  context.fillText('AUDIO LAB  /  LIVE SPECTRAL FIELD', width * .5, baseline + height * .105);

  const shimmerX = startX + ((time * (.08 + high * .07)) % 1) * (width - startX * 2);
  const shimmer = context.createLinearGradient(shimmerX - width * .05, 0, shimmerX + width * .05, 0);
  shimmer.addColorStop(0, 'rgba(255,255,255,0)');
  shimmer.addColorStop(.5, `rgba(255,255,255,${.08 + high * .16})`);
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = shimmer;
  context.fillRect(shimmerX - width * .05, baseline - maxHeight, width * .1, maxHeight * 1.3);

  const vignette = context.createRadialGradient(width * .5, height * .5, width * .12, width * .5, height * .5, width * .7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.48)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
