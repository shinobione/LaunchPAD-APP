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

function spectrumGradient(context, width, accent, accent2) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, rgba(accent, .98));
  gradient.addColorStop(.16, 'rgba(30,222,255,.99)');
  gradient.addColorStop(.38, 'rgba(87,232,255,1)');
  gradient.addColorStop(.5, 'rgba(238,251,255,1)');
  gradient.addColorStop(.62, 'rgba(170,118,255,.99)');
  gradient.addColorStop(.82, 'rgba(235,55,255,.99)');
  gradient.addColorStop(1, rgba(accent2, .98, '255,63,198'));
  return gradient;
}

export function drawChromaSpectrumMode(context, width, height, data, accent, accent2, time, features = {}) {
  const energy = clamp(features.energy || 0);
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const mobile = width < 760;
  const barCount = mobile ? 92 : 176;
  const baseline = height * .61;
  const maxHeight = height * (.28 + bass * .22 + punch * .1);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#0a031a');
  background.addColorStop(.25, '#091433');
  background.addColorStop(.52, '#0d1030');
  background.addColorStop(.78, '#16072b');
  background.addColorStop(1, '#26051f');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const upperGlow = context.createRadialGradient(width * .47, height * .38, 0, width * .47, height * .38, width * .52);
  upperGlow.addColorStop(0, 'rgba(66,116,255,.12)');
  upperGlow.addColorStop(.42, rgba(accent2, .055, '224,69,255'));
  upperGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = upperGlow;
  context.fillRect(0, 0, width, height);

  const spectrumColor = spectrumGradient(context, width, accent, accent2);
  const span = width * .9;
  const startX = width * .05;
  const gap = mobile ? .75 : .9;
  const barWidth = Math.max(.7, (span - gap * (barCount - 1)) / barCount);

  let peaks = PEAKS.get(context);
  if (!peaks || peaks.length !== barCount) {
    peaks = new Float32Array(barCount);
    PEAKS.set(context, peaks);
  }

  const floorGlow = context.createLinearGradient(0, baseline - height * .1, 0, baseline + height * .1);
  floorGlow.addColorStop(0, 'rgba(255,255,255,0)');
  floorGlow.addColorStop(.44, rgba(accent, .05 + energy * .03));
  floorGlow.addColorStop(.5, 'rgba(230,248,255,.18)');
  floorGlow.addColorStop(.56, rgba(accent2, .045, '255,63,198'));
  floorGlow.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = floorGlow;
  context.fillRect(0, baseline - height * .11, width, height * .22);

  for (let i = 0; i < barCount; i += 1) {
    const t = i / (barCount - 1);
    const raw = sample(data, t);
    const neighbor = sample(data, clamp(t + .006));
    const shaped = Math.pow(raw * .8 + neighbor * .2, 1.62);
    const musicalContour = .74 + Math.sin(Math.PI * t) * .2 + Math.sin(t * 17 + time * .22) * .025 * mid;
    const target = clamp(shaped * musicalContour * (1 + energy * .4));
    peaks[i] = Math.max(target, peaks[i] * (.962 - high * .018));

    const h = Math.max(.75, target * maxHeight);
    const x = startX + i * (barWidth + gap);

    context.globalAlpha = .075 + energy * .035;
    context.fillStyle = spectrumColor;
    context.fillRect(x - .5, baseline - h - 3, barWidth + 1, h + 6);

    context.globalAlpha = .94;
    context.fillStyle = spectrumColor;
    context.fillRect(x, baseline - h, barWidth, h);

    const reflection = h * (.12 + high * .055);
    context.globalAlpha = .14 + high * .05;
    context.fillRect(x, baseline + 1, barWidth, reflection);

    const peakY = baseline - peaks[i] * maxHeight - 2;
    context.globalAlpha = .38 + peaks[i] * .26;
    context.fillStyle = i % 8 === 0 ? 'rgba(245,253,255,.9)' : spectrumColor;
    context.fillRect(x, peakY, barWidth, .8);
  }
  context.globalAlpha = 1;

  const axis = context.createLinearGradient(0, 0, width, 0);
  axis.addColorStop(0, 'rgba(255,255,255,0)');
  axis.addColorStop(.08, rgba(accent, .42));
  axis.addColorStop(.5, 'rgba(245,253,255,.78)');
  axis.addColorStop(.92, rgba(accent2, .42, '255,63,198'));
  axis.addColorStop(1, 'rgba(255,255,255,0)');
  context.strokeStyle = axis;
  context.lineWidth = .65;
  context.beginPath();
  context.moveTo(startX, baseline);
  context.lineTo(width - startX, baseline);
  context.stroke();

  const haze = context.createRadialGradient(width * .5, baseline, 0, width * .5, baseline, width * .48);
  haze.addColorStop(0, `rgba(204,219,255,${.035 + energy * .025})`);
  haze.addColorStop(.42, rgba(accent2, .022, '255,63,198'));
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = haze;
  context.fillRect(0, baseline - height * .2, width, height * .4);

  const vignette = context.createRadialGradient(width * .5, height * .5, width * .12, width * .5, height * .5, width * .72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.5)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
