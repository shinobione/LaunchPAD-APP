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
 * Bass Fracture — clearer, harder plate motion.
 *
 * Large annular plates remain the visual subject. Bass/kicks separate them,
 * mids twist layer groups and highs reveal a restrained set of fault lines.
 * Mobile gets stronger displacement, not more geometry.
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

  const activity = clamp(energy * .68 + bass * .36 + kick * .26 + high * .1);
  const fractureBase = clamp(
    Math.pow(bass, .62) * .6
    + kick * 1.08
    + Math.max(0, peak - .48) * .7
    + dynamics * .18
  );
  const motionScale = mobile ? 1.42 : 1.08;
  const fracture = clamp(fractureBase * (mobile ? 1.12 : 1.02));
  const rupture = clamp((Math.max(0, fracture - .46) * 2.05 + kick * .18) * motionScale);
  const twist = (mid * .085 + high * .018) * activity;
  const drift = time * activity * .03;

  // Fewer desktop sectors/cracks than Build 53 for better plate readability.
  const layerCount = mobile ? 2 : 3;
  const sectorCount = mobile ? 12 : 16;
  const crackCount = mobile ? 8 : 12;
  const shadowCap = mobile ? 4 : 9;
  const baseRadius = minSide * (mobile ? .305 : .305);

  const atmosphereRadius = baseRadius * (1.82 + fracture * .3);
  const atmosphere = context.createRadialGradient(cx, cy, 0, cx, cy, atmosphereRadius);
  atmosphere.addColorStop(0, colorWithAlpha(accent2, .045 + fracture * .11));
  atmosphere.addColorStop(.42, colorWithAlpha(accent, .018 + bass * .065));
  atmosphere.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = atmosphere;
  context.fillRect(0, 0, width, height);

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';

  const sectorSpan = Math.PI * 2 / sectorCount;
  for (let layer = 0; layer < layerCount; layer += 1) {
    const layerProgress = layer / Math.max(1, layerCount - 1);
    const innerBase = baseRadius * (.14 + layerProgress * .3);
    const outerBase = baseRadius * (.5 + layerProgress * .32);
    const layerRotation = (layer % 2 ? -1 : 1) * (drift * (.46 + layerProgress * .28) + twist * (layer + 1));
    const layerWeight = 1 - layerProgress * .22;

    for (let sector = 0; sector < sectorCount; sector += 1) {
      const progress = (sector + .5) / sectorCount;
      const spectral = Math.pow(sampleAt(data, progress * .8 + layerProgress * .14), .64);
      const lowBias = Math.pow(sampleAt(data, progress * .22), .62);
      const personality = hash(sector, layer + 1) * 2 - 1;
      const plateDrive = clamp(fracture * .5 + rupture * .72 + spectral * .26 + lowBias * bass * .28);
      const separation = baseRadius * motionScale * (
        fracture * (.018 + layerProgress * .018)
        + rupture * (.034 + Math.abs(personality) * .04)
        + spectral * .01
      );
      const radialOffset = separation * (.62 + Math.abs(personality) * .82) * layerWeight;
      const tangential = personality * rupture * baseRadius * .029 * motionScale;
      const angleCenter = sector * sectorSpan + layerRotation;
      const gapScale = .06 + rupture * .08;
      const start = angleCenter + sectorSpan * gapScale;
      const end = angleCenter + sectorSpan * (.94 - gapScale);
      const inner = innerBase + radialOffset * (.28 + layerProgress * .14);
      const outer = outerBase + radialOffset;

      const [x1, y1] = point(start, inner);
      const [x2, y2] = point(end, inner + personality * rupture * baseRadius * .012);
      const [x3, y3] = point(end + personality * high * .005, outer);
      const [x4, y4] = point(start - personality * high * .006, outer + personality * rupture * baseRadius * .012);
      const tx = -Math.sin(angleCenter) * tangential;
      const ty = Math.cos(angleCenter) * tangential;

      context.beginPath();
      context.moveTo(x1 + tx, y1 + ty);
      context.lineTo(x2 + tx, y2 + ty);
      context.lineTo(x3 + tx, y3 + ty);
      context.lineTo(x4 + tx, y4 + ty);
      context.closePath();

      const plateColor = (sector + layer) % 3 === 0 ? accent2 : accent;
      context.fillStyle = colorWithAlpha(plateColor, .022 + plateDrive * .085);
      context.fill();
      context.strokeStyle = colorWithAlpha(
        (sector + layer) % 5 === 0 ? '#ffffff' : plateColor,
        .08 + spectral * .26 + high * .12 + rupture * .24
      );
      context.lineWidth = .6 + spectral * .9 + rupture * .78;
      context.shadowColor = plateColor;
      context.shadowBlur = Math.min(shadowCap, high * shadowCap * .6 + rupture * shadowCap * .36);
      context.stroke();
    }
  }

  context.shadowBlur = 0;

  // Fault lines are deliberately fewer; each one travels further on impact.
  for (let crack = 0; crack < crackCount; crack += 1) {
    const progress = (crack + .5) / crackCount;
    const spectral = Math.pow(sampleAt(data, .5 + progress * .5), .58);
    const personality = hash(crack, 17) * 2 - 1;
    const drive = clamp(high * .4 + spectral * .66 + rupture * .54 + dynamics * .1);
    if (drive < .08) continue;
    const angle = progress * Math.PI * 2 + drift * .12 + personality * mid * .025;
    const inner = baseRadius * (.1 + hash(crack, 5) * .1);
    const middle = baseRadius * (.36 + hash(crack, 8) * .1 + rupture * .07);
    const outer = baseRadius * (.76 + drive * .28 + rupture * .22 * motionScale);
    const bend = personality * (.04 + drive * .055);

    const [x1, y1] = point(angle, inner);
    const [x2, y2] = point(angle + bend, middle);
    const [x3, y3] = point(angle - bend * .5, outer);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.strokeStyle = colorWithAlpha(crack % 3 ? accent2 : '#ffffff', .025 + drive * .42);
    context.lineWidth = .4 + drive * 1.05;
    context.stroke();
  }

  const faultRadius = baseRadius * (.2 + fracture * .09);
  const fault = context.createRadialGradient(0, 0, 0, 0, 0, faultRadius);
  fault.addColorStop(0, colorWithAlpha('#ffffff', .14 + peak * .38));
  fault.addColorStop(.22, colorWithAlpha(accent2, .18 + fracture * .3));
  fault.addColorStop(.68, colorWithAlpha(accent, .04 + bass * .12));
  fault.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = fault;
  context.beginPath();
  context.arc(0, 0, faultRadius, 0, Math.PI * 2);
  context.fill();

  if (rupture > .14) {
    const shardCount = mobile ? 5 : 7;
    for (let shard = 0; shard < shardCount; shard += 1) {
      const progress = (shard + .5) / shardCount;
      const personality = hash(shard, 31) * 2 - 1;
      const angle = progress * Math.PI * 2 + personality * .08;
      const travel = baseRadius * rupture * motionScale * (.15 + hash(shard, 4) * .16);
      const centerRadius = baseRadius * (.18 + hash(shard, 9) * .16) + travel;
      const size = baseRadius * (.028 + hash(shard, 12) * .032) * (.5 + rupture * .85);
      const [sx, sy] = point(angle, centerRadius);
      context.save();
      context.translate(sx, sy);
      context.rotate(angle + personality * rupture * .55);
      context.beginPath();
      context.moveTo(-size, size * .34);
      context.lineTo(size * .72, -size * .52);
      context.lineTo(size * .44, size * .6);
      context.closePath();
      context.fillStyle = colorWithAlpha(shard % 2 ? accent : accent2, .035 + rupture * .14);
      context.fill();
      context.strokeStyle = colorWithAlpha(shard % 3 ? accent2 : '#ffffff', .08 + rupture * .4);
      context.lineWidth = .4 + rupture * .62;
      context.stroke();
      context.restore();
    }
  }

  // A single readable fracture front on large impacts.
  if (rupture > .52) {
    const frontRadius = baseRadius * (.7 + rupture * .32);
    context.beginPath();
    context.arc(0, 0, frontRadius, 0, Math.PI * 2);
    context.strokeStyle = colorWithAlpha(accent2, (rupture - .52) * .32);
    context.lineWidth = .75 + rupture * .9;
    context.stroke();
  }

  context.restore();
}
