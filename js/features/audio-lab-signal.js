const PATCH_MARK = Symbol.for('shinobi.audioLabSignalPatch');
const CAPTURE_PROXY_MARK = Symbol.for('shinobi.audioLabCaptureProxy');
const ACTIVE_CONTEXTS = new Set();
const CAPTURE_PROXIES = new Set();
let ACTIVE_ANALYSER = null;
let CAPTURE_STATE = 'idle';

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

function markCapture(state) {
  CAPTURE_STATE = state;
  if (typeof document !== 'undefined') document.documentElement.dataset.audioLabCapture = state;
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
    ? document.documentElement.dataset.audioLabSignal || (peak > 2 ? 'live' : 'idle')
    : (peak > 2 ? 'live' : 'idle');
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
    state: rms > .0035 || peak > .01 ? 'live' : 'idle'
  };
}

function patchAnalyser(analyser, audio) {
  if (!analyser) return analyser;
  if (analyser[PATCH_MARK]) {
    ACTIVE_ANALYSER = analyser;
    return analyser;
  }

  const nativeFrequency = analyser.getByteFrequencyData.bind(analyser);
  const nativeWaveform = analyser.getByteTimeDomainData.bind(analyser);
  const nativeConnect = analyser.connect.bind(analyser);
  let silentFrames = 0;
  let previousTime = Number(audio.currentTime) || 0;
  let waveform = new Uint8Array(Math.max(32, analyser.fftSize || 256));
  let silentSink = null;

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

    // Never disguise a broken/stale live capture as audio-reactivity. While a
    // supported captureStream is reconnecting, show a neutral signal and wait
    // for the real track. Synthetic movement is reserved for browsers where a
    // live capture stream genuinely cannot be used.
    if (CAPTURE_STATE !== 'synthetic') {
      target.fill(0);
      markSignal(CAPTURE_STATE === 'connected' ? 'capture-silent' : 'warming-capture');
      return;
    }

    synthesizePlaybackSpectrum(target, currentTime);
    markSignal('fallback');
  };

  // Keep the analyser graph alive through a zero-gain sink. The audible media
  // element is never routed through this AudioContext, so suspending metering
  // cannot interrupt or crackle the HTML5 playback path.
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

function captureMethod(audio) {
  if (typeof audio?.captureStream === 'function') return audio.captureStream.bind(audio);
  if (typeof audio?.mozCaptureStream === 'function') return audio.mozCaptureStream.bind(audio);
  return null;
}

function createCaptureSourceProxy(context, audio) {
  const capture = captureMethod(audio);
  const connections = [];
  let stream = null;
  let mediaSource = null;
  let activeTrack = null;
  let captureIdentity = '';
  let activeTrackEndedHandler = null;

  function mediaIdentity() {
    const trackId = audio.dataset?.trackId || '';
    const source = audio.getAttribute?.('src') || audio.currentSrc || '';
    return `${trackId}::${source}`;
  }

  const disconnectSource = () => {
    if (activeTrack && activeTrackEndedHandler) {
      activeTrack.removeEventListener?.('ended', activeTrackEndedHandler);
    }
    activeTrackEndedHandler = null;
    try { mediaSource?.disconnect(); } catch {}
    mediaSource = null;
    activeTrack = null;
  };

  const onStreamTrackChange = () => {
    queueMicrotask(() => {
      invalidateCapture('stream-track-change');
      if (!audio.paused && !audio.ended) connectCurrentTrack();
    });
  };

  const releaseCapturedStream = () => {
    disconnectSource();
    stream?.removeEventListener?.('addtrack', onStreamTrackChange);
    stream?.removeEventListener?.('removetrack', onStreamTrackChange);
    stream = null;
    captureIdentity = '';
  };

  function invalidateCapture(reason = 'source-change') {
    releaseCapturedStream();
    markCapture('refreshing');
    markSignal('warming-capture');
    if (typeof document !== 'undefined') document.documentElement.dataset.audioLabCaptureReset = reason;
  }

  function connectCurrentTrack() {
    if ((typeof document !== 'undefined' && document.hidden) || !capture) {
      if (!capture) markCapture('synthetic');
      return false;
    }

    const identity = mediaIdentity();
    if (stream && captureIdentity && identity && captureIdentity !== identity) {
      invalidateCapture('identity-change');
    }

    // Do not snapshot captureStream while the media element is between two
    // sources. Chrome can otherwise hand us the previous track's stream.
    if (Number(audio.readyState || 0) < 1) {
      markCapture('warming');
      return false;
    }

    if (!stream) {
      try {
        stream = capture();
        captureIdentity = identity;
        stream?.addEventListener?.('addtrack', onStreamTrackChange);
        stream?.addEventListener?.('removetrack', onStreamTrackChange);
      } catch (error) {
        markCapture('synthetic');
        console.info('Audio Lab captureStream unavailable; using synthetic metering.', error);
        return false;
      }
    }

    const tracks = stream?.getAudioTracks?.() || [];
    const nextTrack = tracks.find(track => track.readyState === 'live') || tracks.at(-1) || null;
    if (!nextTrack) {
      markCapture('warming');
      return false;
    }
    if (mediaSource && activeTrack === nextTrack) {
      markCapture('connected');
      return true;
    }

    disconnectSource();
    try {
      const scopedStream = typeof MediaStream === 'function' ? new MediaStream([nextTrack]) : stream;
      mediaSource = context.createMediaStreamSource(scopedStream);
      activeTrack = nextTrack;
      activeTrackEndedHandler = () => {
        queueMicrotask(() => {
          invalidateCapture('captured-track-ended');
          if (!audio.paused && !audio.ended) connectCurrentTrack();
        });
      };
      nextTrack.addEventListener?.('ended', activeTrackEndedHandler, { once: true });
      connections.forEach(({ destination, args }) => mediaSource.connect(destination, ...args));
      markCapture('connected');
      markSignal('warming');
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.audioGraph = 'html5-direct-plus-capture-metering';
        document.documentElement.dataset.audioLabCaptureSource = identity;
      }
      return true;
    } catch (error) {
      disconnectSource();
      markCapture('synthetic');
      console.info('Audio Lab capture source could not be attached; using synthetic metering.', error);
      return false;
    }
  }

  const proxy = {
    [CAPTURE_PROXY_MARK]: true,
    context,
    connect(destination, ...args) {
      connections.push({ destination, args });
      if (!capture && typeof document !== 'undefined') {
        document.documentElement.dataset.audioGraph = 'html5-direct-plus-synthetic-metering';
        markCapture('synthetic');
      }
      connectCurrentTrack();
      return destination;
    },
    disconnect() {
      connections.length = 0;
      releaseCapturedStream();
    },
    ensure: connectCurrentTrack,
    invalidate: invalidateCapture
  };

  CAPTURE_PROXIES.add(proxy);

  // A media element keeps the same DOM node while LaunchPAD swaps its src.
  // captureStream() does not reliably swap the captured MediaStreamTrack with
  // it, so source transitions must invalidate the whole capture stream, not
  // merely reconnect the existing MediaStreamAudioSourceNode.
  audio.addEventListener('emptied', () => invalidateCapture('emptied'));
  audio.addEventListener('loadstart', () => invalidateCapture('loadstart'));
  ['loadedmetadata', 'loadeddata', 'canplay', 'playing'].forEach(type => {
    audio.addEventListener(type, connectCurrentTrack);
  });

  if (typeof MutationObserver === 'function') {
    new MutationObserver(records => {
      if (records.some(record => record.attributeName === 'src' || record.attributeName === 'data-track-id')) {
        invalidateCapture('source-attribute');
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
  if (typeof nativeCreateAnalyser !== 'function') return;

  prototype.createAnalyser = function createResilientAnalyser(...args) {
    ACTIVE_CONTEXTS.add(this);
    return patchAnalyser(nativeCreateAnalyser.apply(this, args), audio);
  };

  if (typeof nativeCreateMediaElementSource === 'function') {
    prototype.createMediaElementSource = function createPlaybackSafeMediaElementSource(element, ...args) {
      if (element === audio) {
        ACTIVE_CONTEXTS.add(this);
        return createCaptureSourceProxy(this, audio);
      }
      return nativeCreateMediaElementSource.call(this, element, ...args);
    };
  }

  try {
    Object.defineProperty(prototype, PATCH_MARK, { value: true });
  } catch {
    prototype[PATCH_MARK] = true;
  }
}

async function resumeContexts() {
  if (typeof document !== 'undefined' && document.hidden) return;
  CAPTURE_PROXIES.forEach(proxy => proxy.ensure?.());
  await Promise.allSettled([...ACTIVE_CONTEXTS].map(context => {
    if (context.state === 'suspended' || context.state === 'interrupted') return context.resume();
    return Promise.resolve();
  }));
}

async function suspendContexts() {
  await Promise.allSettled([...ACTIVE_CONTEXTS].map(context => {
    if (context.state === 'running') return context.suspend();
    return Promise.resolve();
  }));
  markCapture('background-suspended');
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

  const recover = () => { resumeContexts(); };
  audio.addEventListener('play', recover);
  audio.addEventListener('playing', recover);
  audio.addEventListener('loadeddata', recover);
  window.addEventListener('pageshow', recover);
  window.addEventListener('pagehide', () => { suspendContexts(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      suspendContexts();
      return;
    }
    if (!audio.paused) recover();
  });
  document.querySelector('#view-lab')?.addEventListener('pointerdown', recover, { passive: true });

  markCapture(captureMethod(audio) ? 'idle' : 'synthetic');
  markSignal('idle');
}
