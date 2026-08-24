function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function sampleRibbonEnergy(data, progress) {
  if (!data?.length) return 0;
  const curved = Math.pow(clamp(progress), 1.48);
  const center = Math.min(data.length - 1, Math.floor(curved * (data.length - 1) * .94));
  let sum = 0;
  let weight = 0;

  for (let offset = -2; offset <= 2; offset += 1) {
    const index = Math.max(0, Math.min(data.length - 1, center + offset));
    const localWeight = offset === 0 ? 1.7 : Math.abs(offset) === 1 ? 1.15 : .65;
    sum += (data[index] || 0) * localWeight;
    weight += localWeight;
  }

  return clamp(sum / Math.max(1, weight) / 255);
}

function roundedBar(context, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(right, y, right, bottom, r);
  context.arcTo(right, bottom, x, bottom, r);
  context.arcTo(x, bottom, x, y, r);
  context.arcTo(x, y, right, y, r);
  context.closePath();
}

function ribbonHue(progress, time) {
  return (318 + progress * 320 + time * 24) % 360;
}

function rainbowGradient(context, width, time) {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  for (let step = 0; step <= 6; step += 1) {
    const progress = step / 6;
    gradient.addColorStop(progress, `hsl(${ribbonHue(progress, time)} 100% 66%)`);
  }
  return gradient;
}

export function drawNeonRibbonMode(context, width, height, data, accent, accent2, time, features = {}) {
  if (!context || width <= 0 || height <= 0) return;

  const mobile = width <= 720;
  const compact = width <= 980;
  const energy = clamp(features.energy);
  const bass = clamp(features.bass);
  const mid = clamp(features.mid);
  const high = clamp(features.high);
  const kick = clamp(Math.max(features.kick || 0, features.punch || 0));
  const barCount = mobile ? 58 : compact ? 84 : 118;
  const padding = Math.max(14, width * .035);
  const usableWidth = Math.max(1, width - padding * 2);
  const spacing = usableWidth / Math.max(1, barCount - 1);
  const barWidth = Math.max(2, Math.min(mobile ? 4.2 : 5.3, spacing * .58));
  const centerY = height * (.515 + Math.sin(time * .22) * .012);
  const primaryWave = height * (.028 + bass * .078 + kick * .022);
  const secondaryWave = height * (.015 + mid * .04);
  const highRipple = height * (.004 + high * .012);
  const maximumBarHeight = height * (.16 + energy * .2 + kick * .035);
  const minimumBarHeight = Math.max(5, height * .018);
  const samples = [];

  context.save();
  context.fillStyle = 'rgba(4, 2, 12, .54)';
  context.fillRect(0, 0, width, height);

  const aura = context.createRadialGradient(
    width * .5,
    centerY,
    Math.max(8, height * .035),
    width * .5,
    centerY,
    Math.max(width * .58, height * .72)
  );
  aura.addColorStop(0, accent || '#a63cff');
  aura.addColorStop(.42, accent2 || '#5c6cff');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  context.globalAlpha = .055 + energy * .045;
  context.fillStyle = aura;
  context.fillRect(0, 0, width, height);
  context.restore();

  for (let index = 0; index < barCount; index += 1) {
    const progress = index / Math.max(1, barCount - 1);
    const spectral = sampleRibbonEnergy(data, progress);
    const lowBias = Math.pow(1 - progress, 1.85);
    const body = Math.pow(spectral, .72);
    const wave =
      Math.sin(time * (1.02 + bass * .24) + index * .135) * primaryWave
      + Math.sin(time * .47 - index * .064) * secondaryWave
      + Math.sin(time * 1.85 + index * .39) * highRipple;
    const lowLift = kick * lowBias * height * .028 * Math.sin(time * 2.2 + progress * 3.6);
    const y = centerY + wave - lowLift;
    const barHeight = Math.max(
      minimumBarHeight,
      minimumBarHeight
        + body * maximumBarHeight
        + bass * lowBias * height * .032
        + mid * (1 - Math.abs(progress - .5) * 1.35) * height * .012
    );

    samples.push({
      x: padding + progress * usableWidth,
      y,
      height: barHeight,
      hue: ribbonHue(progress, time)
    });
  }

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = mobile ? .26 : .32;
  context.shadowBlur = mobile ? 11 : 18;
  for (const sample of samples) {
    const color = `hsl(${sample.hue} 100% 62%)`;
    context.fillStyle = color;
    context.shadowColor = color;
    roundedBar(
      context,
      sample.x - barWidth / 2,
      sample.y - sample.height / 2,
      barWidth,
      sample.height,
      barWidth
    );
    context.fill();
  }
  context.restore();

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = .92;
  context.shadowBlur = mobile ? 4 : 6;
  for (const sample of samples) {
    const color = `hsl(${sample.hue} 100% 67%)`;
    context.fillStyle = color;
    context.shadowColor = color;
    roundedBar(
      context,
      sample.x - barWidth / 2,
      sample.y - sample.height / 2,
      barWidth,
      sample.height,
      barWidth
    );
    context.fill();
  }
  context.restore();

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = .34 + energy * .12;
  context.strokeStyle = rainbowGradient(context, width, time);
  context.lineWidth = mobile ? .8 : 1.15;
  context.shadowColor = accent2 || '#5c6cff';
  context.shadowBlur = mobile ? 5 : 9;
  context.beginPath();
  samples.forEach((sample, index) => {
    if (index === 0) context.moveTo(sample.x, sample.y);
    else context.lineTo(sample.x, sample.y);
  });
  context.stroke();
  context.restore();

  context.save();
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = mobile ? .075 : .11;
  context.shadowBlur = mobile ? 3 : 6;
  for (const sample of samples) {
    const reflectionHeight = Math.max(3, sample.height * (.2 + energy * .08));
    const reflectionY = sample.y + sample.height * .53 + Math.max(4, height * .014);
    const color = `hsl(${sample.hue} 100% 65%)`;
    context.fillStyle = color;
    context.shadowColor = color;
    roundedBar(
      context,
      sample.x - barWidth / 2,
      reflectionY,
      barWidth,
      reflectionHeight,
      barWidth
    );
    context.fill();
  }
  context.restore();
}
