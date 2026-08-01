const SPOTIFY_URI = 'spotify:artist:6W08IttKpZns5zG7BYTz8e';
const SPOTIFY_API = 'https://open.spotify.com/embed/iframe-api/v1';
const SOUNDCLOUD_API = 'https://w.soundcloud.com/player/api.js';

function loadScript(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.appendChild(script);
  });
}

export function initAudioFocus({ audio }) {
  if (!audio || window.__shinobiAudioFocusReady) return;
  window.__shinobiAudioFocusReady = true;

  let spotifyController = null;
  let soundcloudWidget = null;
  let switching = false;
  let currentSource = null;

  const pauseEverythingExcept = source => {
    if (switching && currentSource === source) return;
    switching = true;
    currentSource = source;

    try {
      if (source !== 'launchpad' && !audio.paused) audio.pause();
      if (source !== 'spotify' && spotifyController) spotifyController.pause();
      if (source !== 'soundcloud' && soundcloudWidget) soundcloudWidget.pause();
    } finally {
      window.setTimeout(() => {
        switching = false;
      }, 80);
    }
  };

  audio.addEventListener('play', () => pauseEverythingExcept('launchpad'));

  const spotifyFrame = document.querySelector('.spotify-frame');
  if (spotifyFrame) {
    const spotifyMount = document.createElement('div');
    spotifyMount.id = 'spotify-embed';
    spotifyMount.className = 'stream-frame spotify-frame spotify-api-mount';
    spotifyMount.setAttribute('aria-label', 'SHINOBIWAN Spotify player');
    spotifyFrame.replaceWith(spotifyMount);

    window.onSpotifyIframeApiReady = IFrameAPI => {
      IFrameAPI.createController(
        spotifyMount,
        {
          uri: SPOTIFY_URI,
          width: '100%',
          height: 352,
          theme: 'dark'
        },
        controller => {
          spotifyController = controller;
          controller.addListener('playback_started', () => pauseEverythingExcept('spotify'));
          controller.addListener('playback_update', event => {
            if (event?.data && event.data.isPaused === false) {
              pauseEverythingExcept('spotify');
            }
          });
        }
      );
    };

    loadScript(SPOTIFY_API, 'spotify-iframe-api').catch(error => {
      console.warn('Spotify iframe API could not be loaded', error);
    });
  }

  const soundcloudFrame = document.querySelector('.soundcloud-frame');
  if (soundcloudFrame) {
    loadScript(SOUNDCLOUD_API, 'soundcloud-widget-api')
      .then(() => {
        if (!window.SC?.Widget) return;
        soundcloudWidget = window.SC.Widget(soundcloudFrame);
        soundcloudWidget.bind(window.SC.Widget.Events.PLAY, () => {
          pauseEverythingExcept('soundcloud');
        });
      })
      .catch(error => {
        console.warn('SoundCloud widget API could not be loaded', error);
      });
  }

  window.shinobiAudioFocus = {
    pauseAll() {
      audio.pause();
      spotifyController?.pause();
      soundcloudWidget?.pause();
      currentSource = null;
    }
  };
}
