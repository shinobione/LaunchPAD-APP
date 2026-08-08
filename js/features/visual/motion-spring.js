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

export function motionPhase(time, activity, speed = 1) {
  return time * Math.max(0, activity) * speed;
}
