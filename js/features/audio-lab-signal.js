const PATCH_MARK = Symbol.for('shinobi.audioLabSignalPatch');
const DECODED_PROXY_MARK = Symbol.for('shinobi.audioLabDecodedProxy');
const ACTIVE_CONTEXTS = new Set();
const DECODED_PROXIES = new Set();
let ACTIVE_ANALYSER = null;
let ACTIVE_AUDIO = null;
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
    return {
      available: Boolean(globalThis.__shinobiAudioLabSignalReady),
      peak: 0,
      state: 'awaiting-context'
    };
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
    markSignal(METER_STATE === 'running' ? 'decoded-silent' : METER_STATE || 'warming-decoder');
  };

  // The decoded copy is analysis-only. Analyser output is terminated in a
  // zero-gain sink; the audible HTMLMediaElement never enters this graph.
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

function createDecodedSourceProxy(context, audio) {
  const connections = [];
  let decodedBuffer = null;
  let decodedIdentity = '';
  let loadingIdentity = '';
  let loadPromise = null;
  let abortController = null;
  let loadSerial = 0;
  let sourceNode = null;
  let sourceStartedAt = 0;
  let mediaStartedAt = 0;
  let sourceRate = 1;
  let syncTimer = 0;

  function primarySource() {
    return audio.src || audio.getAttribute?.('src') || audio.currentSrc || '';
  }

  function primaryIdentity() {
    return `${audio.dataset?.trackId || ''}::${primarySource()}`;
  }

  function wanted() {
    return analysisViewActive() && !audio.paused && !audio.ended && Boolean(primarySource());
  }

  function stopNode(reason = 'idle') {
    clearTimeout(syncTimer);
    syncTimer = 0;
    if (sourceNode) {
      sourceNode.onended = null;
      try { sourceNode.stop(); } catch {}
      try { sourceNode.disconnect(); } catch {}
      sourceNode = null;
    }
    markMeter(reason);
    if (reason === 'background') markSignal('background-suspended');
  }

  function invalidateDecoded(reason = 'source-change') {
    loadSerial += 1;
    abortController?.abort();
    abortController = null;
    loadPromise = null;
    loadingIdentity = '';
    decodedBuffer = null;
    decodedIdentity = '';
    stopNode(reason);
    if (typeof document !== 'undefined') document.documentElement.dataset.audioLabDecodeReset = reason;
  }

  async function loadDecodedBuffer() {
    const source = primarySource();
    const identity = primaryIdentity();
    if (!source) return null;
    if (decodedBuffer && decodedIdentity === identity) return decodedBuffer;
    if (loadPromise && loadingIdentity === identity) return loadPromise;

    if (decodedIdentity && decodedIdentity !== identity) invalidateDecoded('identity-change');

    const serial = ++loadSerial;
    loadingIdentity = identity;
    abortController?.abort();
    abortController = typeof AbortController === 'function' ? new AbortController() : null;
    markMeter('fetching');
    markSignal('warming-decoder');
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.audioGraph = 'html5-direct-plus-decoded-buffer-metering';
      document.documentElement.dataset.audioLabDecodedSource = identity;
    }

    loadPromise = (async () => {
      let bytes;
      try {
        const response = await fetch(source, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'default',
          signal: abortController?.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        bytes = await response.arrayBuffer();
        if (serial !== loadSerial) return null;
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.audioLabDecodedBytes = String(bytes.byteLength || 0);
        }
      } catch (error) {
        if (error?.name === 'AbortError' || serial !== loadSerial) return null;
        markMeter('fetch-error');
        markSignal('fetch-error');
        console.info('Audio Lab could not fetch the analysis copy.', error);
        return null;
      }

      try {
        markMeter('decoding');
        const buffer = await context.decodeAudioData(bytes.slice(0));
        if (serial !== loadSerial) return null;
        decodedBuffer = buffer;
        decodedIdentity = identity;
        loadingIdentity = '';
        markMeter('buffer-ready');
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.audioLabDecodedDuration = Number(buffer.duration || 0).toFixed(3);
          document.documentElement.dataset.audioLabDecodedRate = String(buffer.sampleRate || 0);
        }
        return buffer;
      } catch (error) {
        if (serial !== loadSerial) return null;
        markMeter('decode-error');
        markSignal('decode-error');
        console.info('Audio Lab could not decode the analysis copy.', error);
        return null;
      } finally {
        if (serial === loadSerial) loadPromise = null;
      }
    })();

    return loadPromise;
  }

  function estimatedMediaTime() {
    if (!sourceNode) return NaN;
    return mediaStartedAt + Math.max(0, context.currentTime - sourceStartedAt) * sourceRate;
  }

  async function start(reason = 'ensure') {
    if (!wanted()) {
      if (!audio.paused && !audio.ended && !analysisViewActive()) stopNode('view-idle');
      return false;
    }

    if (context.state === 'suspended' || context.state === 'interrupted') {
      try { await context.resume(); } catch {}
    }

    const buffer = await loadDecodedBuffer();
    if (!buffer || !wanted()) return false;

    const identity = primaryIdentity();
    if (identity !== decodedIdentity) return false;

    stopNode('restarting');
    const duration = Math.max(0, Number(buffer.duration) || 0);
    if (!duration) {
      markMeter('empty-buffer');
      return false;
    }

    const requestedOffset = Math.max(0, Number(audio.currentTime) || 0);
    const offset = Math.min(requestedOffset, Math.max(0, duration - .012));
    const rate = Math.max(.25, Math.min(4, Number(audio.playbackRate) || 1));
    const node = context.createBufferSource();
    node.buffer = buffer;
    node.playbackRate.value = rate;
    connections.forEach(({ destination, args }) => node.connect(destination, ...args));
    node.onended = () => {
      if (sourceNode !== node) return;
      sourceNode = null;
      if (!audio.ended && !audio.paused && wanted()) markMeter('buffer-ended');
    };

    sourceNode = node;
    sourceStartedAt = context.currentTime;
    mediaStartedAt = offset;
    sourceRate = rate;
    try {
      node.start(0, offset);
      markMeter('running');
      markSignal('warming-decoded');
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.audioLabDecodedOffset = offset.toFixed(3);
        document.documentElement.dataset.audioLabDecodedReason = reason;
      }
      return true;
    } catch (error) {
      sourceNode = null;
      markMeter('start-error');
      console.info('Audio Lab decoded analysis source could not start.', error);
      return false;
    }
  }

  function sync(force = false, reason = 'sync') {
    clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncTimer = 0;
      const identity = primaryIdentity();
      if (decodedIdentity && identity !== decodedIdentity) {
        invalidateDecoded('source-change');
        if (wanted()) start('source-change');
        return;
      }
      if (!wanted()) {
        if (sourceNode) stopNode(audio.paused ? 'paused' : 'view-idle');
        return;
      }
      if (!sourceNode) {
        start(reason);
        return;
      }
      const estimated = estimatedMediaTime();
      const actual = Number(audio.currentTime) || 0;
      const rateChanged = Math.abs(sourceRate - (Number(audio.playbackRate) || 1)) > .001;
      const drift = Number.isFinite(estimated) ? Math.abs(estimated - actual) : Infinity;
      if (force || rateChanged || drift > .24) start(force ? reason : 'drift');
    }, force ? 0 : 60);
  }

  const proxy = {
    [DECODED_PROXY_MARK]: true,
    context,
    connect(destination, ...args) {
      if (!connections.some(item => item.destination === destination)) connections.push({ destination, args });
      if (sourceNode) {
        try { sourceNode.connect(destination, ...args); } catch {}
      }
      if (wanted()) start('connect');
      return destination;
    },
    disconnect() {
      connections.length = 0;
      stopNode('disconnected');
    },
    ensure(reason = 'ensure') {
      const identity = primaryIdentity();
      if (decodedIdentity && decodedIdentity !== identity) invalidateDecoded('identity-change');
      return start(reason);
    },
    suspend() {
      stopNode(document.hidden ? 'background' : 'view-idle');
    },
    sync(force = false, reason = 'sync') {
      sync(force, reason);
    },
    invalidate(reason = 'source-change') {
      invalidateDecoded(reason);
    }
  };

  DECODED_PROXIES.add(proxy);

  audio.addEventListener('loadstart', () => {
    invalidateDecoded('loadstart');
    if (wanted()) start('loadstart');
  });
  ['loadedmetadata', 'loadeddata', 'canplay', 'playing', 'play'].forEach(type => {
    audio.addEventListener(type, () => proxy.ensure(type));
  });
  audio.addEventListener('pause', () => stopNode('paused'));
  audio.addEventListener('ended', () => stopNode('ended'));
  audio.addEventListener('seeking', () => proxy.sync(true, 'seeking'));
  audio.addEventListener('seeked', () => proxy.sync(true, 'seeked'));
  audio.addEventListener('ratechange', () => proxy.sync(true, 'ratechange'));
  audio.addEventListener('timeupdate', () => proxy.sync(false, 'timeupdate'));

  if (typeof MutationObserver === 'function') {
    new MutationObserver(records => {
      if (records.some(record => record.attributeName === 'src' || record.attributeName === 'data-track-id')) {
        proxy.invalidate('source-attribute');
        if (wanted()) proxy.ensure('source-attribute');
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

  // Intercept only LaunchPAD's primary media element. Returning an analysis
  // proxy keeps the audible player completely outside the Web Audio graph.
  prototype.createMediaElementSource = function createPlaybackSafeMediaElementSource(element, ...args) {
    if (element === audio) {
      ACTIVE_CONTEXTS.add(this);
      return createDecodedSourceProxy(this, audio);
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
  DECODED_PROXIES.forEach(proxy => proxy.ensure?.(reason));
}

async function suspendContexts() {
  DECODED_PROXIES.forEach(proxy => proxy.suspend?.());
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
  ACTIVE_AUDIO = audio;

  audio.crossOrigin = 'anonymous';
  audio.dataset.audioPlaybackPath = 'html5-direct';
  audio.dataset.audioAnalysisPath = 'decoded-buffer';
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
    else DECODED_PROXIES.forEach(proxy => proxy.suspend?.());
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

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.audioGraph = 'html5-direct-plus-decoded-buffer-metering';
  }
  markMeter('idle');
  markSignal('idle');
}
