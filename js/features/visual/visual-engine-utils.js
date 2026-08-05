export function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function colorWithAlpha(color, alpha) {
  const value = clamp(alpha);
  const six = /^#([0-9a-f]{6})$/i.exec(color);
  if (six) {
    const number = Number.parseInt(six[1], 16);
    return `rgba(${number >> 16},${number >> 8 & 255},${number & 255},${value})`;
  }
  const three = /^#([0-9a-f]{3})$/i.exec(color);
  if (three) {
    const [red, green, blue] = three[1].split('').map(part => Number.parseInt(part + part, 16));
    return `rgba(${red},${green},${blue},${value})`;
  }
  return color;
}

export function seeded(index, salt = 0) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function sampleSpectrum(signal, progress) {
  const spectrum = signal?.spectrum;
  if (!spectrum?.length) return 0;
  const index = Math.max(0, Math.min(spectrum.length - 1, Math.floor(progress * spectrum.length)));
  return spectrum[index] / 255;
}

export function prepareCanvas(canvas) {
  const rect = canvas?.getBoundingClientRect();
  if (!canvas || !rect?.width || !rect?.height) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const widthPx = Math.round(rect.width * dpr);
  const heightPx = Math.round(rect.height * dpr);
  if (canvas.width !== widthPx || canvas.height !== heightPx) {
    canvas.width = widthPx;
    canvas.height = heightPx;
  }
  const context = canvas.getContext('2d');
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  return { context, width: rect.width, height: rect.height };
}

export function polygonPath(context, centerX, centerY, radius, sides, rotation = 0, squeeze = 1) {
  context.beginPath();
  for (let side = 0; side <= sides; side += 1) {
    const angle = side / sides * Math.PI * 2 + rotation;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * squeeze;
    if (!side) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

export function drawSoftVignette(context, width, height, strength = .55) {
  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * .16,
    width / 2,
    height / 2,
    Math.max(width, height) * .72
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, `rgba(0,0,0,${clamp(strength)})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}
