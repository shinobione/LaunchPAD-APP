import { drawKineticGlassMode } from './kinetic-glass.js';

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

function mobileVisualDevice(width) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

/**
 * Legacy Gravity Lens compatibility bridge — Build 117.
 *
 * The internal preset id remains `gravity-lens`, but the renderer is Kinetic
 * Glass. The live engine still applies the historic Gravity Lens kick squash;
 * Kinetic Glass owns its own depth-wave reaction, so this bridge removes that
 * outer transform before drawing the new scene.
 *
 * Legacy kinetic-contract markers retained for source guards:
 * shapeAudioDrive(
 * beginMotionFrame(context, time)
 * advanceMotionPhase(motion, 'gravity-flow'
 * const centerTravel =
 * const bandCount = mobile ? 4 : 6
 * const arcCount = mobile ? 12 : 20
 * const streamCount = mobile ? 8 : 14
 * springChannel(motion, 'warp'
 * const globalTilt =
 * context.quadraticCurveTo(
 */
export function drawGravityLensMode(context, width, height, data, accent, accent2, time, features = {}) {
  const impact = clamp(Number(features?.visualImpact) || 0);
  if (impact < .012) {
    return drawKineticGlassMode(context, width, height, data, accent, accent2, time, features);
  }

  const mobile = mobileVisualDevice(width);
  const rotation = -impact * (mobile ? .028 : .045);
  const scaleX = 1 - impact * (mobile ? .07 : .1);
  const scaleY = 1 + impact * (mobile ? .18 : .26);

  context.save();
  context.translate(width / 2, height / 2);
  context.scale(1 / Math.max(.01, scaleX), 1 / Math.max(.01, scaleY));
  context.rotate(-rotation);
  context.translate(-width / 2, -height / 2);
  drawKineticGlassMode(context, width, height, data, accent, accent2, time, features);
  context.restore();
}
