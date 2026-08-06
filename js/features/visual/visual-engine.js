import { createVisualController as createLiveVisualController } from './visual-engine-live.js';

const TEST_VISUAL_CONTROLLER = Object.freeze({
  resume() {},
  setMode() {}
});

export function createVisualController(options) {
  const visualTest = document.documentElement.dataset.visualTest === 'true';
  if (visualTest) {
    document.documentElement.dataset.audioLabRenderer = 'disabled-for-visual-test';
    return TEST_VISUAL_CONTROLLER;
  }
  return createLiveVisualController(options);
}
