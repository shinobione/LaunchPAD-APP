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

export function drawChromaSpectrumMode(context, width, height, data, accent, accent2, time, features = {}) {
  const energy = clamp(features.energy || 0);
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const punch = clamp(features.punch || features.kick || 0);
  const mobile = width < 760;
  const barCount = mobile ? 34 : 64;
  const baseline = height * .79;
  const maxHeight = height * (.5 + bass * .18 + punch * .1);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#020611');
  background.addColorStop(.44, '#07091a');
  background.addColorStop(.7, '#0b071d');
  background.addColorStop(1, '#16051b');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const atmosphere = context.createRadialGradient(width * .54, baseline * .66, 0, width * .54, baseline * .66, width * .56);
  atmosphere.addColorStop(0, rgba(accent2, .15 + energy * .05, '198, 66, 255'));
  atmosphere.addColorStop(.34, rgba(accent, .11));
  atmosphere.addColorStop(.74, rgba(accent2, .035, '198,66,255'));
  atmosphere.addColorStop(1, rgba(accent, 0));
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  let peaks = PEAKS.get(context);
  if (!peaks || peaks.length !== barCount) {
    peaks = new Float32Array(barCount);
    PEAKS.set(context, peaks);
  }

  const gap = mobile ? 4 : 5;
  const totalGap = gap * (barCount - 1);
  const barWidth = Math.max(2, (width - totalGap) / barCount);
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, rgba(accent, .98));
  gradient.addColorStop(.28, 'rgba(103,235,255,.98)');
  gradient.addColorStop(.5, 'rgba(250,252,255,1)');
  gradient.addColorStop(.72, 'rgba(199,94,255,.98)');
  gradient.addColorStop(1, rgba(accent2, .98, '255,70,210'));

  const points = [];
  for (let i = 0; i < barCount; i += 1) {
    const t = i / (barCount - 1);
    const index = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[index] || 0) / 255;
    const neighbor = (data[Math.min(data.length - 1, index + 1)] || 0) / 255;
    const shaped = Math.pow(raw * .76 + neighbor * .24, 1.38);
    const arch = .72 + Math.sin(Math.PI * t) * (.3 + mid * .08);
    const breathing = 1 + Math.sin(time * .8 + t * 7) * (.035 + mid * .04);
    const target = clamp(shaped * arch * breathing * (1 + energy * .38));
    peaks[i] = Math.max(target, peaks[i] * (.95 - high * .025));

    const h = Math.max(2, target * maxHeight);
    const x = i * (barWidth + gap);
    const y = baseline - h;
    const centerX = x + barWidth * .5;
    points.push([centerX, y]);

    const depthEcho = h * (.15 + .08 * Math.sin(time * 1.1 + i * .34));
    context.globalAlpha = .09 + energy * .05;
    context.fillStyle = gradient;
    context.fillRect(x + barWidth * .18, y - depthEcho - 8, barWidth * .64, h + depthEcho + 16);

    context.globalAlpha = .22 + energy * .06;
    context.fillStyle = gradient;
    context.fillRect(x - 1, y - 5, barWidth + 2, h + 10);

    context.globalAlpha = .97;
    context.fillStyle = gradient;
    const cap = Math.min(4, barWidth * .45);
    context.fillRect(x, y + cap, barWidth, Math.max(0, h - cap));
    context.beginPath();
    context.roundRect?.(x, y, barWidth, Math.min(h, cap * 2.2), cap);
    if (context.roundRect) context.fill();
    else context.fillRect(x, y, barWidth, Math.min(h, cap * 2));

    const peakY = baseline - peaks[i] * maxHeight;
    context.globalAlpha = .86;
    context.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,.98)' : gradient;
    context.fillRect(x, peakY - 4, barWidth, 2);
  }
  context.globalAlpha = 1;

  context.strokeStyle = 'rgba(255,255,255,.62)';
  context.lineWidth = 1.15;
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y - 5);
    else context.lineTo(x, y - 5);
  });
  context.stroke();

  context.globalAlpha = .22 + high * .14;
  context.strokeStyle = gradient;
  context.lineWidth = 2.4;
  context.beginPath();
  points.forEach(([x, y], index) => {
    const waveY = y - 10 - Math.sin(time * 2.1 + index * .32) * (2 + high * 6);
    if (index === 0) context.moveTo(x, waveY);
    else context.lineTo(x, waveY);
  });
  context.stroke();
  context.globalAlpha = 1;

  const floorGlow = context.createLinearGradient(0, baseline - 16, 0, height);
  floorGlow.addColorStop(0, 'rgba(255,255,255,.2)');
  floorGlow.addColorStop(.12, rgba(accent, .14));
  floorGlow.addColorStop(.48, rgba(accent2, .04, '255,70,210'));
  floorGlow.addColorStop(1, rgba(accent2, 0, '255,70,210'));
  context.fillStyle = floorGlow;
  context.fillRect(0, baseline - 16, width, height - baseline + 16);

  context.globalAlpha = .1 + high * .08;
  context.save();
  context.translate(0, baseline * 2 + height * .05);
  context.scale(1, -0.22);
  context.fillStyle = gradient;
  for (let i = 0; i < barCount; i += 1) {
    const t = i / (barCount - 1);
    const index = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[index] || 0) / 255;
    const h = Math.max(1, Math.pow(raw, 1.35) * maxHeight * .52);
    const x = i * (barWidth + gap);
    context.fillRect(x, baseline - h, barWidth, h);
  }
  context.restore();
  context.globalAlpha = 1;

  const sparkCount = mobile ? 16 : 30;
  for (let i = 0; i < sparkCount; i += 1) {
    const t = (i + .5) / sparkCount;
    const index = Math.min(data.length - 1, Math.floor(t * data.length));
    const raw = (data[index] || 0) / 255;
    if (raw < .18) continue;
    const x = t * width + Math.sin(time * 1.3 + i * 2.11) * 8;
    const y = baseline - raw * maxHeight - 16 - Math.abs(Math.sin(time * 1.7 + i)) * (8 + high * 20);
    context.globalAlpha = clamp(raw * (.42 + high * .55));
    context.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,.98)' : (i % 2 === 0 ? rgba(accent, .9) : rgba(accent2, .9, '255,70,210'));
    context.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
  }
  context.globalAlpha = 1;

  const sweepX = ((time * (.085 + high * .08 + energy * .04)) % 1) * width;
  const sweep = context.createLinearGradient(sweepX - width * .09, 0, sweepX + width * .09, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)');
  sweep.addColorStop(.42, rgba(accent, .03));
  sweep.addColorStop(.5, `rgba(255,255,255,${.11 + high * .16})`);
  sweep.addColorStop(.58, rgba(accent2, .04, '255,70,210'));
  sweep.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = sweep;
  context.fillRect(sweepX - width * .09, 0, width * .18, baseline);
}
