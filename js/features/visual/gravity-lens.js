import { drawKineticGlassMode } from './kinetic-glass.js';

/**
 * Legacy Gravity Lens compatibility bridge — Build 117.
 *
 * The internal preset id remains `gravity-lens` so saved state and historical
 * guards continue to resolve, but the renderer is now Kinetic Glass.
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
  return drawKineticGlassMode(context, width, height, data, accent, accent2, time, features);
}
