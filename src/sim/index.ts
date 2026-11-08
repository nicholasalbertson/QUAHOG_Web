/** Public entry for the independent open-world simulation layer. */

export type {
  Vec2,
  Vec3,
  StreamState,
  StreamAsset,
  NavPath,
  NavGuidance,
  CameraMode,
  CameraPose,
  VehicleInput,
  VehicleDynamicsState,
  RoadNode,
  RoadEdge,
} from "./types";

export { lerp, lerpAngle, clamp, expSmooth, dist, normalize2, bearingTo, angleDelta } from "./math";
export { FrameBudget } from "./FrameBudget";
export { SpatialIndex } from "./SpatialIndex";
export { WorldStreamer } from "./WorldStreamer";
export type { StreamerMetrics } from "./WorldStreamer";
export { dijkstra } from "./Dijkstra";
export { RoadGraph } from "./RoadGraph";
export { PedGraph } from "./PedGraph";
export { MissionRuntime } from "./MissionRuntime";
export type { GameEvent, MissionPhase, OwnedEntity, MissionCheckpoint, ObjectiveState } from "./MissionRuntime";
export {
  evalCondition,
  validateCondition,
  serializeCondition,
  deserializeCondition,
  countNodes,
} from "./Conditions";
export type { ConditionNode, ConditionCtx } from "./Conditions";
export { defineMission } from "./MissionAuthoring";
export type { MissionDef, MissionStepDef } from "./MissionAuthoring";
export {
  beginCutscene,
  endCutscene,
  isCutsceneActive,
  duckForWanted,
  setCutsceneDuck,
} from "./CutsceneStub";
export {
  createCrosswalkAgent,
  stepCrosswalk,
  walkWindowFromClock,
} from "./CrosswalkFsm";
export type { CrosswalkPhase, CrosswalkAgent } from "./CrosswalkFsm";
export { HeatAxes, CRIME_TABLE } from "./HeatAxes";
export type { CrimeKind, HeatAxesState } from "./HeatAxes";
export { stepBoat, sampleWave, damageBoat, createBoat } from "./BoatDynamics";
export type { BoatState, WaveSample } from "./BoatDynamics";
export { FactionTerritory } from "./FactionTerritory";
export type { FactionPoly, FactionHeat } from "./FactionTerritory";
export { playThunderNear } from "./LightningAudio";
export { meleeSwing, hitscan, ttkSeconds } from "./CombatStub";
export type { WeaponId, HitResult, CombatActor } from "./CombatStub";
export {
  startDialogue,
  advanceDialogue,
  skipDialogue,
  setSubtitleSink,
  emitSubtitle,
  speakLine,
} from "./DialogueStub";
export type { DialogueLine, DialogueSession } from "./DialogueStub";
export { RACE_TRACKS, startRace, stepRace, racePosition } from "./RaceStub";
export type { RaceTrack, RaceState, RaceOpponent } from "./RaceStub";
export {
  createSignal,
  stepSignal,
  pedWalkAllowed,
  SignalNetwork,
} from "./SignalFsm";
export type { SignalPhase, SignalState } from "./SignalFsm";
export { resolveDown } from "./WastedBusted";
export type { DownCause, RespawnOutcome } from "./WastedBusted";
export { createMusicState, pickLayer, stepMusic } from "./AdaptiveMusic";
export type { MusicLayer, MusicState } from "./AdaptiveMusic";
export {
  getA11y,
  setA11y,
  loadA11y,
  a11yColor,
  DEFAULT_A11Y,
} from "./Accessibility";
export type { A11ySettings } from "./Accessibility";
export { SHOPS, canPurchase, nearestShop } from "./ShopCatalog";
export type { ShopKind, ShopItem, ShopDef, PurchaseCtx } from "./ShopCatalog";
export {
  createWeaponWheel,
  openWheel,
  closeWheel,
  nudgeWheel,
  unlockSlot,
} from "./WeaponWheel";
export type { WheelSlot, WeaponWheelState } from "./WeaponWheel";
export { createParkingAgent, stepParking } from "./ParkingAI";
export type { ParkingSlot, ParkPhase, ParkingAgent } from "./ParkingAI";
export { followThrottle, laneChangeUrge, stepAvoidance } from "./TrafficAvoidance";
export type { TrafficPose, AvoidanceOut } from "./TrafficAvoidance";
export { PromptRegistry, prompts } from "./InteractPrompt";
export type { PromptKind, InteractPrompt } from "./InteractPrompt";
export { compassReading } from "./Compass";
export type { CompassReading } from "./Compass";
export { damageFromHit, stepDamagePulses } from "./DamageIndicator";
export type { DamagePulse } from "./DamageIndicator";
export { witnessesWithLos, applyWitnessHeat } from "./WitnessLos";
export type { WitnessActor } from "./WitnessLos";
export { openFailMenu, chooseFailAction } from "./MissionFailUi";
export type { FailMenuAction, FailMenuState } from "./MissionFailUi";
export { COLLECTIBLE_SETS, progressFor, claimSetReward } from "./CollectibleSets";
export type { CollectibleSet, SetProgress } from "./CollectibleSets";
export {
  listSlots,
  writeSlot,
  readSlot,
  clearSlot,
  ensurePrimarySlot,
} from "./SaveSlots";
export type { SaveSlotMeta } from "./SaveSlots";
export { lintManifest, validateManifestDeep, manifestStats } from "./ManifestSchema";
export type { ManifestLintIssue } from "./ManifestSchema";
export {
  createCarDamage,
  applyImpact,
  stageOf,
  steeringPull,
  powerMul,
} from "./CarDamage";
export type { DamageStage, CarDamageState } from "./CarDamage";
export { footstepFor, footstepInterval, FOOTSTEP_SURFACES } from "./Footsteps";
export type { FootstepKey } from "./Footsteps";
export { radarBlips } from "./WantedRadar";
export type { RadarBlip } from "./WantedRadar";
export {
  RADIO_STATIONS,
  stationById,
  assertStationsNonEmpty,
  persistStation,
  restoreStation,
} from "./RadioStations";
export type { RadioStationDef } from "./RadioStations";
export { GameLoop } from "./GameLoop";
export type { LoopPhase, PauseSource, LoopStats } from "./GameLoop";
export { Rng, RngService, rng } from "./Rng";
export type { RngStream } from "./Rng";
export { ClockWeather } from "./ClockWeather";
export { HEAT_TIERS, heatTier, desiredCops } from "./HeatTiers";
export { manifestFromSlice, validateManifest } from "./WorldManifest";
export type { WorldManifest } from "./WorldManifest";
export {
  canContinue,
  saveUnified,
  loadUnified,
  clearAllSaves,
  validateSave,
  collectLegacySave,
  SCHEMA_VERSION,
  refuseFutureSave,
  checksumSave,
  packSave,
  unpackSave,
  exportSaveJson,
  importSaveJson,
  quicksave,
  mayAutosave,
  CLOUD_SYNC_DECISION,
} from "./SaveGame";
export { runAllStages, allStagesGreen } from "./AcceptanceHarness";
export type { StageResult } from "./AcceptanceHarness";
export { ObjectiveNav } from "./ObjectiveNav";
export { CameraRig } from "./CameraRig";
export { stepVehicleDynamics, forwardFromYaw, MOBILE_TUNING } from "./VehicleDynamics";
export { streamPreset } from "./mobilePresets";
export { TrafficDirector } from "./TrafficDirector";
export type { TrafficAgent } from "./TrafficDirector";
export { PedestrianAI } from "./PedestrianAI";
export type { PedAgent } from "./PedestrianAI";
export { ChaseController } from "./ChaseController";
export type { ChaseUnit } from "./ChaseController";
export { enterCar, exitCar, canEnter, yawQuat } from "./VehicleState";
export { sim } from "./SimRuntime";
export {
  soakUrlEnabled,
  startSoak,
  soakActive,
  tickSoak,
  soakSnapshot,
} from "./SoakHarness";
export type { SoakSample, SoakState } from "./SoakHarness";
export { ReplayRecorder, replayRecorder } from "./ReplayRecorder";
export type { ReplayFrame } from "./ReplayRecorder";
export { publishDebugOverlay, readDebugOverlay, formatDebugOverlayLine } from "./DebugOverlay";
export type { DebugOverlayState } from "./DebugOverlay";
export { OccupancyGrid } from "./OccupancyGrid";
export { evalTrigger, rearm } from "./Triggers";
export type { Trigger } from "./Triggers";
