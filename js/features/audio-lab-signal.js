const PATCH_MARK = Symbol.for('shinobi.audioLabSignalPatch');
const MIRROR_PROXY_MARK = Symbol.for('shinobi.audioLabMirrorProxy');
const ACTIVE_CONTEXTS = new Set();
const MIRROR_PROXIES = new Set();
let ACTIVE_ANALYSER = null;
let METER_STATE = 'idle';

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

function markMeter(state) {
  METER_STATE = state;
  if (typeof document !== 'undefined') document.documentElement.dataset.audioLabMeter = state;
}

function analysisViewActive() {
  if (typeof document === 'undefined' || document.hidden) return false;
  return document.querySelector('#view-lab')?.classList.contains('active') === true
    || document.querySelector('#view-home')?.classList.contains('active') === true;
}

export function readAudioLabSpectrum(target) {
  if (!target?.length) return { available: false, peak: 0, state: 'invalid-target' };
  if (!ACTIVE_ANALYSER) {
    target.fill(0);
    markSignal('awaiting-context');
    return { available: false, peak: 0, state: 'awaiting-context' };
  }

  ACTIVE_ANALYSER.getByteFrequencyData(target);
  const peak = signalPeak(target);
  const state = typeof document !== 'undefined'
    ? document.documentElement.dataset.audioLabSignal || (peak > 2 ? 'live' : METER_STATE)
    : (peak > 2 ? 'live' : METER_STATE);
  return { available: true, peak, state };
}

export function readAudioLabAmplitude(target) {
  if (!target?.length) return { available: false, rms: 0, peak: 0, state: 'invalid-target' };
  if (!ACTIVE_ANALYSER) {
    target.fill(128);
    return { available: false, rms: 0, peak: 0, state: 'awaiting-context' };
  }

  ACTIVE_ANALYSER.getByteTimeDomainData(target);
  let energy = 0;
  let peak = 0;
  for (let index = 0; index < target.length; index += 1) {
    const centered = (target[index] - 128) / 128;
    const magnitude = Math.abs(centered);
    energy += centered * centered;
    if (magnitude > peak) peak = magnitude;
  }
  const rms = Math.sqrt(energy / target.length);
  return {
    available: true,
    rms,
    peak,
    state: rms > .0035 || peak > .01 ? 'live' : METER_STATE
  };
}

function patchAnalyser(analyser, audio) {
  if (!analyser) return analyser;
  if (analyser[PATCH_MARK]) {
    ACTIVE_ANALYSER = analyser;
    return analyser;
  }

  const nativeFrequency = analyser.getByteFrequencyData.bind(analyser);
  const nativeConnect = analyser.connect.bind(analyser);
  let silentSink = null;

  const resilientFrequencyData = target => {
    nativeFrequency(target);
    const peak = signalPeak(target);
    const playing = !audio.paused && !audio.ended;
    if (peak > 2) {
      markSignal('live');
      return;
    }
    if (!playing) {
      markSignal('idle');
      return;
    }
    markSignal(METER_STATE === 'running' ? 'mirror-silent' : METER_STATE || 'warming-mirror');
  };

  const meteringOnlyConnect = (destination, ...args) => {
    if (destination === analyser.context?.destination) {
      if (!silentSink) {
        silentSink = analyser.context.createGain();
        silentSink.gain.value = 0;
        nativeConnect(silentSink);
        silentSink.connect(analyser.context.destination);
      }
      return destination;
    }
    return nativeConnect(destination, ...args);
  };

  try {
    Object.defineProperty(analyser, 'getByteFrequencyData', {
      configurable: true,
      value: resilientFrequencyData
    });
    Object.defineProperty(analyser, 'connect', {
      configurable: true,
      value: meteringOnlyConnect
    });
    Object.defineProperty(analyser, PATCH_MARK, { value: true });
  } catch {
    analyser.getByteFrequencyData = resilientFrequencyData;
    analyser.connect = meteringOnlyConnect;
    analyser[PATCH_MARK] = true;
  }

  ACTIVE_ANALYSER = analyser;
  return analyser;
}

function createMirrorSourceProxy(context, audio, nativeCreateMediaElementSource) {
  const connections = [];
  const mirror = document.createElement('audio');
  let mirrorSource = null;
  let sourceIdentity = '';
  let syncTimer = 0;
  let playPromise = null;

  mirror.crossOrigin = 'anonymous';
  mirror.preload = 'auto';
  mirror.playsInline = true;
  mirror.setAttribute('playsinline', '');
  mirror.setAttribute('aria-hidden', 'true');
  mirror.dataset.audioLabMirror = 'true';
  mirror.style.display = 'none';
  document.body?.appendChild(mirror);

  function primarySource() {
    return audio.src || audio.getAttribute?.('src') || audio.currentSrc || '';
  }

  function primaryIdentity() {
    return `${audio.dataset?.trackId || ''}::${primarySource()}`;
  }

  function wanted() {
    return analysisViewActive() && !audio.paused && !audio.ended && Boolean(primarySource());
  }

  function ensureMirrorNode() {
    if (mirrorSource) return mirrorSource;
    try {
      mirrorSource = nativeCreateMediaElementSource.call(context, mirror);
      connections.forEach(({ destination, args }) => mirrorSource.connect(destination, ...args));
      return mirrorSource;
    } catch (error) {
      markMeter('node-error');
      console.info('Audio Lab mirror source could not be created.', error);
      return null;
    }
  }

  function setMirrorSource(force = false) {
    const source = primarySource();
    const identity = primaryIdentity();
    if (!source) return false;
    if (!force && sourceIdentity === identity && mirror.src) return true;

    sourceIdentity = identity;
    try { mirror.pause(); } catch {}
    mirror.crossOrigin = 'anonymous';
    mirror.src = source;
    mirror.defaultPlaybackRate = audio.defaultPlaybackRate || 1;
    mirror.playbackRate = audio.playbackRate || 1;
    mirror.load();
    markMeter('loading');
    markSignal('warming-mirror');
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.audioGraph = 'html5-direct-plus-mirror-metering';
      document.documentElement.dataset.audioLabMirrorSource = identity;
    }
    return true;
  }

  function syncClock(force = false) {
    if (!Number.isFinite(audio.currentTime) || mirror.readyState < 1) return;
    const delta = Math.abs((Number(mirror.currentTime) || 0) - Number(audio.currentTime));
    if (force || delta > .14) {
      try { mirror.currentTime = Math.max(0, Number(audio.currentTime) || 0); } catch {}
    }
    mirror.playbackRate = audio.playbackRate || 1;
  }

  async function start(reason = 'ensure') {
    if (!wanted()) {
      if (!audio.paused && !audio.ended && !analysisViewActive()) markMeter('view-idle');
      return false;
    }
    if (!setMirrorSource(false) || !ensureMirrorNode()) return false;
    if (context.state === 'suspended' || context.state === 'interrupted') {
      try { await context.resume(); } catch {}
    }
    if (mirror.readyState < 1) {
      markMeter('loading');
      return false;
    }

    syncClock(reason === 'source-change' || reason === 'seek' || reason === 'gesture');
    if (!mirror.paused && !mirror.ended) {
      markMeter('running');
      return true;
    }
    if (playPromise) return playPromise;

    playPromise = mirror.play()
      .then(() => {
        syncClock(true);
        markMeter('running');
        return true;
      })
      .catch(error => {
        markMeter(error?.name === 'NotAllowedError' ? 'gesture-required' : 'play-error');
        console.info('Audio Lab mirror playback is waiting for an interaction.', error);
        return false;
      })
      .finally(() => { playPromise = null; });
    return playPromise;
  }

  function stop(reason = 'idle') {
    clearTimeout(syncTimer);
    syncTimer = 0;
    try { mirror.pause(); } catch {}
    markMeter(reason);
    if (reason === 'background') markSignal('background-suspended');
  }

  function scheduleSync(force = false, reason = 'sync') {
    clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = 0;
      if (force) setMirrorSource(false);
      syncClock(force);
      if (wanted()) start(reason);
    }, force ? 0 : 40);
  }

  function onPrimarySourceChange() {
    const identity = primaryIdentity();
    if (identity === sourceIdentity) return;
    setMirrorSource(true);
    scheduleSync(true, 'source-change');
  }

  const proxy = {
    [MIRROR_PROXY_MARK]: true,
    context,
    connect(destination, ...args) {
      const known = connections.some(item => item.destination === destination);
      const hadNode = Boolean(mirrorSource);
      if (!known) connections.push({ destination, args });
      const node = ensureMirrorNode();
      if (node && hadNode && !known) {
        try { node.connect(destination, ...args); } catch {}
      }
      if (wanted()) start('connect');
      return destination;
    },
    disconnect() {
      connections.length = 0;
      try { mirrorSource?.disconnect(); } catch {}
      stop('disconnected');
    },
    ensure(reason = 'ensure') {
      onPrimarySourceChange();
      return start(reason);
    },
    suspend() {
      stop(document.hidden ? 'background' : 'view-idle');
    },
    sync(force = false) {
      onPrimarySourceChange();
      scheduleSync(force, force ? 'seek' : 'sync');
    }
  };

  MIRROR_PROXIES.add(proxy);

  audio.addEventListener('loadstart', () => {
    setMirrorSource(true);
    scheduleSync(true, 'source-change');
  });
  ['loadedmetadata', 'loadeddata', 'canplay', 'playing', 'play'].forEach(type => {
    audio.addEventListener(type, () => proxy.ensure(type));
  });
  audio.addEventListener('pause', () => stop('paused'));
  audio.addEventListener('ended', () => stop('ended'));
  audio.addEventListener('seeking', () => proxy.sync(true));
  audio.addEventListener('seeked', () => proxy.sync(true));
  audio.addEventListener('ratechange', () => proxy.sync(false));
  audio.addEventListener('timeupdate', () => proxy.sync(false));

  mirror.addEventListener('loadedmetadata', () => {
    syncClock(true);
    if (wanted()) start('mirror-metadata');
  });
  mirror.addEventListener('canplay', () => {
    syncClock(true);
    if (wanted()) start('mirror-canplay');
  });
  mirror.addEventListener('waiting', () => markMeter('buffering'));
  mirror.addEventListener('stalled', () => markMeter('stalled'));
  mirror.addEventListener('playing', () => markMeter('running'));

  if (typeof MutationObserver === 'function') {
    new MutationObserver(records => {
      if (records.some(record => record.attributeName === 'src' || record.attributeName === 'data-track-id')) {
        onPrimarySourceChange();
      }
    }).observe(audio, { attributes: true, attributeFilter: ['src', 'data-track-id'] });
  }

  return proxy;
}

function patchAudioContextClass(AudioContextClass, audio) {
  const prototype = AudioContextClass?.prototype;
  if (!prototype || prototype[PATCH_MARK]) return;

  const nativeCreateAnalyser = prototype.createAnalyser;
  const nativeCreateMediaElementSource = prototype.createMediaElementSource;
  if (typeof nativeCreateAnalyser !== 'function' || typeof nativeCreateMediaElementSource !== 'function') return;

  prototype.createAnalyser = function createResilientAnalyser(...args) {
    ACTIVE_CONTEXTS.add(this);
    return patchAnalyser(nativeCreateAnalyser.apply(this, args), audio);
  };

  prototype.createMediaElementSource = function createPlaybackSafeMediaElementSource(element, ...args) {
    if (element === audio) {
      ACTIVE_CONTEXTS.add(this);
      return createMirrorSourceProxy(this, audio, nativeCreateMediaElementSource);
    }
    return nativeCreateMediaElementSource.call(this, element, ...args);
  };

  try {
    Object.defineProperty(prototype, PATCH_MARK, { value: true });
  } catch {
    prototype[PATCH_MARK] = true;
  }
}

async function resumeContexts(reason = 'resume') {
  if (typeof document !== 'undefined' && document.hidden) return;
  await Promise.allSettled([...ACTIVE_CONTEXTS].map(context => {
    if (context.state === 'suspended' || context.state === 'interrupted') return context.resume();
    return Promise.resolve();
  }));
  MIRROR_PROXIES.forEach(proxy => proxy.ensure?.(reason));
}

async function suspendContexts() {
  MIRROR_PROXIES.forEach(proxy => proxy.suspend?.());
  await Promise.allSettled([...ACTIVE_CONTEXTS].map(context => {
    if (context.state === 'running') return context.suspend();
    return Promise.resolve();
  }));
  markMeter('background');
  markSignal('background-suspended');
}

export function initAudioLabSignalBridge({ audio }) {
  if (!audio || globalThis.__shinobiAudioLabSignalReady) return;
  globalThis.__shinobiAudioLabSignalReady = true;

  audio.crossOrigin = 'anonymous';
  audio.dataset.audioPlaybackPath = 'html5-direct';
  patchAudioContextClass(globalThis.AudioContext, audio);
  if (globalThis.webkitAudioContext && globalThis.webkitAudioContext !== globalThis.AudioContext) {
    patchAudioContextClass(globalThis.webkitAudioContext, audio);
  }

  const recover = event => { resumeContexts(event?.type || 'recover'); };
  audio.addEventListener('play', recover);
  audio.addEventListener('playing', recover);
  audio.addEventListener('loadeddata', recover);
  window.addEventListener('pageshow', recover);
  window.addEventListener('shinobi:route-change', () => {
    if (analysisViewActive() && !audio.paused) resumeContexts('route-change');
    else MIRROR_PROXIES.forEach(proxy => proxy.suspend?.());
  });
  window.addEventListener('pagehide', () => { suspendContexts(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      suspendContexts();
      return;
    }
    if (!audio.paused) recover({ type: 'visibilitychange' });
  });
  document.addEventListener('pointerdown', () => {
    if (analysisViewActive() && !audio.paused) resumeContexts('gesture');
  }, { capture: true, passive: true });
  document.querySelector('#view-lab')?.addEventListener('pointerdown', recover, { passive: true });

  markMeter('idle');
  markSignal('idle');
}
