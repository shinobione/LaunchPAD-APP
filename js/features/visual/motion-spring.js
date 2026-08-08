const FRAME_STATES = new WeakMap();

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function beginMotionFrame(context, time) {
  const key = context?.canvas || context;
  let frame = FRAME_STATES.get(key);
  if (!frame) {
    frame = { lastTime: time, channels: new Map(), phases: new Map() };
    FRAME_STATES.set(key, frame);
  }
  const elapsed = Number.isFinite(frame.lastTime) ? time - frame.lastTime : 1 / 60;
  frame.lastTime = time;
  frame.dt = clamp(Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 1 / 60, 1 / 240, 1 / 24);
  if (elapsed > .25) {
    for (const channel of frame.channels.values()) channel.velocity *= .18;
    for (const phase of frame.phases.values()) phase.speed *= .25;
  }
  return frame;
}

export function springChannel(frame, key, target, options = {}) {
  const stiffness = options.stiffness ?? 48;
  const damping = options.damping ?? 8.8;
  const minimum = options.minimum ?? -0.35;
  const maximum = options.maximum ?? 1.55;
  let channel = frame.channels.get(key);
  if (!channel) {
    channel = { value: Number(target) || 0, velocity: 0 };
    frame.channels.set(key, channel);
  }
  const desired = Number.isFinite(target) ? target : 0;
  const acceleration = (desired - channel.value) * stiffness;
  channel.velocity = (channel.velocity + acceleration * frame.dt) * Math.exp(-damping * frame.dt);
  channel.value = clamp(channel.value + channel.velocity * frame.dt, minimum, maximum);
  return channel;
}

/**
 * Blend raw FFT energy with the already-smoothed feature stream without letting
 * either source pin the visual at its maximum pose. Unlike Build 56's soft-knee
 * compression this keeps the full 0..1 travel range and mainly expands the
 * quiet/mid part of the signal.
 */
export function shapeAudioDrive(rawValue, featureValue, options = {}) {
  const rawGain = options.rawGain ?? 1.38;
  const featureWeight = clamp(options.featureWeight ?? .32, 0, .75);
  const exponent = clamp(options.exponent ?? .72, .48, 1);
  const raw = clamp((Number(rawValue) || 0) * rawGain, 0, 1);
  const feature = clamp(Number(featureValue) || 0, 0, 1);
  const mixed = raw * (1 - featureWeight) + feature * featureWeight;
  return Math.pow(clamp(mixed, 0, 1), exponent);
}

/**
 * Integrate a real kinetic phase instead of multiplying absolute time by a
 * changing activity value. The phase moves forward only while audio activity
 * exists, so steady musical passages keep flowing and pause/silence stop it.
 */
export function advanceMotionPhase(frame, key, activity, options = {}) {
  const gate = options.gate ?? .018;
  const baseSpeed = options.baseSpeed ?? .42;
  const dynamicSpeed = options.dynamicSpeed ?? 1.55;
  const response = options.response ?? 5.2;
  const release = options.release ?? 9;
  const drive = clamp(Number(activity) || 0, 0, 1);
  let state = frame.phases.get(key);
  if (!state) {
    state = { phase: 0, speed: 0 };
    frame.phases.set(key, state);
  }
  const targetSpeed = drive > gate
    ? baseSpeed + dynamicSpeed * Math.pow(drive, .58)
    : 0;
  const coefficient = 1 - Math.exp(-(targetSpeed > state.speed ? response : release) * frame.dt);
  state.speed += (targetSpeed - state.speed) * coefficient;
  if (Math.abs(state.speed) < .0005 && targetSpeed === 0) state.speed = 0;
  state.phase += state.speed * frame.dt;
  return state;
}

// Kept as a tiny compatibility helper for older tests/tools; new elastic modes
// should use advanceMotionPhase() so changing activity cannot make phase jump.
export function motionPhase(time, activity, speed = 1) {
  return time * Math.max(0, Number(activity) || 0) * speed;
}
