const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function sample(data, normalized) {
  if (!data?.length) return 0;
  const position = clamp(normalized) * (data.length - 1);
  const index = Math.floor(position);
  const next = Math.min(data.length - 1, index + 1);
  const mix = position - index;
  return (((data[index] || 0) * (1 - mix)) + ((data[next] || 0) * mix)) / 255;
}

function rgba(color, alpha, fallback = '79, 225, 255') {
  const value = String(color || '').trim();
  const hex = value.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!hex) return `rgba(${fallback}, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawCyberArchitecture(context, width, height, time, bass, mid, energy, punch, accent) {
  const centerX = width * (.53 + Math.sin(time * .18) * .012);
  const centerY = height * .5;
  const scale = Math.min(width, height) * (.42 + bass * .025 + punch * .025);

  const backGlow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, scale * 1.3);
  backGlow.addColorStop(0, rgba(accent, .12 + energy * .07));
  backGlow.addColorStop(.48, 'rgba(33,96,127,.045)');
  backGlow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = backGlow;
  context.fillRect(centerX - scale * 1.5, centerY - scale * 1.25, scale * 3, scale * 2.5);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(Math.sin(time * .22) * .018 + mid * .012);

  const plates = [
    [-.92,-.52,-.22,-.82,.18,-.18,-.46,.08],
    [-.5,-.02,.02,-.42,.66,-.22,.36,.24],
    [-.68,.18,-.18,-.12,.42,.22,.08,.58],
    [.2,-.56,.86,-.3,.62,.04,.08,-.14],
    [.34,.04,.96,.22,.58,.58,.04,.42],
    [-.18,.42,.22,.26,.7,.62,.12,.88]
  ];

  plates.forEach((plate, index) => {
    const [x1,y1,x2,y2,x3,y3,x4,y4] = plate;
    const shade = context.createLinearGradient(-scale, -scale, scale, scale);
    if (index % 2 === 0) {
      shade.addColorStop(0, 'rgba(21,44,58,.96)');
      shade.addColorStop(.52, 'rgba(8,18,26,.97)');
      shade.addColorStop(1, 'rgba(28,16,15,.97)');
    } else {
      shade.addColorStop(0, 'rgba(12,28,39,.97)');
      shade.addColorStop(.62, 'rgba(6,12,18,.98)');
      shade.addColorStop(1, 'rgba(42,18,13,.96)');
    }
    context.fillStyle = shade;
    context.strokeStyle = index % 3 === 0 ? rgba(accent, .55 + energy * .2) : 'rgba(255,112,35,.38)';
    context.lineWidth = 1 + (index % 2) * .45;
    context.beginPath();
    context.moveTo(x1 * scale, y1 * scale);
    context.lineTo(x2 * scale, y2 * scale);
    context.lineTo(x3 * scale, y3 * scale);
    context.lineTo(x4 * scale, y4 * scale);
    context.closePath();
    context.fill();
    context.stroke();
  });

  const coreRadius = scale * (.095 + bass * .035 + punch * .05);
  const core = context.createRadialGradient(0, scale * .08, 0, 0, scale * .08, coreRadius * 3.2);
  core.addColorStop(0, 'rgba(255,252,238,1)');
  core.addColorStop(.14, 'rgba(255,151,56,.98)');
  core.addColorStop(.42, 'rgba(255,71,24,.72)');
  core.addColorStop(1, 'rgba(255,58,18,0)');
  context.fillStyle = core;
  context.beginPath();
  context.arc(0, scale * .08, coreRadius * 3.2, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = rgba(accent, .48 + mid * .24);
  context.lineWidth = 1;
  for (let ring = 0; ring < 4; ring += 1) {
    context.beginPath();
    context.ellipse(0, scale * .08, coreRadius * (1.5 + ring * .48), coreRadius * (.62 + ring * .2), time * .055 + ring * .35, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawOrangeSpectrum(context, width, height, data, bass, high, energy) {
  const startX = width * .07;
  const baseline = height * .78;
  const span = width * .34;
  const bars = width < 800 ? 46 : 72;
  const gap = 2;
  const barWidth = Math.max(1, (span - gap * (bars - 1)) / bars);

  for (let i = 0; i < bars; i += 1) {
    const t = i / (bars - 1);
    const raw = sample(data, t * .5);
    const shaped = Math.pow(raw, 1.55);
    const h = Math.max(2, shaped * height * (.16 + bass * .17));
    const x = startX + i * (barWidth + gap);

    context.globalAlpha = .13 + energy * .08;
    context.fillStyle = 'rgba(255,91,27,.9)';
    context.fillRect(x - 1, baseline - h - 4, barWidth + 2, h + 8);

    context.globalAlpha = .76 + raw * .2;
    context.fillStyle = i % 9 === 0 ? 'rgba(255,238,202,.98)' : 'rgba(255,91,27,.96)';
    context.fillRect(x, baseline - h, barWidth, h);

    context.globalAlpha = .1 + high * .05;
    context.fillRect(x, baseline + 2, barWidth, h * .16);
  }
  context.globalAlpha = 1;
}

function drawLightStreaks(context, width, height, time, high, energy, accent) {
  const count = width < 800 ? 16 : 30;
  for (let i = 0; i < count; i += 1) {
    const seed = i * 2.173;
    const x = (Math.sin(seed * 1.8) * .5 + .5) * width;
    const y = ((Math.cos(seed * 2.6) * .5 + .5) * height + time * (14 + energy * 42) * (i % 3 === 0 ? 1 : .58)) % height;
    const length = 8 + (i % 6) * 6 + high * 24;
    context.globalAlpha = .08 + (i % 4) * .035 + high * .12;
    context.strokeStyle = i % 4 === 0 ? 'rgba(255,101,31,.84)' : rgba(accent, .76);
    context.lineWidth = i % 7 === 0 ? 2 : 1;
    context.beginPath();
    context.moveTo(x - length * .18, y + length * .55);
    context.lineTo(x + length * .18, y - length * .55);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawDiagonalBeams(context, width, height, time, high, energy, accent) {
  const beams = width < 800 ? 5 : 8;
  for (let i = 0; i < beams; i += 1) {
    const offset = ((i / beams + time * (.012 + energy * .008)) % 1.25) - .12;
    const x = width * offset;
    const beamWidth = width * (.018 + high * .008);
    const gradient = context.createLinearGradient(x - beamWidth, 0, x + beamWidth, 0);
    gradient.addColorStop(0, rgba(accent, 0));
    gradient.addColorStop(.46, rgba(accent, .045 + high * .045));
    gradient.addColorStop(.5, 'rgba(205,247,255,.16)');
    gradient.addColorStop(.54, rgba(accent, .045 + high * .045));
    gradient.addColorStop(1, rgba(accent, 0));
    context.save();
    context.translate(width * .5, height * .5);
    context.rotate(-.33);
    context.translate(-width * .5, -height * .5);
    context.fillStyle = gradient;
    context.fillRect(x - beamWidth, -height * .4, beamWidth * 2, height * 1.8);
    context.restore();
  }
}

export function drawNeonHorizonMode(context, width, height, data, accent, accent2, time, features = {}) {
  const bass = clamp(features.bass || 0);
  const mid = clamp(features.mid || 0);
  const high = clamp(features.high || 0);
  const energy = clamp(features.energy || 0);
  const punch = clamp(features.punch || features.kick || 0);

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#020912');
  background.addColorStop(.32, '#071723');
  background.addColorStop(.58, '#0a1018');
  background.addColorStop(.78, '#130b0a');
  background.addColorStop(1, '#210805');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const coolGlow = context.createRadialGradient(width * .33, height * .18, 0, width * .33, height * .18, width * .55);
  coolGlow.addColorStop(0, rgba(accent, .18 + energy * .055));
  coolGlow.addColorStop(.42, rgba(accent, .05));
  coolGlow.addColorStop(1, rgba(accent, 0));
  context.fillStyle = coolGlow;
  context.fillRect(0, 0, width, height);

  const warmGlow = context.createRadialGradient(width * .35, height * .82, 0, width * .35, height * .82, width * .5);
  warmGlow.addColorStop(0, 'rgba(255,80,18,.22)');
  warmGlow.addColorStop(.45, 'rgba(255,57,10,.06)');
  warmGlow.addColorStop(1, 'rgba(255,57,10,0)');
  context.fillStyle = warmGlow;
  context.fillRect(0, 0, width, height);

  drawDiagonalBeams(context, width, height, time, high, energy, accent);
  drawLightStreaks(context, width, height, time, high, energy, accent);
  drawCyberArchitecture(context, width, height, time, bass, mid, energy, punch, accent);
  drawOrangeSpectrum(context, width, height, data, bass, high, energy);

  const lowerBeam = context.createLinearGradient(0, height * .72, 0, height);
  lowerBeam.addColorStop(0, 'rgba(255,72,16,0)');
  lowerBeam.addColorStop(.55, 'rgba(255,72,16,.045)');
  lowerBeam.addColorStop(1, 'rgba(255,72,16,.11)');
  context.fillStyle = lowerBeam;
  context.fillRect(0, height * .68, width, height * .32);

  context.globalAlpha = .07 + high * .07;
  context.fillStyle = 'rgba(220,249,255,.14)';
  for (let y = 0; y < height; y += 5) context.fillRect(0, y, width, 1);
  context.globalAlpha = 1;

  const vignette = context.createRadialGradient(width * .5, height * .48, width * .08, width * .5, height * .48, width * .74);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.5)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}
