(() => {
  if (globalThis.__shinobiUiPolishV621Ready) return;
  globalThis.__shinobiUiPolishV621Ready = true;

  const seek = document.querySelector('#seek');
  const audio = document.querySelector('#audio');
  if (!seek || !audio) return;

  function setProgress(percent) {
    const safe = Math.max(0, Math.min(100, Number(percent) || 0));
    seek.style.setProperty('--seek-progress', `${safe}%`);
  }

  function syncFromAudio() {
    const duration = Number(audio.duration);
    const current = Number(audio.currentTime);
    setProgress(Number.isFinite(duration) && duration > 0 && Number.isFinite(current)
      ? current / duration * 100
      : seek.value);
  }

  function syncFromSeek() {
    setProgress(seek.value);
  }

  ['timeupdate', 'loadedmetadata', 'durationchange', 'seeking', 'seeked', 'emptied'].forEach(type => {
    audio.addEventListener(type, syncFromAudio, { passive: true });
  });
  seek.addEventListener('input', syncFromSeek, { passive: true });
  seek.addEventListener('change', syncFromSeek, { passive: true });

  syncFromAudio();
})();
