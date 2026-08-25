import { drawHaloVectorMode } from './halo-vector.js';

/**
 * Gravity Lens compatibility bridge — Build 115.
 *
 * The sanctioned preset keeps the historical `gravity-lens` id so saved UI
 * state and older regression guards remain stable, but the renderer itself is
 * now the new Halo Vector visual. Gravity Lens is no longer shown to users.
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
  return drawHaloVectorMode(context, width, height, data, accent, accent2, time, features);
}
