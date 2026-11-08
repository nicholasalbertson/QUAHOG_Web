/**
 * §1.9.9 Powertrain — gear ratios, torque curve, reverse, handbrake flag.
 */

export interface PowertrainState {
  gear: number; // -1 reverse, 0 neutral, 1..N
  rpm: number;
  handbrake: boolean;
}

export interface PowertrainConfig {
  gears: number[];
  idleRpm: number;
  redline: number;
  peakTorque: number;
  peakRpm: number;
}

export const DEFAULT_POWERTRAIN: PowertrainConfig = {
  gears: [-2.8, 0, 3.2, 2.1, 1.5, 1.1, 0.85],
  idleRpm: 800,
  redline: 6500,
  peakTorque: 320,
  peakRpm: 4200,
};

export function createPowertrain(): PowertrainState {
  return { gear: 1, rpm: DEFAULT_POWERTRAIN.idleRpm, handbrake: false };
}

export function torqueAt(rpm: number, cfg = DEFAULT_POWERTRAIN): number {
  const x = (rpm - cfg.idleRpm) / (cfg.redline - cfg.idleRpm);
  const peak = cfg.peakRpm / cfg.redline;
  const bell = Math.exp(-Math.pow((x - peak) * 3.2, 2));
  return cfg.peakTorque * bell;
}

export function driveForce(
  state: PowertrainState,
  throttle: number,
  cfg = DEFAULT_POWERTRAIN,
): number {
  if (state.handbrake || state.gear === 0) return 0;
  const ratio = cfg.gears[state.gear + 1] ?? 1;
  const t = torqueAt(state.rpm, cfg) * Math.max(0, Math.min(1, throttle));
  return t * ratio * Math.sign(ratio || 1);
}

export function stepRpm(
  state: PowertrainState,
  throttle: number,
  speed: number,
  dt: number,
  cfg = DEFAULT_POWERTRAIN,
): PowertrainState {
  const target =
    cfg.idleRpm +
    Math.max(0, throttle) * (cfg.redline - cfg.idleRpm) * 0.85 +
    Math.abs(speed) * 40;
  state.rpm += (target - state.rpm) * Math.min(1, dt * 4);
  state.rpm = Math.max(cfg.idleRpm, Math.min(cfg.redline, state.rpm));
  // Simple auto shift
  if (state.gear > 0 && state.rpm > cfg.redline * 0.92 && state.gear < cfg.gears.length - 2) {
    state.gear++;
  } else if (state.gear > 1 && state.rpm < cfg.idleRpm * 1.4) {
    state.gear--;
  }
  if (throttle < -0.2 && Math.abs(speed) < 2) state.gear = -1;
  if (throttle >= 0 && state.gear < 0 && Math.abs(speed) < 1) state.gear = 1;
  return state;
}
