import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/SoundEngine';
import { GarageModal } from './components/GarageModal';
import { ModeSelectModal } from './components/ModeSelectModal';
import {
  CountdownOverlay,
  PauseModal,
  RaceResultModal,
} from './components/PauseAndResultModals';
import { RaceHUD } from './components/RaceHUD';
import { RewardsModal } from './components/RewardsModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { CARS_CATALOG } from './data/cars';
import { DAILY_REWARDS } from './data/tracksAndModes';
import { GameEngine } from './three/GameEngine';
import {
  AchievementDef,
  CameraAngle,
  CarConfig,
  CarUpgrades,
  GameScreen,
  GameSettings,
  MissionDef,
  ModalView,
  PlayerProgress,
  RaceHUDState,
  RaceLaunchConfig,
  RaceResult,
} from './types/game';
import {
  canClaimDailyReward,
  DEFAULT_UPGRADES,
  getTodayString,
  loadProgress,
  saveProgress,
} from './utils/storage';

const CAMERA_ORDER: CameraAngle[] = ['chase', 'hood', 'bumper', 'cinematic'];

const INITIAL_HUD: RaceHUDState = {
  phase: 'countdown',
  countdownValue: 3,
  speedKmh: 0,
  rpmRatio: 0.2,
  gear: 1,
  nitro: 100,
  isNitroActive: false,
  position: 1,
  totalRacers: 1,
  progress: 0,
  distanceMeters: 0,
  targetDistanceMeters: 2400,
  elapsedTime: 0,
  score: 0,
  nearMissCount: 0,
  nearMissCombo: 0,
  topSpeedKmh: 0,
  policeActive: false,
  policeDistanceMeters: 40,
  bustProgress: 0,
  evadeProgress: 0,
  health: 100,
  activeTimeOfDay: 'day',
  activeWeather: 'clear',
  cameraAngle: 'chase',
  eventBanner: null,
};

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [screen, setScreen] = useState<GameScreen>('title');
  const [modal, setModal] = useState<ModalView>('none');
  const [garageTab, setGarageTab] = useState<'cars' | 'upgrade'>('cars');
  const [rewardsTab, setRewardsTab] = useState<
    'daily' | 'missions' | 'achievements' | 'leaderboard'
  >('daily');
  const [previewCarId, setPreviewCarId] = useState<string>(() => loadProgress().selectedCarId);
  const [hud, setHud] = useState<RaceHUDState>(INITIAL_HUD);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [pauseSettingsOpen, setPauseSettingsOpen] = useState(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const progressRef = useRef<PlayerProgress>(progress);
  const screenRef = useRef<GameScreen>(screen);
  const modalRef = useRef<ModalView>(modal);
  const heldKeysRef = useRef<Set<string>>(new Set());
  const touchControlsRef = useRef({
    steer: 0,
    throttle: false,
    brake: false,
    nitro: false,
  });

  useEffect(() => {
    progressRef.current = progress;
    saveProgress(progress);
    soundEngine.setVolumes(
      progress.settings.sfxVolume,
      progress.settings.musicVolume,
      progress.settings.muted
    );
  }, [progress]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    modalRef.current = modal;
  }, [modal]);

  const handleRaceFinish = useCallback((result: RaceResult) => {
    setRaceResult(result);
    setProgress((prev) => {
      const car =
        CARS_CATALOG.find((c) => c.id === prev.selectedCarId) ?? CARS_CATALOG[0];
      const nextCareer =
        result.victory &&
        result.config.careerStageId &&
        result.config.careerStageId >= prev.careerStageUnlocked
          ? Math.min(6, result.config.careerStageId + 1)
          : prev.careerStageUnlocked;

      const updatedLeaderboard = [
        ...prev.leaderboard,
        {
          id: `player_${Date.now()}`,
          driver: prev.settings.language === 'hi' ? 'आप (Player)' : 'You (Player)',
          carName: `${car.brand} ${car.name}`,
          mode: result.config.mode,
          score: result.score,
          topSpeed: result.topSpeedKmh,
          isPlayer: true,
        },
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      return {
        ...prev,
        coins: prev.coins + result.coinsEarned.total,
        careerStageUnlocked: nextCareer,
        stats: {
          ...prev.stats,
          racesCompleted: prev.stats.racesCompleted + 1,
          racesWon: prev.stats.racesWon + (result.victory && result.position === 1 ? 1 : 0),
          nearMisses: prev.stats.nearMisses + result.nearMissCount,
          policeEvaded: prev.stats.policeEvaded + result.policeEvaded,
          maxSpeedReached: Math.max(prev.stats.maxSpeedReached, result.topSpeedKmh),
          totalDistanceKm: Number(
            (prev.stats.totalDistanceKm + result.distanceKm).toFixed(2)
          ),
          totalCoinsEarned: prev.stats.totalCoinsEarned + result.coinsEarned.total,
        },
        leaderboard: updatedLeaderboard,
      };
    });
  }, []);

  // Mount isolated Three.js WebGL Engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const initialProg = progressRef.current;
    const engine = new GameEngine(
      mount,
      initialProg.settings.quality,
      (nextHud) => setHud(nextHud),
      handleRaceFinish
    );
    engine.setCameraAngle(initialProg.settings.cameraAngle);
    engine.setLanguage(initialProg.settings.language);

    const startCar =
      CARS_CATALOG.find((c) => c.id === initialProg.selectedCarId) ?? CARS_CATALOG[0];
    const startColor =
      initialProg.carColors[startCar.id] ?? startCar.defaultColor;
    engine.enterShowroom(startCar, startColor);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleRaceFinish]);

  const syncEngineInputs = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const keys = heldKeysRef.current;
    const tc = touchControlsRef.current;

    const keySteer =
      (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
      (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);

    engine.inputs.steer = tc.steer !== 0 ? tc.steer : keySteer;
    engine.inputs.throttle =
      tc.throttle || keys.has('ArrowUp') || keys.has('KeyW');
    engine.inputs.brake =
      tc.brake || keys.has('ArrowDown') || keys.has('KeyS');
    engine.inputs.nitro =
      tc.nitro ||
      keys.has('Space') ||
      keys.has('ShiftLeft') ||
      keys.has('ShiftRight');
  }, []);

  const launchRace = useCallback((config: RaceLaunchConfig) => {
    soundEngine.unlock();
    const prog = progressRef.current;
    const car =
      CARS_CATALOG.find((c) => c.id === prog.selectedCarId) ?? CARS_CATALOG[0];
    const color = prog.carColors[car.id] ?? car.defaultColor;
    const upgrades = prog.upgrades[car.id] ?? DEFAULT_UPGRADES;

    setModal('none');
    setRaceResult(null);
    setPauseSettingsOpen(false);
    setScreen('racing');
    heldKeysRef.current.clear();
    touchControlsRef.current = {
      steer: 0,
      throttle: false,
      brake: false,
      nitro: false,
    };

    engineRef.current?.startRace(
      config,
      car,
      upgrades,
      color,
      prog.settings.language
    );
  }, []);

  const startQuickRace = useCallback(() => {
    launchRace({
      mode: 'highway',
      map: 'desert_highway',
      weather: 'clear',
      timeOfDay: 'sunset',
      policeEnabled: true,
      distanceMeters: 2600,
    });
  }, [launchRace]);

  const cycleCamera = useCallback(() => {
    setProgress((prev) => {
      const idx = CAMERA_ORDER.indexOf(prev.settings.cameraAngle);
      const next = CAMERA_ORDER[(idx + 1) % CAMERA_ORDER.length];
      engineRef.current?.setCameraAngle(next);
      return {
        ...prev,
        settings: { ...prev.settings, cameraAngle: next },
      };
    });
  }, []);

  // Global keyboard bindings
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code
        )
      ) {
        if (screenRef.current === 'racing') e.preventDefault();
      }

      if (e.repeat) return;

      if (
        screenRef.current === 'title' &&
        modalRef.current === 'none' &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        startQuickRace();
        return;
      }

      if (screenRef.current === 'racing') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (hud.phase === 'racing') {
            engineRef.current?.setPaused(true);
          } else if (hud.phase === 'paused') {
            setPauseSettingsOpen(false);
            engineRef.current?.setPaused(false);
          }
          return;
        }
        if (e.code === 'KeyC') {
          cycleCamera();
          return;
        }
      }

      heldKeysRef.current.add(e.code);
      syncEngineInputs();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
      syncEngineInputs();
    };

    const onBlur = () => {
      heldKeysRef.current.clear();
      touchControlsRef.current = {
        steer: 0,
        throttle: false,
        brake: false,
        nitro: false,
      };
      syncEngineInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [cycleCamera, hud.phase, startQuickRace, syncEngineInputs]);

  const handleTouchControlChange = useCallback(
    (patch: Partial<typeof touchControlsRef.current>) => {
      touchControlsRef.current = { ...touchControlsRef.current, ...patch };
      syncEngineInputs();
    },
    [syncEngineInputs]
  );

  const exitRaceToMenu = useCallback(
    (openModalAfter: ModalView = 'none') => {
      const prog = progressRef.current;
      const car =
        CARS_CATALOG.find((c) => c.id === prog.selectedCarId) ?? CARS_CATALOG[0];
      const color = prog.carColors[car.id] ?? car.defaultColor;
      setRaceResult(null);
      setPauseSettingsOpen(false);
      setScreen('title');
      setPreviewCarId(car.id);
      setModal(openModalAfter);
      engineRef.current?.enterShowroom(car, color);
    },
    []
  );

  const updateSettings = (patch: Partial<GameSettings>) => {
    setProgress((prev) => {
      const nextSettings = { ...prev.settings, ...patch };
      if (patch.quality) engineRef.current?.setQuality(patch.quality);
      if (patch.language) engineRef.current?.setLanguage(patch.language);
      if (patch.cameraAngle) engineRef.current?.setCameraAngle(patch.cameraAngle);
      return { ...prev, settings: nextSettings };
    });
  };

  const activeCar =
    CARS_CATALOG.find((c) => c.id === progress.selectedCarId) ?? CARS_CATALOG[0];

  const handleOpenModal = (nextModal: ModalView, initialTab?: string) => {
    soundEngine.unlock();
    if (nextModal === 'garage') {
      const tab = initialTab === 'upgrade' ? 'upgrade' : 'cars';
      setGarageTab(tab);
      setPreviewCarId(progress.selectedCarId);
    } else if (nextModal === 'rewards') {
      const tab =
        initialTab === 'missions' ||
        initialTab === 'achievements' ||
        initialTab === 'leaderboard'
          ? initialTab
          : 'daily';
      setRewardsTab(tab);
    }
    setModal(nextModal);
  };

  const handleCloseGarage = () => {
    const car =
      CARS_CATALOG.find((c) => c.id === progress.selectedCarId) ?? CARS_CATALOG[0];
    const color = progress.carColors[car.id] ?? car.defaultColor;
    engineRef.current?.updateShowroomCar(car, color);
    setModal('none');
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#090b10]">
      {/* Dedicated Isolated WebGL Canvas Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Title Screen & Main Menu */}
      {screen === 'title' && modal === 'none' && (
        <TitleScreen
          progress={progress}
          activeCar={activeCar}
          onStartQuickRace={startQuickRace}
          onOpenModal={handleOpenModal}
          onToggleLanguage={() =>
            updateSettings({
              language: progress.settings.language === 'en' ? 'hi' : 'en',
            })
          }
          onToggleMute={() =>
            updateSettings({ muted: !progress.settings.muted })
          }
        />
      )}

      {/* Title Screen Modals */}
      {screen === 'title' && modal === 'garage' && (
        <GarageModal
          progress={progress}
          initialTab={garageTab}
          previewCarId={previewCarId}
          onPreviewCar={(carId, colorHex) => {
            setPreviewCarId(carId);
            const car = CARS_CATALOG.find((c) => c.id === carId) ?? CARS_CATALOG[0];
            const col = colorHex ?? progress.carColors[carId] ?? car.defaultColor;
            engineRef.current?.updateShowroomCar(car, col);
          }}
          onSelectCar={(carId) => {
            setProgress((prev) => ({ ...prev, selectedCarId: carId }));
          }}
          onUnlockCar={(car: CarConfig) => {
            if (progress.coins < car.price) return;
            soundEngine.playCoin();
            setProgress((prev) => ({
              ...prev,
              coins: prev.coins - car.price,
              unlockedCars: [...prev.unlockedCars, car.id],
              selectedCarId: car.id,
              carColors: {
                ...prev.carColors,
                [car.id]: prev.carColors[car.id] ?? car.defaultColor,
              },
              upgrades: {
                ...prev.upgrades,
                [car.id]: prev.upgrades[car.id] ?? { ...DEFAULT_UPGRADES },
              },
            }));
          }}
          onSetCarColor={(carId, colorHex) => {
            setProgress((prev) => ({
              ...prev,
              carColors: { ...prev.carColors, [carId]: colorHex },
            }));
          }}
          onUpgradeCar={(carId, statKey: keyof CarUpgrades, cost: number) => {
            if (progress.coins < cost) return;
            soundEngine.playCoin();
            setProgress((prev) => {
              const curUp = prev.upgrades[carId] ?? { ...DEFAULT_UPGRADES };
              if (curUp[statKey] >= 5) return prev;
              return {
                ...prev,
                coins: prev.coins - cost,
                upgrades: {
                  ...prev.upgrades,
                  [carId]: { ...curUp, [statKey]: curUp[statKey] + 1 },
                },
                stats: {
                  ...prev.stats,
                  upgradesBought: prev.stats.upgradesBought + 1,
                },
              };
            });
          }}
          onRaceNow={startQuickRace}
          onClose={handleCloseGarage}
        />
      )}

      {screen === 'title' && (modal === 'modes' || modal === 'multiplayer') && (
        <ModeSelectModal
          progress={progress}
          initialView={modal === 'multiplayer' ? 'multiplayer' : 'modes'}
          onLaunchRace={launchRace}
          onClose={() => setModal('none')}
        />
      )}

      {screen === 'title' && modal === 'rewards' && (
        <RewardsModal
          progress={progress}
          initialTab={rewardsTab}
          onClaimDaily={() => {
            if (!canClaimDailyReward(progress)) return;
            soundEngine.playCoin();
            const reward = DAILY_REWARDS[progress.dailyStreak % 7];
            setProgress((prev) => ({
              ...prev,
              coins: prev.coins + reward.coins,
              dailyStreak: prev.dailyStreak + 1,
              lastDailyClaimDate: getTodayString(),
              stats: {
                ...prev.stats,
                totalCoinsEarned: prev.stats.totalCoinsEarned + reward.coins,
              },
            }));
          }}
          onClaimMission={(mission: MissionDef) => {
            if (progress.claimedMissions.includes(mission.id)) return;
            soundEngine.playCoin();
            setProgress((prev) => ({
              ...prev,
              coins: prev.coins + mission.rewardCoins,
              claimedMissions: [...prev.claimedMissions, mission.id],
              stats: {
                ...prev.stats,
                totalCoinsEarned: prev.stats.totalCoinsEarned + mission.rewardCoins,
              },
            }));
          }}
          onClaimAchievement={(ach: AchievementDef) => {
            if (progress.claimedAchievements.includes(ach.id)) return;
            soundEngine.playCoin();
            setProgress((prev) => ({
              ...prev,
              coins: prev.coins + ach.rewardCoins,
              claimedAchievements: [...prev.claimedAchievements, ach.id],
              stats: {
                ...prev.stats,
                totalCoinsEarned: prev.stats.totalCoinsEarned + ach.rewardCoins,
              },
            }));
          }}
          onClose={() => setModal('none')}
        />
      )}

      {screen === 'title' && modal === 'settings' && (
        <SettingsModal
          settings={progress.settings}
          onUpdateSettings={updateSettings}
          onClose={() => setModal('none')}
        />
      )}

      {/* Active Race HUD & Overlays */}
      {screen === 'racing' && (
        <>
          <RaceHUD
            hud={hud}
            language={progress.settings.language}
            controlScheme={progress.settings.controlScheme}
            muted={progress.settings.muted}
            onControlChange={handleTouchControlChange}
            onCycleCamera={cycleCamera}
            onToggleMute={() =>
              updateSettings({ muted: !progress.settings.muted })
            }
            onPause={() => engineRef.current?.setPaused(true)}
          />

          {hud.phase === 'countdown' && (
            <CountdownOverlay
              countdownValue={hud.countdownValue}
              language={progress.settings.language}
            />
          )}

          {hud.phase === 'paused' && !pauseSettingsOpen && (
            <PauseModal
              language={progress.settings.language}
              onResume={() => engineRef.current?.setPaused(false)}
              onRestart={() => {
                setRaceResult(null);
                engineRef.current?.restartRace();
              }}
              onOpenSettings={() => setPauseSettingsOpen(true)}
              onExit={() => exitRaceToMenu('none')}
            />
          )}

          {hud.phase === 'paused' && pauseSettingsOpen && (
            <SettingsModal
              settings={progress.settings}
              onUpdateSettings={updateSettings}
              onClose={() => setPauseSettingsOpen(false)}
            />
          )}

          {raceResult && (
            <RaceResultModal
              result={raceResult}
              language={progress.settings.language}
              onRestart={() => {
                setRaceResult(null);
                engineRef.current?.restartRace();
              }}
              onOpenGarage={() => exitRaceToMenu('garage')}
              onExit={() => exitRaceToMenu('none')}
            />
          )}
        </>
      )}
    </div>
  );
}
