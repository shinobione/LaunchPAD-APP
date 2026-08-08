function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function colorWithAlpha(color, alpha) {
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

function average(data, start, end) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  let total = 0;
  for (let index = from; index < to; index += 1) total += data[index] || 0;
  return total / Math.max(1, to - from) / 255;
}

function sampleAt(data, progress) {
  if (!data?.length) return 0;
  const normalized = ((progress % 1) + 1) % 1;
  const index = Math.max(0, Math.min(data.length - 1, Math.floor(normalized * (data.length - 1))));
  return (data[index] || 0) / 255;
}

function feature(features, name) {
  const value = Number(features?.[name]);
  return Number.isFinite(value) ? clamp(value) : 0;
}

function mobileVisualDevice(width) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

function hash(index, seed = 0) {
  const value = Math.sin(index * 91.713 + seed * 47.119) * 43758.5453;
  return value - Math.floor(value);
}

function point(angle, radius) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * Bass Fracture
 *
 * A tectonic, signal-first disc. Bass and kick energy physically separate
 * annular plates, mids twist them, and highs illuminate cracks/edges.
 * There is no self-scheduled animation and all residual drift is gated by
 * actual signal activity so pause/silence settles into a coherent disc.
 */
export function drawBassFractureMode(context, width, height, data, accent, accent2, time, features = {}) {
  const mobile = mobileVisualDevice(width);
  const cx = width / 2;
  const cy = height / 2;
  const minSide = Math.min(width, height);

  const rawBass = average(data, 0, data.length * .18);
  const rawMid = average(data, data.length * .18, data.length * .6);
  const rawHigh = average(data, data.length * .6, data.length);
  const rawEnergy = average(data, 0, data.length);

  const bass = clamp(Math.max(feature(features, 'bass'), Math.pow(rawBass, .68) * 1.3));
  const mid = clamp(Math.max(feature(features, 'mid'), Math.pow(rawMid, .76) * 1.18));
  const high = clamp(Math.max(feature(features, 'high'), Math.pow(rawHigh, .7) * 1.24));
  const energy = clamp(Math.max(feature(features, 'energy'), Math.pow(rawEnergy, .76) * 1.18));
  const kick = feature(features, 'kick');
  const peak = feature(features, 'peak');
  const dynamics = feature(features, 'dynamics');

  const activity = clamp(energy * .7 + bass * .34 + kick * .24 + high * .14);
  const fracture = clamp(
    Math.pow(bass, .62) * .58
    + kick * 1.08
    + Math.max(0, peak - .48) * .72
    + dynamics * .2
  );
  const rupture = clamp(Math.max(0, fracture - .5) * 1.9 + kick * .16);
  const twist = (mid * .09 + high * .022) * activity;
  const drift = time * activity * .038;

  const layerCount = mobile ? 2 : 3;
  const sectorCount = mobile ? 12 : 20;
  const crackCount = mobile ? 10 : 18;
  const shadowCap = mobile ? 4 : 10;
  const baseRadius = minSide * (mobile ? .265 : .29);

  const atmosphereRadius = baseRadius * (1.9 + fracture * .28);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .055 + fracture * .12));
  atmosphere.addColorStop(.38, colorWithAlpha(accent, .025 + bass * .08));
  atmosphere.addColorStop(.78, colorWithAlpha(accent2, .01 + high * .035));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  const sectorSpan = Math.PI * 2 / sectorCount;
  for (let layer = 0; layer < layerCount; layer += 1) {
    const layerProgress = layer / layerCount;
    const innerBase = baseRadius * (.16 + layerProgress * .31);
    const outerBase = baseRadius * (.48 + layerProgress * .34);
    const layerRotation = (layer % 2 ? -1 : 1) * (drift * (.55 + layerProgress * .35) + twist * (layer + 1));

    for (let sector = 0; sector < sectorCount; sector += 1) {
      const progress = (sector + .5) / sectorCount;
      const spectral = Math.pow(sampleAt(data, progress * .82 + layerProgress * .16), .64);
      const lowBias = Math.pow(sampleAt(data, progress * .22), .62);
      const localImpact = clamp(fracture * .54 + rupture * .66 + spectral * .33 + lowBias * bass * .28);
      const personality = hash(sector, layer + 1) * 2 - 1;
      const separation = baseRadius * (
        fracture * (.018 + layerProgress * .02)
        + rupture * (.03 + Math.abs(personality) * .038)
        + spectral * .012
      );
      const radialOffset = separation * (.52 + Math.abs(personality) * .78);
      const tangential = personality * rupture * baseRadius * .022;
      const angleCenter = sector * sectorSpan + layerRotation;
      const start = angleCenter + sectorSpan * (.045 + rupture * .035);
      const end = angleCenter + sectorSpan * (.91 - rupture * .055);
      const inner = innerBase + radialOffset * (.32 + layerProgress * .18);
      const outer = outerBase + radialOffset;

      const [x1, y1] = point(start, inner);
      const [x2, y2] = point(end, inner + personality * rupture * baseRadius * .012);
      const [x3, y3] = point(end + personality * high * .006, outer);
      const [x4, y4] = point(start - personality * high * .008, outer + personality * rupture * baseRadius * .01);
      const tx = -Math.sin(angleCenter) * tangential;
      const ty = Math.cos(angleCenter) * tangential;

      context.beginPath();
      context.moveTo(x1 + tx, y1 + ty);
      context.lineTo(x2 + tx, y2 + ty);
      context.lineTo(x3 + tx, y3 + ty);
      context.lineTo(x4 + tx, y4 + ty);
      context.closePath();

      const plateColor = (sector + layer) % 3 === 0 ? accent2 : accent;
      const fillAlpha = .018 + localImpact * .075 + high * .018;
      context.fillStyle = colorWithAlpha(plateColor, fillAlpha);
      context.fill();

      context.strokeStyle = colorWithAlpha(
        (sector + layer) % 4 === 0 ? '#ffffff' : plateColor,
        .07 + spectral * .32 + high * .19 + rupture * .22
      );
      context.lineWidth = .48 + spectral * 1.05 + rupture * .72;
      context.shadowColor = plateColor;
      context.shadowBlur = Math.min(shadowCap, high * shadowCap + rupture * shadowCap * .45);
      context.stroke();
    }
  }

  context.shadowBlur = 0;

  for (let crack = 0; crack < crackCount; crack += 1) {
    const progress = (crack + .5) / crackCount;
    const spectral = Math.pow(sampleAt(data, .5 + progress * .5), .58);
    const personality = hash(crack, 17) * 2 - 1;
    const drive = clamp(high * .44 + spectral * .72 + rupture * .52 + dynamics * .12);
    const angle = progress * Math.PI * 2 + drift * .2 + personality * mid * .035;
    const inner = baseRadius * (.09 + hash(crack, 5) * .11);
    const middle = baseRadius * (.35 + hash(crack, 8) * .12 + rupture * .06);
    const outer = baseRadius * (.72 + drive * .31 + rupture * .16);
    const bend = personality * (.045 + drive * .065);

    const [x1, y1] = point(angle, inner);
    const [x2, y2] = point(angle + bend, middle);
    const [x3, y3] = point(angle - bend * .55, outer);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.strokeStyle = colorWithAlpha(crack % 3 ? accent2 : '#ffffff', .025 + drive * .48);
    context.lineWidth = .35 + drive * 1.1;
    context.stroke();
  }

  const faultRadius = baseRadius * (.22 + fracture * .08);
  const fault = context.createRadialGradient(0, 0, 0, 0, 0, faultRadius);
  fault.addColorStop(0, colorWithAlpha('#ffffff', .16 + peak * .42));
  fault.addColorStop(.2, colorWithAlpha(accent2, .2 + fracture * .34));
  fault.addColorStop(.65, colorWithAlpha(accent, .06 + bass * .16));
  fault.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = fault;
  context.beginPath();
  context.arc(0, 0, faultRadius, 0, Math.PI * 2);
  context.fill();

  if (rupture > .08) {
    const shardCount = mobile ? 6 : 10;
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 31) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .1;
      const travel = baseRadius * rupture * (.13 + hash(shard, 4) * .16);
      const centerRadius = baseRadius * (.16 + hash(shard, 9) * .18) + travel;
      const size = baseRadius * (.025 + hash(shard, 12) * .035) * (.45 + rupture);
      const [sx, sy] = point(angle, centerRadius);
      context.save();
      context.translate(sx, sy);
      context.rotate(angle + personality * rupture * .7);
      context.beginPath();
      context.moveTo(-size, size * .36);
      context.lineTo(size * .72, -size * .55);
      context.lineTo(size * .45, size * .62);
      context.closePath();
      context.fillStyle = colorWithAlpha(shard % 2 ? accent : accent2, .035 + rupture * .13);
      context.fill();
      context.strokeStyle = colorWithAlpha(shard % 3 ? accent2 : '#ffffff', .08 + rupture * .42);
      context.lineWidth = .4 + rupture * .65;
      context.stroke();
      context.restore();
    }
  }

  context.restore();
}
