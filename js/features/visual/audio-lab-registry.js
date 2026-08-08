export const AUDIO_LAB_DEFAULT_MODE = 'neon-shatter';

export const AUDIO_LAB_PRESETS = Object.freeze([
  Object.freeze({ id: 'neon-shatter', label: 'Neon Shatter', tier: 'core' }),
  Object.freeze({ id: 'spectrum', label: 'Spectrum', tier: 'sanctuary' }),
  Object.freeze({ id: 'liquid-chrome', label: 'Liquid Chrome', tier: 'core' }),
  Object.freeze({ id: 'pulse-reactor', label: 'Pulse Reactor', tier: 'core' }),
  Object.freeze({ id: 'bass-fracture', label: 'Bass Fracture', tier: 'core' }),
  Object.freeze({ id: 'gravity-lens', label: 'Gravity Lens', tier: 'core' }),
  Object.freeze({ id: 'bio-structure', label: 'Bio Structure', tier: 'core' })
]);

export const AUDIO_LAB_PRESET_IDS = Object.freeze(AUDIO_LAB_PRESETS.map(preset => preset.id));
export const AUDIO_LAB_PRESET_LABELS = Object.freeze(new Map(AUDIO_LAB_PRESETS.map(preset => [preset.id, preset.label])));
export const AUDIO_LAB_SANCTUARY_IDS = Object.freeze(['spectrum']);

const ALLOWED = new Set(AUDIO_LAB_PRESET_IDS);

export function isSanctionedAudioLabMode(value) {
  return ALLOWED.has(String(value || '').trim().toLowerCase());
}

export function normalizeAudioLabMode(value, fallback = AUDIO_LAB_DEFAULT_MODE) {
  const mode = String(value || '').trim().toLowerCase();
  return ALLOWED.has(mode) ? mode : fallback;
}
