const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

function average(data, start, end) {
  const from = Math.max(0, Math.floor(start));
  const to = Math.min(data.length, Math.ceil(end));
  let total = 0;
  for (let index = from; index < to; index += 1) total += data[index];
  return total / Math.max(1, to - from) / 255;
}

export function readFrequencyBands(data) {
  return {
    bass: average(data, 0, data.length * .16),
    mid: average(data, data.length * .16, data.length * .58),
    high: average(data, data.length * .58, data.length),
    energy: average(data, 0, data.length)
  };
}

export function createAudioReactivityTracker({ attack = .68, release = .16, transientDecay = .82 } = {}) {
  const envelope = { bass: 0, mid: 0, high: 0, energy: 0 };
  let previousBass = 0;
  let kick = 0;

  return {
    update(data) {
      const raw = readFrequencyBands(data);
      for (const band of ['bass', 'mid', 'high', 'energy']) {
        const coefficient = raw[band] > envelope[band] ? attack : release;
        envelope[band] += (raw[band] - envelope[band]) * coefficient;
      }

      const bassRise = Math.max(0, raw.bass - previousBass);
      const bassAboveEnvelope = Math.max(0, raw.bass - envelope.bass * .9);
      const kickTarget = clamp((bassRise - .012) * 8.5 + bassAboveEnvelope * 3.2);
      kick = Math.max(kick * transientDecay, kickTarget);
      previousBass = raw.bass;

      return {
        bass: clamp(envelope.bass),
        mid: clamp(envelope.mid),
        high: clamp(envelope.high),
        energy: clamp(envelope.energy),
        kick: clamp(kick),
        presence: clamp(envelope.mid * .72 + envelope.high * .28),
        sparkle: clamp(envelope.high * 1.15),
        intensity: clamp(envelope.energy * .72 + envelope.bass * .28 + kick * .22)
      };
    }
  };
}

export function createAmplitudeDynamicsTracker({
  attack = .52,
  release = .065,
  peakDecay = .9,
  noiseFloor = .012,
  loudCeiling = .24
} = {}) {
  let loudness = 0;
  let peakHold = 0;

  return {
    update({ rms = 0, peak = 0 } = {}) {
      const normalizedRms = clamp((rms - noiseFloor) / Math.max(.001, loudCeiling - noiseFloor));
      const normalizedPeak = clamp((peak - noiseFloor * 1.5) / Math.max(.001, .82 - noiseFloor * 1.5));
      const coefficient = normalizedRms > loudness ? attack : release;
      loudness += (normalizedRms - loudness) * coefficient;
      peakHold = Math.max(normalizedPeak, peakHold * peakDecay);
      const dynamics = clamp(Math.pow(loudness, .78) * .76 + peakHold * .24);
      return {
        rms: clamp(loudness),
        peak: clamp(peakHold),
        dynamics,
        rawRms: clamp(rms),
        rawPeak: clamp(peak)
      };
    }
  };
}

export function shapeReactiveSpectrum(raw, target, features) {
  const length = Math.min(raw.length, target.length);
  for (let index = 0; index < length; index += 1) {
    const progress = index / Math.max(1, length - 1);
    const lowWeight = Math.pow(1 - progress, 3.1);
    const midWeight = Math.max(0, 1 - Math.abs(progress - .38) / .32);
    const highWeight = Math.pow(progress, 1.45);
    const normalized = Math.pow(raw[index] / 255, .68);
    const gain = 1
      + lowWeight * (features.bass * .72 + features.kick * 1.25)
      + midWeight * features.mid * .42
      + highWeight * features.high * .58
      + features.energy * .18;
    target[index] = Math.max(0, Math.min(255, Math.round(normalized * gain * 255)));
  }
  return target;
}
