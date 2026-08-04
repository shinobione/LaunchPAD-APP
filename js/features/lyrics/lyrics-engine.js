export function centeredScrollTop(reader, element) {
  if (!reader || !element) return 0;

  const readerRect = reader.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const currentScroll = Number(reader.scrollTop) || 0;
  const viewportHeight = reader.clientHeight || readerRect.height || 0;
  const elementHeight = elementRect.height || element.offsetHeight || 0;

  if (viewportHeight <= 0) return Math.max(0, currentScroll);

  const offsetWithinReader = elementRect.top - readerRect.top;
  const requested = currentScroll
    + offsetWithinReader
    - (viewportHeight - elementHeight) / 2;
  const maximum = Math.max(0, reader.scrollHeight - viewportHeight);
  return Math.min(maximum, Math.max(0, requested));
}

export function centerElementInScrollContainer(reader, element, behavior = 'smooth') {
  if (!reader || !element) return false;
  reader.scrollTo({
    top: centeredScrollTop(reader, element),
    behavior
  });
  return true;
}

export function createLyricsController({ tracks, audio, getCurrentIndex, selectTrack, switchView, $, $$, escapeHtml }) {
  const cache = new Map();
  let currentLines = [];
  let activeIndex = -1;
  let loadToken = 0;
  let autoScroll = true;
  let searchHydrated = false;
  let searchPromise = null;

  function extractLyricsBody(rawText) {
    const normalized = String(rawText || '').replace(/^\uFEFF/, '');
    const marker = normalized.match(/^LYRICS\s*:\s*$/im);
    return marker
      ? normalized.slice(marker.index + marker[0].length).trim()
      : normalized;
  }

  function parse(rawText) {
    const timestamped = [];
    const pattern = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    const lyricsText = extractLyricsBody(rawText);
    const rawLines = lyricsText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

    rawLines.forEach(rawLine => {
      const text = rawLine.replace(pattern, '').trim();
      const matches = [...rawLine.matchAll(pattern)];
      if (!matches.length || !text) return;

      matches.forEach(match => {
        const fractionRaw = match[3] || '0';
        timestamped.push({
          time: Number(match[1]) * 60 + Number(match[2]) + Number(`0.${fractionRaw.padEnd(3, '0').slice(0, 3)}`),
          text
        });
      });
    });

    if (timestamped.length) return timestamped.sort((a, b) => a.time - b.time);
    return rawLines.map(text => ({ time: null, text }));
  }

  async function fetchLyrics(track) {
    if (!track.lyrics) return [];
    if (cache.has(track.id)) return cache.get(track.id);

    try {
      const response = await fetch(track.lyrics, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parse(await response.text());
      cache.set(track.id, parsed);
      return parsed;
    } catch (error) {
      console.warn(`Lyrics unavailable for ${track.title}`, error);
      cache.set(track.id, []);
      return [];
    }
  }

  function setLoading(track) {
    $('#home-lyrics-status').textContent = track.lyrics ? 'LOADING' : 'NO LYRICS';
    $('#home-lyrics').innerHTML = '<p class="lyrics-placeholder">Loading lyrics…</p>';
    $('#lyrics-reader').innerHTML = '<p class="lyrics-placeholder">Loading lyrics…</p>';
  }

  function renderUnavailable() {
    $('#lyrics-availability').textContent = 'LYRICS UNAVAILABLE';
    $('#lyrics-availability').classList.add('unavailable');
    $('#lyrics-reader-label').textContent = 'NO LYRICS FILE';
    $('#home-lyrics-status').textContent = 'NO LYRICS';
    $('#home-lyrics').innerHTML = '<p class="lyrics-placeholder">Lyrics are not available for this track yet.</p>';
    $('#lyrics-reader').innerHTML = `
      <div class="lyrics-unavailable">
        <div>
          <strong>Lyrics coming soon</strong>
          <span>The track is still available in the player.</span>
        </div>
      </div>
    `;
  }

  function renderHome(center = 0) {
    if (!currentLines.length) return;
    const start = Math.max(0, center - 1);
    const end = Math.min(currentLines.length, center + 3);
    $('#home-lyrics').innerHTML = currentLines.slice(start, end).map((line, offset) => {
      const index = start + offset;
      return `<p class="home-lyric-line${index === activeIndex ? ' active' : ''}">${escapeHtml(line.text)}</p>`;
    }).join('');
  }

  function render(lines) {
    if (!lines.length) {
      renderUnavailable();
      return;
    }

    const synchronized = lines.some(line => Number.isFinite(line.time));
    $('#lyrics-availability').textContent = synchronized ? 'SYNC READY' : 'TEXT READY';
    $('#lyrics-availability').classList.remove('unavailable');
    $('#lyrics-reader-label').textContent = synchronized
      ? `${lines.length} TIMESTAMPED LINES`
      : `${lines.length} LINES • NOT TIMESTAMPED`;
    $('#home-lyrics-status').textContent = synchronized ? 'SYNC' : 'TEXT';

    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `lyric-line${Number.isFinite(line.time) ? '' : ' unsynced'}`;
      button.dataset.index = String(index);
      button.textContent = line.text;

      if (Number.isFinite(line.time)) {
        button.dataset.time = String(line.time);
        button.addEventListener('click', () => {
          audio.currentTime = line.time;
          if (audio.paused) audio.play().catch(() => {});
        });
      }
      fragment.appendChild(button);
    });

    $('#lyrics-reader').replaceChildren(fragment);
    renderHome(0);
  }

  async function load(track) {
    const token = ++loadToken;
    currentLines = [];
    activeIndex = -1;
    setLoading(track);

    const lines = await fetchLyrics(track);
    if (token !== loadToken || tracks[getCurrentIndex()].id !== track.id) return;
    currentLines = lines;
    render(lines);
    update(audio.currentTime);
  }

  function findIndex(time) {
    if (!currentLines.some(line => Number.isFinite(line.time))) return -1;
    let low = 0;
    let high = currentLines.length - 1;
    let result = -1;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (currentLines[middle].time <= time + .12) {
        result = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return result;
  }

  function scrollLineIntoReader(element, behavior = 'smooth') {
    return centerElementInScrollContainer($('#lyrics-reader'), element, behavior);
  }

  function lineIsInReaderFocusZone(element) {
    const reader = $('#lyrics-reader');
    if (!reader || !element) return false;
    const readerRect = reader.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    if (readerRect.height <= 0 || elementRect.height <= 0) return false;

    const center = elementRect.top + elementRect.height / 2;
    const safeInset = Math.min(readerRect.height * .24, 120);
    return center >= readerRect.top + safeInset
      && center <= readerRect.bottom - safeInset;
  }

  function update(time) {
    if (!currentLines.length) return;
    const next = findIndex(time);
    const elements = $$('#lyrics-reader .lyric-line');

    if (next === activeIndex) {
      const activeElement = elements[activeIndex];
      if (autoScroll && activeIndex >= 0 && !lineIsInReaderFocusZone(activeElement)) {
        scrollLineIntoReader(activeElement);
      }
      return;
    }

    activeIndex = next;
    elements.forEach((element, index) => {
      element.classList.toggle('active', index === activeIndex);
      element.classList.toggle('past', index < activeIndex);
    });

    renderHome(Math.max(0, activeIndex));
    if (autoScroll && activeIndex >= 0) {
      scrollLineIntoReader(elements[activeIndex]);
    }
  }

  async function hydrateSearchIndex(onReady) {
    if (searchPromise) return searchPromise;
    searchPromise = Promise.all(tracks.map(async track => {
      if (!track.lyrics) return;
      const lines = await fetchLyrics(track);
      track.searchText += ` ${lines.map(line => line.text).join(' ').toLowerCase()}`;
    })).finally(() => {
      searchHydrated = true;
      onReady?.();
    });
    return searchPromise;
  }

  $('#lyrics-autoscroll').addEventListener('click', () => {
    autoScroll = !autoScroll;
    const button = $('#lyrics-autoscroll');
    button.classList.toggle('active', autoScroll);
    button.setAttribute('aria-pressed', String(autoScroll));
    button.textContent = autoScroll ? 'Auto-scroll' : 'Manual scroll';

    if (autoScroll && activeIndex >= 0) {
      scrollLineIntoReader($(`#lyrics-reader .lyric-line[data-index="${activeIndex}"]`), 'auto');
    }
  });

  $('#lyrics-track-select').addEventListener('change', event => {
    selectTrack(Number(event.target.value), false);
    switchView('lyrics');
  });

  return {
    load,
    update,
    hydrateSearchIndex,
    isSearchHydrated: () => searchHydrated,
    scrollToActive() {
      if (activeIndex < 0 || !autoScroll) return;
      scrollLineIntoReader($(`#lyrics-reader .lyric-line[data-index="${activeIndex}"]`), 'auto');
    }
  };
}
