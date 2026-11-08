/**
 * §1.4 ClockWeather — game clock, weather FSM, wetness, friction API.
 * DayNight remains the visual consumer; this owns the sim-facing state.
 */

import type { Weather } from "../store";
import { emitTelemetry } from "../telemetry/schema";
import { rng } from "./Rng";
import { nightFactorFor, seasonForDay, sunMoonUniforms } from "./SunriseTables";

export type Surface =
  | "asphalt"
  | "wetAsphalt"
  | "cobble"
  | "dirt"
  | "grass"
  | "sand"
  | "planks"
  | "water";

export type WeatherKind = Weather;

const CYCLE: WeatherKind[] = ["clear", "rain", "snow", "fog"];

/** §1.9.3 Surface friction table (dry baseline; ClockWeather.friction applies weather). */
export const SURFACE_FRICTION: Record<Surface, number> = {
  asphalt: 1,
  wetAsphalt: 0.72,
  cobble: 0.88,
  dirt: 0.78,
  grass: 0.65,
  sand: 0.55,
  planks: 0.85,
  water: 0.2,
};

const BASE_FRICTION = SURFACE_FRICTION;

export interface ClockWeatherSave {
  day: number;
  hour: number;
  weather: WeatherKind;
  wetness: number;
  blend: number;
}

export class ClockWeather {
  day = 1;
  /** Hours 0..24 */
  hour = 9;
  weather: WeatherKind = "clear";
  /** 0..1 road wetness. */
  wetness = 0;
  /** Cross-fade into next weather 0..1. */
  blend = 1;
  private pending: WeatherKind | null = null;
  private blendSec = 0;
  private blendAcc = 0;
  wind = { x: 0, y: 0, z: 0 };
  /** §1.4.10 Lightning flash remaining (seconds). */
  lightningFlash = 0;
  private stormAcc = 0;

  /** timeOfDay in 0..1 (midnight→midnight). */
  get time01(): number {
    return ((this.hour % 24) + 24) % 24 / 24;
  }

  /** Night factor 0..1 for lighting (§1.4.2 season tables). */
  get nightFactor(): number {
    return nightFactorFor(this.hour, seasonForDay(this.day));
  }

  /** §1.4.3 Sun/moon uniforms for lighting consumers. */
  lightingUniforms() {
    return sunMoonUniforms(this.hour, seasonForDay(this.day));
  }

  advance(dt: number, dayLengthSec = 600): void {
    const prev = this.hour;
    this.hour = (this.hour + dt * (24 / dayLengthSec)) % 24;
    if (this.hour < prev) this.day += 1;

    // Wetness rises in rain/snow, decays otherwise.
    if (this.weather === "rain" || this.weather === "snow") {
      this.wetness = Math.min(1, this.wetness + dt * 0.08);
    } else {
      this.wetness = Math.max(0, this.wetness - dt * 0.03);
    }

    if (this.pending && this.blendSec > 0) {
      this.blendAcc += dt;
      this.blend = Math.min(1, this.blendAcc / this.blendSec);
      if (this.blend >= 1) {
        this.weather = this.pending;
        this.pending = null;
        this.blend = 1;
        emitTelemetry("sim.weather.change", { weather: this.weather });
      }
    }

    // Mild wind from wetness / fog.
    const w = 0.4 + this.wetness * 1.2 + (this.weather === "fog" ? 0.3 : 0);
    this.wind.x = Math.sin(this.hour) * w;
    this.wind.z = Math.cos(this.hour * 0.7) * w;

    // §1.4.10 Lightning during heavy rain / wetness spikes.
    if (this.lightningFlash > 0) this.lightningFlash = Math.max(0, this.lightningFlash - dt);
    if (this.weather === "rain" && this.wetness > 0.55) {
      this.stormAcc += dt;
      if (this.stormAcc > 4) {
        this.stormAcc = 0;
        if (rng.stream("weather").next() < 0.35) this.flashLightning();
      }
    } else {
      this.stormAcc = 0;
    }
  }

  /** §1.4.10 Emit lightning flash + thunder hook event. */
  flashLightning(duration = 0.18): void {
    this.lightningFlash = duration;
    emitTelemetry("sim.weather.lightning", { wetness: this.wetness });
  }

  setWeather(k: WeatherKind, blendSec = 0.8): void {
    if (k === this.weather && !this.pending) return;
    if (blendSec <= 0) {
      this.weather = k;
      this.pending = null;
      this.blend = 1;
      emitTelemetry("sim.weather.change", { weather: k });
      return;
    }
    this.pending = k;
    this.blendSec = blendSec;
    this.blendAcc = 0;
    this.blend = 0;
  }

  cycleWeather(): WeatherKind {
    const i = CYCLE.indexOf(this.weather);
    const next = CYCLE[(i + 1) % CYCLE.length];
    this.setWeather(next, 0.6);
    return next;
  }

  /** §1.4.15 Deterministic weather pick from weather RNG stream. */
  rollWeather(blendSec = 0.8): WeatherKind {
    const next = rng.stream("weather").pick(CYCLE);
    this.setWeather(next, blendSec);
    return next;
  }

  /** §1.4.16 Telemetry snapshot. */
  telemetrySample(surface: Surface = "asphalt"): Record<string, unknown> {
    return {
      weather: this.weather,
      wetness: this.wetness,
      friction: this.friction(surface),
      night: this.nightFactor,
      wind: { ...this.wind },
      lightning: this.lightningFlash,
    };
  }

  friction(surface: Surface = "asphalt"): number {
    let s = surface;
    if ((s === "asphalt" || s === "cobble") && this.wetness > 0.25) s = "wetAsphalt";
    let f = BASE_FRICTION[s];
    if (this.weather === "fog") f *= 0.95;
    if (this.weather === "snow") f *= 0.7;
    return f;
  }

  /** Streaming hint — shorten far ring in fog / snow. */
  streamRadiusScale(): number {
    if (this.weather === "fog") return 0.7;
    if (this.weather === "snow") return 0.85;
    if (this.weather === "rain") return 0.9;
    return 1;
  }

  syncFromShared(day: number, hour: number, weather: WeatherKind): void {
    this.day = day;
    this.hour = hour;
    this.weather = weather;
  }

  serialize(): ClockWeatherSave {
    return {
      day: this.day,
      hour: this.hour,
      weather: this.weather,
      wetness: this.wetness,
      blend: this.blend,
    };
  }

  restore(s: ClockWeatherSave): void {
    this.day = s.day;
    this.hour = s.hour;
    this.weather = s.weather;
    this.wetness = s.wetness;
    this.blend = s.blend;
    this.pending = null;
  }
}
