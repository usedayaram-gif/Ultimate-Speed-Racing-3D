import { CARS_CATALOG } from '../data/cars';
import { SEED_LEADERBOARD } from '../data/tracksAndModes';
import { CarConfig, CarStats, CarUpgrades, PlayerProgress } from '../types/game';

const STORAGE_KEY = 'usr3d_save_v1';

export const DEFAULT_UPGRADES: CarUpgrades = {
  engine: 0,
  turbo: 0,
  tires: 0,
  nitro: 0,
};

export function getInitialProgress(): PlayerProgress {
  const defaultCar = CARS_CATALOG[0];
  return {
    coins: 4500,
    unlockedCars: [defaultCar.id],
    selectedCarId: defaultCar.id,
    carColors: {
      [defaultCar.id]: defaultCar.defaultColor,
    },
    upgrades: {
      [defaultCar.id]: { ...DEFAULT_UPGRADES },
    },
    careerStageUnlocked: 1,
    dailyStreak: 0,
    lastDailyClaimDate: null,
    claimedMissions: [],
    claimedAchievements: [],
    stats: {
      racesCompleted: 0,
      racesWon: 0,
      nearMisses: 0,
      policeEvaded: 0,
      maxSpeedReached: 0,
      totalDistanceKm: 0,
      totalCoinsEarned: 4500,
      upgradesBought: 0,
    },
    leaderboard: [...SEED_LEADERBOARD],
    settings: {
      language: 'en',
      quality: 'high',
      controlScheme:
        typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0)
          ? 'buttons'
          : 'buttons',
      sfxVolume: 0.75,
      musicVolume: 0.45,
      muted: false,
      cameraAngle: 'chase',
    },
  };
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialProgress();
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const base = getInitialProgress();
    return {
      ...base,
      ...parsed,
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      unlockedCars:
        parsed.unlockedCars && parsed.unlockedCars.length > 0
          ? parsed.unlockedCars
          : base.unlockedCars,
      leaderboard:
        parsed.leaderboard && parsed.leaderboard.length > 0
          ? parsed.leaderboard
          : base.leaderboard,
    };
  } catch {
    return getInitialProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors
  }
}

export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function canClaimDailyReward(progress: PlayerProgress): boolean {
  return progress.lastDailyClaimDate !== getTodayString();
}

export function getEffectiveStats(car: CarConfig, upgrades?: CarUpgrades): CarStats {
  const u = upgrades ?? DEFAULT_UPGRADES;
  return {
    topSpeed: Math.round(car.baseStats.topSpeed + u.engine * 14),
    acceleration: Math.min(100, Math.round(car.baseStats.acceleration + u.turbo * 4)),
    handling: Math.min(100, Math.round(car.baseStats.handling + u.tires * 3.5)),
    nitro: Math.min(100, Math.round(car.baseStats.nitro + u.nitro * 5)),
  };
}

export function getUpgradeCost(currentLevel: number, carPrice: number): number {
  const base = Math.max(800, Math.round(carPrice * 0.08));
  return Math.round(base * (currentLevel + 1) * 0.75);
}

export function downloadAndroidBuildKit(): void {
  const guide = `# Ultimate Speed Racing 3D - Android APK Build Kit (Capacitor)

## Prerequisites
- Node.js 20+
- Android Studio (with Android SDK & Gradle)

## Quick Build Commands
1. Install Capacitor Android packages in your project root:
   npm install @capacitor/core @capacitor/cli @capacitor/android

2. Initialize Capacitor:
   npx cap init "Ultimate Speed Racing 3D" "com.ultimatespeed.racing3d" --web-dir=dist

3. Build the optimized 3D web bundle:
   npm run build

4. Add Android platform & sync:
   npx cap add android
   npx cap sync android

5. Open in Android Studio & generate signed APK:
   npx cap open android
   # In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)

6. Or build Debug APK directly via Gradle:
   cd android && ./gradlew assembleDebug
   # Output: android/app/build/outputs/apk/debug/app-debug.apk

## Recommended capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ultimatespeed.racing3d',
  appName: 'Ultimate Speed Racing 3D',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#090b10'
  }
};

export default config;
`;

  const blob = new Blob([guide], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'UltimateSpeedRacing3D_Android_APK_Build_Kit.md';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
