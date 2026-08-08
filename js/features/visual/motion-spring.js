const FRAME_STATES = new WeakMap();

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function beginMotionFrame(context, time) {
  const key = context?.canvas || context;
  let frame = FRAME_STATES.get(key);
  if (!frame) {
    frame = { lastTime: time, channels: new Map() };
    FRAME_STATES.set(key, frame);
  }
  const elapsed = Number.isFinite(frame.lastTime) ? time - frame.lastTime : 1 / 60;
  frame.lastTime = time;
  frame.dt = clamp(Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 1 / 60, 1 / 240, 1 / 24);
  if (elapsed > .25) {
    for (const channel of frame.channels.values()) channel.velocity *= .18;
  }
  return frame;
}

export function springChannel(frame, key, target, options = {}) {
  const stiffness = options.stiffness ?? 54;
  const damping = options.damping ?? 10.5;
  const minimum = options.minimum ?? -0.25;
  const maximum = options.maximum ?? 1.45;
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
 * Expand small/mid signal movement while compressing the top end.
 *
 * Audio Lab features are intentionally boosted upstream so weak tracks remain
 * readable. Visuals that consume those values directly can therefore spend too
 * much time near 1.0 and look stuck in a permanently "fully open" pose. This
 * soft-knee map preserves low/mid detail and reserves headroom for real peaks.
 */
export function shapeMotionTarget(value, options = {}) {
  const knee = clamp(options.knee ?? .56, .2, .9);
  const ceiling = clamp(options.ceiling ?? .9, knee + .02, 1.2);
  const lowExponent = clamp(options.lowExponent ?? .84, .55, 1);
  const input = clamp(Number(value) || 0, 0, 1);
  if (input <= 0) return 0;
  if (input <= knee) return knee * Math.pow(input / knee, lowExponent);
  const progress = (input - knee) / Math.max(.001, 1 - knee);
  const curve = (1 - Math.exp(-2.15 * progress)) / (1 - Math.exp(-2.15));
  return knee + (ceiling - knee) * curve;
}

export function motionPhase(time, activity, speed = 1) {
  const gated = Math.pow(clamp(Number(activity) || 0, 0, 1.2), .62);
  return time * gated * speed;
}
