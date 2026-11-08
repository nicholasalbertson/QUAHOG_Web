/**
 * §5.5.1 Traffic collision avoidance — car-following + lane change urge.
 */

export interface TrafficPose {
  id: string;
  x: number;
  z: number;
  yaw: number;
  speed: number;
  lane: number;
}

export interface AvoidanceOut {
  throttle: number;
  steer: number;
  laneDelta: number;
}

/** Simple IDM-ish follow: slow when leader ahead in same lane. */
export function followThrottle(
  self: TrafficPose,
  others: TrafficPose[],
  desiredSpeed: number,
  lookAhead = 18,
): number {
  let nearest = Infinity;
  let leaderSpeed = desiredSpeed;
  for (const o of others) {
    if (o.id === self.id || o.lane !== self.lane) continue;
    const dx = o.x - self.x;
    const dz = o.z - self.z;
    const ahead = dx * Math.sin(self.yaw) + dz * Math.cos(self.yaw);
    if (ahead < 0.5 || ahead > lookAhead) continue;
    if (ahead < nearest) {
      nearest = ahead;
      leaderSpeed = o.speed;
    }
  }
  if (nearest === Infinity) return Math.min(1, desiredSpeed / 20);
  const gap = Math.max(0.1, nearest - 6);
  const target = Math.min(desiredSpeed, leaderSpeed * 0.95 + gap * 0.4);
  return Math.max(-0.4, Math.min(1, (target - self.speed) * 0.15));
}

/** Urge lane change when blocked and adjacent clear. */
export function laneChangeUrge(self: TrafficPose, others: TrafficPose[]): number {
  const blocked = others.some((o) => {
    if (o.id === self.id || o.lane !== self.lane) return false;
    const ahead = (o.x - self.x) * Math.sin(self.yaw) + (o.z - self.z) * Math.cos(self.yaw);
    return ahead > 0 && ahead < 12 && o.speed < self.speed - 2;
  });
  if (!blocked) return 0;
  for (const delta of [-1, 1]) {
    const lane = self.lane + delta;
    const clear = !others.some((o) => {
      if (o.lane !== lane) return false;
      const d = Math.hypot(o.x - self.x, o.z - self.z);
      return d < 10;
    });
    if (clear) return delta;
  }
  return 0;
}

export function stepAvoidance(
  self: TrafficPose,
  others: TrafficPose[],
  desiredSpeed: number,
): AvoidanceOut {
  return {
    throttle: followThrottle(self, others, desiredSpeed),
    steer: 0,
    laneDelta: laneChangeUrge(self, others),
  };
}
