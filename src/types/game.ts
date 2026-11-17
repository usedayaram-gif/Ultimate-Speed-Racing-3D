export type Language = 'en' | 'hi';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type ControlScheme = 'buttons' | 'wheel' | 'keyboard';

export type CameraAngle = 'chase' | 'hood' | 'bumper' | 'cinematic';

export type GameScreen = 'title' | 'racing';

export type ModalView =
  | 'none'
  | 'garage'
  | 'modes'
  | 'multiplayer'
  | 'rewards'
  | 'settings'
  | 'apk';

export type CarBrand =
  | 'Lamborghini'
  | 'Ferrari'
  | 'Bugatti'
  | 'BMW'
  | 'Mercedes'
  | 'Porsche'
  | 'Audi'
  | 'McLaren';

export type CarSilhouette = 'wedge' | 'hyper' | 'gt' | 'track' | 'coupe';

export interface CarStats {
  topSpeed: number; // km/h (260 - 460)
  acceleration: number; // 1 - 100
  handling: number; // 1 - 100
  nitro: number; // 1 - 100
}

export interface CarConfig {
  id: string;
  brand: CarBrand;
  name: string;
  tier: 'Sport' | 'Super' | 'Hyper' | 'Prototype';
  price: number;
  silhouette: CarSilhouette;
  spoilerStyle: 'none' | 'lip' | 'gt_wing' | 'swan_neck' | 'active';
  exhaustCount: 2 | 4;
  defaultColor: string;
  accentColor: string;
  palette: string[];
  baseStats: CarStats;
  dimensions: {
    width: number;
    height: number;
    length: number;
  };
}

export type MapId =
  | 'modern_city'
  | 'desert_highway'
  | 'mountain_roads'
  | 'snow_roads'
  | 'green_forest'
  | 'night_city';

export type GameModeId =
  | 'career'
  | 'highway'
  | 'city'
  | 'mountain'
  | 'time_trial'
  | 'traffic'
  | 'multiplayer';

export type WeatherType = 'clear' | 'rain' | 'fog' | 'snow' | 'dynamic';
export type TimeOfDay = 'day' | 'sunset' | 'night' | 'dawn' | 'dynamic';

export interface MapConfig {
  id: MapId;
  nameKey: string;
  descKey: string;
  defaultTime: Exclude<TimeOfDay, 'dynamic'>;
  defaultWeather: Exclude<WeatherType, 'dynamic'>;
  roadColor: string;
  shoulderColor: string;
  terrainColor: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  accentHex: string;
  curviness: number;
  hilliness: number;
}

export interface ModeConfig {
  id: GameModeId;
  nameKey: string;
  descKey: string;
  defaultMap: MapId;
  hasTraffic: boolean;
  hasRivals: boolean;
  rivalCount: number;
  targetDistanceMeters: number; // 0 = endless (traffic mode)
  baseRewardCoins: number;
  supportsPolice: boolean;
}

export interface CareerStage {
  id: number;
  titleEn: string;
  titleHi: string;
  mode: GameModeId;
  map: MapId;
  weather: Exclude<WeatherType, 'dynamic'>;
  timeOfDay: Exclude<TimeOfDay, 'dynamic'>;
  policeChase: boolean;
  distanceMeters: number;
  targetPosition: number;
  rewardCoins: number;
}

export interface CarUpgrades {
  engine: number; // 0-5 (top speed)
  turbo: number; // 0-5 (acceleration)
  tires: number; // 0-5 (handling)
  nitro: number; // 0-5 (nitro capacity & boost)
}

export interface MissionDef {
  id: string;
  titleKey: string;
  descKey: string;
  target: number;
  rewardCoins: number;
  metric:
    | 'racesCompleted'
    | 'racesWon'
    | 'nearMisses'
    | 'policeEvaded'
    | 'maxSpeedReached'
    | 'totalDistanceKm';
}

export interface AchievementDef {
  id: string;
  titleKey: string;
  descKey: string;
  target: number;
  rewardCoins: number;
  metric:
    | 'carsUnlocked'
    | 'totalCoinsEarned'
    | 'racesWon'
    | 'upgradesBought'
    | 'careerStage';
}

export interface LeaderboardEntry {
  id: string;
  driver: string;
  carName: string;
  mode: GameModeId;
  score: number;
  topSpeed: number;
  isPlayer?: boolean;
}

export interface GameSettings {
  language: Language;
  quality: GraphicsQuality;
  controlScheme: ControlScheme;
  sfxVolume: number; // 0 - 1
  musicVolume: number; // 0 - 1
  muted: boolean;
  cameraAngle: CameraAngle;
}

export interface PlayerProgress {
  coins: number;
  unlockedCars: string[];
  selectedCarId: string;
  carColors: Record<string, string>;
  upgrades: Record<string, CarUpgrades>;
  careerStageUnlocked: number;
  dailyStreak: number;
  lastDailyClaimDate: string | null; // YYYY-MM-DD
  claimedMissions: string[];
  claimedAchievements: string[];
  stats: {
    racesCompleted: number;
    racesWon: number;
    nearMisses: number;
    policeEvaded: number;
    maxSpeedReached: number;
    totalDistanceKm: number;
    totalCoinsEarned: number;
    upgradesBought: number;
  };
  leaderboard: LeaderboardEntry[];
  settings: GameSettings;
}

export interface RaceLaunchConfig {
  mode: GameModeId;
  map: MapId;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  policeEnabled: boolean;
  distanceMeters: number;
  careerStageId?: number;
  multiplayerRoomCode?: string;
  multiplayerRivals?: string[];
}

export interface RaceHUDState {
  phase: 'countdown' | 'racing' | 'paused' | 'finished';
  countdownValue: number; // 3, 2, 1, 0 (GO)
  speedKmh: number;
  rpmRatio: number; // 0..1
  gear: number; // 1..7
  nitro: number; // 0..100
  isNitroActive: boolean;
  position: number;
  totalRacers: number;
  progress: number; // 0..1
  distanceMeters: number;
  targetDistanceMeters: number;
  elapsedTime: number;
  score: number;
  nearMissCount: number;
  nearMissCombo: number;
  topSpeedKmh: number;
  policeActive: boolean;
  policeDistanceMeters: number;
  bustProgress: number; // 0..100 (if 100 = busted)
  evadeProgress: number; // 0..100
  health: number; // 0..100 (traffic/police mode)
  activeTimeOfDay: Exclude<TimeOfDay, 'dynamic'>;
  activeWeather: Exclude<WeatherType, 'dynamic'>;
  cameraAngle: CameraAngle;
  eventBanner: string | null;
}

export interface RaceResult {
  victory: boolean;
  busted: boolean;
  crashed: boolean;
  position: number;
  totalRacers: number;
  elapsedTime: number;
  topSpeedKmh: number;
  nearMissCount: number;
  policeEvaded: number;
  distanceKm: number;
  score: number;
  coinsEarned: {
    base: number;
    placement: number;
    nearMiss: number;
    police: number;
    speedBonus: number;
    total: number;
  };
  config: RaceLaunchConfig;
}
