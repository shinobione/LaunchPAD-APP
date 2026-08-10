import fs from 'node:fs';

const fail = message => { throw new Error(message); };
const read = path => fs.readFileSync(path, 'utf8');

const icon = fs.readFileSync('assets/app-icon-neon-512.png');
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (icon.length < 1024 || !icon.subarray(0, 8).equals(pngSignature)) fail('Android media artwork must be a real PNG file.');

const mediaSession = read('js/features/media-session.js');
for (const required of ['artwork: MEDIA_ARTWORK','assets/app-icon-neon-192.png','assets/app-icon-neon-512.png',"type: 'image/png'"]) {
  if (!mediaSession.includes(required)) fail(`Media Session is missing ${required}.`);
}
if (mediaSession.includes('assets/pwa-icon-512.png')) fail('Media Session still references the retired circular app icon.');

const remoteCatalog = read('js/core/remote-catalog.js');
for (const required of [
  'function timestampState',"cache: 'no-store'",'timestampsAvailable: timestampState(item.timestampsAvailable)','apiUrl:',
  'video: item.assets.video?.url || null','videoContentType: item.assets.video?.contentType || null','videoFilename: item.assets.video?.filename || null',
  'createdAt,','updatedAt,',"status: item.status || 'published'"
]) {
  if (!remoteCatalog.includes(required)) fail(`Remote catalog is missing ${required}.`);
}

const trackDetail = read('js/features/track-detail.js');
for (const required of ['verifyRemoteLyricsTiming','detectTimestampedLyrics','remoteTrack?.lyrics?.segments',"cache: 'no-store'","'Checking…'","metadataItem('Lyrics', lyricsLabel, '', lyricsAttributes)"]) {
  if (!trackDetail.includes(required)) fail(`Track detail is missing ${required}.`);
}
if (trackDetail.includes("metadataItem('Lyrics timing'")) fail('Track detail must expose one authoritative lyrics status instead of a duplicate timing field.');

const router = read('js/core/router.js');
for (const required of ["'studio'","route.type === 'studio'","{ type: 'lyrics', id: route.id }","'shinobi:route-change'",'routeToHash(route)']) {
  if (!router.includes(required)) fail(`Dedicated Studio routing is missing ${required}.`);
}

const trackVideos = read('js/features/track-videos.js');
for (const required of [
  'track?.video',"preload = 'auto'","badge.textContent = 'VIDEO'","button.textContent = 'Video'","button.textContent = opening ? 'Player' : 'Video'",
  'video.playsInline = true','video.loop = true','video.muted = true','video.controls = false','video.dataset.src = track.video',
  "video.setAttribute('webkit-playsinline', '')",'data-track-video-loop-action','data-track-studio-action','`#studio=${encodeURIComponent(trackId)}`',"button.textContent = 'Studio'"
]) {
  if (!trackVideos.includes(required)) fail(`Track Video and Studio entry are missing ${required}.`);
}
for (const forbiddenLabel of ["button.textContent = 'Open Canvas'","badge.textContent = 'CANVAS'","button.textContent = 'Hide Canvas'"]) {
  if (trackVideos.includes(forbiddenLabel)) fail(`Legacy track video wording survived Feature 11: ${forbiddenLabel}.`);
}
if (trackVideos.includes('requestLyricsStudio') || trackVideos.includes('sessionStorage')) fail('Track detail must use the dedicated Studio route instead of a temporary handoff.');
if (trackVideos.includes('fetch(')) fail('Track Video playback must use the hydrated catalog instead of making a second metadata request.');
for (const forbidden of ['audio?.pause()', "audio?.addEventListener('play'"]) {
  if (trackVideos.includes(forbidden)) fail(`Track video UI must not own or interrupt the audio player: ${forbidden}.`);
}

const feature11 = read('js/features/feature-11.js');
for (const required of [
  "const VIDEO_SELECTOR = 'video.track-video-player'",
  "video.addEventListener('ended'", "video.addEventListener('timeupdate'",
  "audio?.addEventListener('play'", "audio?.addEventListener('pause'", "video.preload = 'auto'",
  'video.loop = false', "video.removeAttribute('loop')", 'VIDEO_RECOVERY_HANDLER', 'VIDEO_STALL_THRESHOLD',
  'VIDEO_TERMINAL_STALL_WINDOW', "video[VIDEO_RECOVERY_HANDLER]?.('terminal-stall')",
  'installAudioClockStability', "audio.dispatchEvent(new Event('timeupdate'))"
]) {
  if (!feature11.includes(required)) fail(`Feature 11 media stabilization is missing ${required}.`);
}
for (const forbidden of [
  'video.load()', "video.addEventListener('stalled'", "video.addEventListener('waiting'",
  "recoverLoop('boundary')", 'video.duration - current < 0.14',
  "video.track-video-player, video.lyrics-studio-canvas-video"
]) {
  if (feature11.includes(forbidden)) fail(`Track Video recovery must stay isolated from protected-media reload/pre-boundary/cross-owner churn: ${forbidden}.`);
}
if (!feature11.includes('installAudioClockStability(audio);') || !feature11.includes('installVideoStability(audio);')) {
  fail('Feature 11 must install both the audio clock heartbeat and isolated Track Video recovery layers.');
}

const lyricsStudio = read('js/features/lyrics-studio.js');
for (const required of [
  "dataset.lyricsStudio = 'canvas'",'lyrics-studio-canvas-active',"video.className = 'lyrics-studio-canvas-video'",
  "video.autoplay = false",'video.loop = true',"video.setAttribute('loop', '')","video.preload = 'none'",
  'video.muted = true','video.controls = false',"ensureStylesheet('css/track-videos.css')",'autoScrollButton','has-canvas-control','setPressed',
  'parseRoute','routeToHash','routeMatchesCurrentStudio','syncStudioRoute','preserveStudioForCurrentTrack',"type: 'studio'","'shinobi:route-change'",
  'canvasVideo.src = canvasVideo.dataset.src','canvasVideo.load()','canvasVideo.play()',
  "canvasVideo.addEventListener('playing'", "canvasVideo.addEventListener('error'",
  'function installSingleCommitSeek()',
  "seek.addEventListener('input', preview, { capture: true })",
  "seek.addEventListener('pointerup', commit, { capture: true })",
  'event.stopImmediatePropagation()',
  "window.dispatchEvent(new CustomEvent('shinobi:seek-preview'",
  "window.dispatchEvent(new CustomEvent('shinobi:seek-commit'"
]) {
  if (!lyricsStudio.includes(required)) fail(`Lyrics Studio Build 83 native-loop/single-commit contract is missing ${required}.`);
}
for (const forbidden of [
  'requestLyricsStudio','pendingStudioTrackId','sessionStorage','shinobi-launchpad-open-studio-track',
  'CANVAS_LOCAL_RECOVERY_LIMIT','CANVAS_LOCAL_STALL_GRACE_MS','prepareCanvasSource(','scheduleLocalCanvasRecovery','restartLocalCanvas',
  'URL.createObjectURL','URL.revokeObjectURL',"fetch(track.video", "data-transport', 'blob'",
  "canvasVideo.addEventListener('ended'", "canvasVideo.addEventListener('waiting'", "canvasVideo.addEventListener('stalled'",
  "playCanvas('local-loop')", "playCanvas('audio-playing')", "audio.addEventListener('seeking'", "audio.addEventListener('seeked'",
  "audio.addEventListener('playing'", 'androidMobileStudioCanvasDisabled', 'androidCanvasDisabled', 'MOBILE SAFE VISUAL',
  "window.addEventListener('pageshow'", "document.addEventListener('visibilitychange'"
]) {
  if (lyricsStudio.includes(forbidden)) fail(`Build 83 Lyrics Studio must not reintroduce multi-owner/recovery/Blob lifecycle churn: ${forbidden}.`);
}
if (/\baudio\s*\.\s*pause\s*\(/.test(lyricsStudio)) fail('Lyrics Studio video must leave the music track playing.');

const smartCanvas = read('js/features/smart-canvas.js');
if (!smartCanvas.includes("const CANVAS_SELECTOR = 'video.track-video-player';")) {
  fail('Smart Canvas must be scoped to Track Video only in Build 83.');
}
if (smartCanvas.includes("video.track-video-player, video.lyrics-studio-canvas-video")) {
  fail('Smart Canvas must never own the Lyrics Studio Canvas after Build 83.');
}

const uiController = read('js/features/ui/ui-controller.js');
for (const required of [
  "ensureStylesheet('css/player-routing-v83.css')",
  "currentTrack.removeAttribute('data-view-target')",
  "identity.className = 'current-track-identity'",
  "identity.dataset.viewTarget = 'lyrics'",
  "identity.setAttribute('role', 'button')",
  "identity.setAttribute('tabindex', '0')"
]) {
  if (!uiController.includes(required)) fail(`Build 83 mini-player routing boundary is missing ${required}.`);
}
if (uiController.includes("currentTrack.dataset.viewTarget = 'lyrics'")) {
  fail('The full mini-player container must not be a Lyrics route target in Build 83.');
}

const mobileLyricsRouting = read('js/ui-polish-v62.js');
for (const retiredWorkaround of ['INTERACTIVE_SELECTOR', 'nestedInteractiveControl', 'if (nestedInteractiveControl(event.target, entry)) return;']) {
  if (mobileLyricsRouting.includes(retiredWorkaround)) fail(`Build 82 routing workaround must be removed after the structural Build 83 fix: ${retiredWorkaround}.`);
}

const lyricsEngine = read('js/features/lyrics/lyrics-engine.js');
for (const required of [
  'centeredScrollTop','centerElementInScrollContainer','getBoundingClientRect','lineIsInReaderFocusZone','scrollLineIntoReader','reader.scrollTo',
  "button.setAttribute('aria-pressed', String(autoScroll))",'let seekInProgress = false','function beginSeek(time)','function settleSeek(time = audio.currentTime)',
  "window.addEventListener('shinobi:seek-preview'", "window.addEventListener('shinobi:seek-commit'", "audio.addEventListener('seeking'", "audio.addEventListener('seeked'",
  "update(time, { behavior: 'auto', forceCenter: true, allowScroll: true })"
]) {
  if (!lyricsEngine.includes(required)) fail(`Lyrics reader settled-seek state is missing ${required}.`);
}
for (const forbidden of ['scrollIntoView', 'element.offsetTop -']) {
  if (lyricsEngine.includes(forbidden)) fail(`Lyrics auto-scroll must stay relative to its reader instead of the page: ${forbidden}.`);
}

const listeningSummary = read('js/features/listening-history-summary.js');
for (const required of ['shinobi-launchpad-listening-summary-v1','playedTrackIds','tracks played locally',"audio.addEventListener('play'"]) {
  if (!listeningSummary.includes(required)) fail(`Listening summary is missing ${required}.`);
}

const brandCss = read('css/about-enhancements.css');
if (brandCss.includes('NinJa-ShinoBiWan.png')) fail('Build 77 must not inject the Ninja into the Home hero composition.');
if (!brandCss.includes("mask:url('../assets/logo.png')") || !brandCss.includes('.about-signature-art')) {
  fail('Build 77 must preserve the gold sidebar identity and About moon artwork.');
}

console.log('Build 83 surgical rollback guards are valid: mini-player route identity is structural, Lyrics Studio owns one native-loop Canvas, Smart Canvas excludes Studio, and single-commit audio seeking remains protected.');
