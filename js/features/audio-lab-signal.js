const PATCH_MARK = Symbol.for('shinobi.audioLabSignalPatch');
const ACTIVE_CONTEXTS = new Set();

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function synthesizePlaybackSpectrum(target, currentTime = 0) {
  const time = Number.isFinite(Number(currentTime)) ? Number(currentTime) : 0;
  const length = Math.max(1, target.length);
  const beat = Math.pow((Math.sin(time * Math.PI * 2 * 1.85) + 1) / 2, 5);
  const halfBeat = Math.pow((Math.sin(time * Math.PI * 2 * .925 + .7) + 1) / 2, 4);

  for (let index = 0; index < length; index += 1) {
    const progress = index / length;
    const lowWeight = Math.pow(1 - progress, 2.35);
    const shimmer = (Math.sin(time * (5.2 + progress * 6.4) + index * .41) + 1) / 2;
    const movement = (Math.sin(time * 2.4 - index * .17) + 1) / 2;
    const value = 9
      + lowWeight * (58 + beat * 122 + halfBeat * 44)
      + shimmer * (10 + progress * 30)
      + movement * 9;
    target[index] = clampByte(value);
  }

  return target;
}

export function waveformToSpectrum(target, waveform) {
  if (!waveform?.length || !target?.length) return 0;
  let energy = 0;
  for (let index = 0; index < waveform.length; index += 1) {
    const centered = (waveform[index] - 128) / 128;
    energy += centered * centered;
  }
  const rms = Math.sqrt(energy / waveform.length);
  if (rms < .0035) return rms;

  for (let index = 0; index < target.length; index += 1) {
    const progress = index / target.length;
    const waveformIndex = Math.floor(progress * (waveform.length - 1));
    const nextIndex = Math.min(waveform.length - 1, waveformIndex + 7);
    const local = Math.abs(waveform[waveformIndex] - 128) / 128;
    const neighbour = Math.abs(waveform[nextIndex] - 128) / 128;
    const lowWeight = Math.pow(1 - progress, 1.65);
    target[index] = clampByte((local * .7 + neighbour * .3) * 210 + rms * 180 * lowWeight);
  }

  return rms;
}

function signalPeak(data) {
  let peak = 0;
  for (let index = 0; index < data.length; index += 1) peak = Math.max(peak, data[index]);
  return peak;
}

function markSignal(state) {
  if (typeof document !== 'undefined') document.documentElement.dataset.audioLabSignal = state;
}

function patchAnalyser(analyser, audio) {
  if (!analyser || analyser[PATCH_MARK]) return analyser;

  const nativeFrequency = analyser.getByteFrequencyData.bind(analyser);
  const nativeWaveform = analyser.getByteTimeDomainData.bind(analyser);
  let silentFrames = 0;
  let previousTime = Number(audio.currentTime) || 0;
  let waveform = new Uint8Array(Math.max(32, analyser.fftSize || 256));

  const resilientFrequencyData = target => {
    nativeFrequency(target);
    const peak = signalPeak(target);
    const currentTime = Number(audio.currentTime) || 0;
    const playing = !audio.paused && !audio.ended;
    const advancing = currentTime > previousTime + .0005;
    previousTime = currentTime;

    if (peak > 2) {
      silentFrames = 0;
      markSignal('live');
      return;
    }

    silentFrames = playing && advancing ? silentFrames + 1 : 0;
    if (silentFrames < 8) {
      markSignal(playing ? 'warming' : 'idle');
      return;
    }

    if (waveform.length !== Math.max(32, analyser.fftSize || 256)) {
      waveform = new Uint8Array(Math.max(32, analyser.fftSize || 256));
    }
    nativeWaveform(waveform);
    const rms = waveformToSpectrum(target, waveform);
    if (rms >= .0035 && signalPeak(target) > 2) {
      markSignal('waveform');
      return;
    }

    synthesizePlaybackSpectrum(target, currentTime);
    markSignal('fallback');
  };

  try {
    Object.defineProperty(analyser, 'getByteFrequencyData', {
      configurable: true,
      value: resilientFrequencyData
    });
    Object.defineProperty(analyser, PATCH_MARK, { value: true });
  } catch {
    analyser.getByteFrequencyData = resilientFrequencyData;
    analyser[PATCH_MARK] = true;
  }

  return analyser;
}

function patchAudioContextClass(AudioContextClass, audio) {
  const prototype = AudioContextClass?.prototype;
  if (!prototype || prototype[PATCH_MARK]) return;

  const nativeCreateAnalyser = prototype.createAnalyser;
  if (typeof nativeCreateAnalyser !== 'function') return;

  prototype.createAnalyser = function createResilientAnalyser(...args) {
    ACTIVE_CONTEXTS.add(this);
    return patchAnalyser(nativeCreateAnalyser.apply(this, args), audio);
  };

  try {
    Object.defineProperty(prototype, PATCH_MARK, { value: true });
  } catch {
    prototype[PATCH_MARK] = true;
  }
}

async function resumeContexts() {
  await Promise.allSettled([...ACTIVE_CONTEXTS].map(context => {
    if (context.state === 'suspended' || context.state === 'interrupted') return context.resume();
    return Promise.resolve();
  }));
}

export function initAudioLabSignalBridge({ audio }) {
  if (!audio || globalThis.__shinobiAudioLabSignalReady) return;
  globalThis.__shinobiAudioLabSignalReady = true;

  audio.crossOrigin = 'anonymous';
  patchAudioContextClass(globalThis.AudioContext, audio);
  if (globalThis.webkitAudioContext && globalThis.webkitAudioContext !== globalThis.AudioContext) {
    patchAudioContextClass(globalThis.webkitAudioContext, audio);
  }

  const recover = () => { resumeContexts(); };
  audio.addEventListener('play', recover);
  audio.addEventListener('playing', recover);
  audio.addEventListener('loadeddata', recover);
  window.addEventListener('pageshow', recover);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !audio.paused) recover();
  });
  document.querySelector('#view-lab')?.addEventListener('pointerdown', recover, { passive: true });

  markSignal('idle');
}
