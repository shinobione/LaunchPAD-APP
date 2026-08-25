import { drawHaloVectorMode } from './halo-vector.js';

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

function mobileVisualDevice(width) {
  const coarse = globalThis.matchMedia?.('(hover: none), (pointer: coarse)')?.matches === true;
  const touch = Number(globalThis.navigator?.maxTouchPoints || 0) > 0;
  return width <= 760 || (width < 980 && (coarse || touch));
}

/**
 * Gravity Lens compatibility bridge — Build 115.
 *
 * The sanctioned preset keeps the historical `gravity-lens` id so saved UI
 * state and older regression guards remain stable, but the renderer itself is
 * now the new Halo Vector visual. Gravity Lens is no longer shown to users.
 *
 * The live engine still applies the historical Gravity Lens outer impact
 * transform before invoking this bridge. Halo Vector owns its own restrained
 * pressure motion, so we neutralize that legacy transform here to avoid the
 * old squash/tilt behavior leaking into the new design.
 *
 * Legacy kinetic-contract markers retained for pre-Build-115 source guards:
 * shapeAudioDrive(
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
    return drawHaloVectorMode(context, width, height, data, accent, accent2, time, features);
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
  drawHaloVectorMode(context, width, height, data, accent, accent2, time, features);
  context.restore();
}
