import React, { useMemo, useState } from 'react';
import {
  CloudRain,
  Flag,
  Lock,
  MapPin,
  Play,
  RefreshCw,
  ShieldAlert,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { CAREER_STAGES, MAPS_CATALOG, MODES_CATALOG, RIVAL_DRIVER_NAMES } from '../data/tracksAndModes';
import { t } from '../i18n/translations';
import {
  GameModeId,
  MapId,
  PlayerProgress,
  RaceLaunchConfig,
  TimeOfDay,
  WeatherType,
} from '../types/game';

interface ModeSelectModalProps {
  progress: PlayerProgress;
  initialView: 'modes' | 'multiplayer';
  onLaunchRace: (config: RaceLaunchConfig) => void;
  onClose: () => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'USR-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const ModeSelectModal: React.FC<ModeSelectModalProps> = ({
  progress,
  initialView,
  onLaunchRace,
  onClose,
}) => {
  const lang = progress.settings.language;
  const [selectedMode, setSelectedMode] = useState<GameModeId>(
    initialView === 'multiplayer' ? 'multiplayer' : 'highway'
  );
  const [selectedMap, setSelectedMap] = useState<MapId>(
    initialView === 'multiplayer' ? 'night_city' : 'desert_highway'
  );
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [policeEnabled, setPoliceEnabled] = useState<boolean>(true);
  const [roomCode, setRoomCode] = useState<string>(() => generateRoomCode());

  const activeModeCfg =
    MODES_CATALOG.find((m) => m.id === selectedMode) ?? MODES_CATALOG[0];

  const lobbyDrivers = useMemo(() => {
    const rivals = RIVAL_DRIVER_NAMES.slice(0, 5);
    return [
      { name: `${t(lang, 'you')} (Host)`, isYou: true, rating: 1940 },
      ...rivals.map((name, i) => ({
        name,
        isYou: false,
        rating: 1720 + i * 65,
      })),
    ];
  }, [lang, roomCode]);

  const handleModePick = (modeId: GameModeId) => {
    setSelectedMode(modeId);
    const cfg = MODES_CATALOG.find((m) => m.id === modeId);
    if (cfg) {
      setSelectedMap(cfg.defaultMap);
      const mapCfg = MAPS_CATALOG.find((mp) => mp.id === cfg.defaultMap);
      if (mapCfg) {
        setTimeOfDay(mapCfg.defaultTime);
        setWeather(mapCfg.defaultWeather);
      }
      if (!cfg.supportsPolice) setPoliceEnabled(false);
    }
  };

  const handleStartCustomRace = () => {
    onLaunchRace({
      mode: selectedMode,
      map: selectedMap,
      weather,
      timeOfDay,
      policeEnabled: activeModeCfg.supportsPolice && policeEnabled,
      distanceMeters: activeModeCfg.targetDistanceMeters,
      multiplayerRoomCode: selectedMode === 'multiplayer' ? roomCode : undefined,
      multiplayerRivals:
        selectedMode === 'multiplayer' ? RIVAL_DRIVER_NAMES.slice(0, 5) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-5xl max-h-[92vh] bg-[#0b101b] border border-white/15 rounded-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            {selectedMode === 'multiplayer' ? (
              <Users className="w-5 h-5 text-cyan-400" />
            ) : (
              <Flag className="w-5 h-5 text-amber-400" />
            )}
            <h2 className="font-display text-xl font-bold text-white">
              {selectedMode === 'multiplayer'
                ? t(lang, 'multiplayerMode')
                : t(lang, 'raceMode')}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t(lang, 'close')}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll">
          {/* 7 Game Modes */}
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2.5">
              {t(lang, 'selectMode')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {MODES_CATALOG.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModePick(m.id)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    selectedMode === m.id
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : 'bg-[#111726] border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  <div className="font-display font-bold text-xs sm:text-sm truncate">
                    {t(lang, m.nameKey)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {m.targetDistanceMeters > 0
                      ? `${(m.targetDistanceMeters / 1000).toFixed(1)} km`
                      : 'Endless'}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-300 mt-2.5">
              {t(lang, activeModeCfg.descKey)}
            </p>
          </div>

          {/* Career Championship Stages OR Map + Weather + Multiplayer Lobby */}
          {selectedMode === 'career' ? (
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2.5">
                {t(lang, 'careerStages')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CAREER_STAGES.map((stage) => {
                  const unlocked = stage.id <= progress.careerStageUnlocked;
                  const mapInfo = MAPS_CATALOG.find((mp) => mp.id === stage.map);
                  return (
                    <div
                      key={stage.id}
                      className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                        unlocked
                          ? 'bg-[#111827] border-white/15'
                          : 'bg-[#0d121d] border-white/5 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                          <span>{mapInfo ? t(lang, mapInfo.nameKey) : stage.map}</span>
                          <span>+{stage.rewardCoins.toLocaleString()}</span>
                        </div>
                        <div className="font-display text-base font-bold text-white mt-1">
                          {lang === 'hi' ? stage.titleHi : stage.titleEn}
                        </div>
                        <div className="text-xs text-slate-400 mt-1.5">
                          {(stage.distanceMeters / 1000).toFixed(1)} km ·{' '}
                          {t(lang, `weather_${stage.weather}`)} ·{' '}
                          {t(lang, `time_${stage.timeOfDay}`)}
                          {stage.policeChase ? ` · ${t(lang, 'policeChase')}` : ''}
                        </div>
                      </div>
                      <button
                        disabled={!unlocked}
                        onClick={() =>
                          onLaunchRace({
                            mode: stage.mode,
                            map: stage.map,
                            weather: stage.weather,
                            timeOfDay: stage.timeOfDay,
                            policeEnabled: stage.policeChase,
                            distanceMeters: stage.distanceMeters,
                            careerStageId: stage.id,
                          })
                        }
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold ${
                          unlocked
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {unlocked ? (
                          <>
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            <span>{t(lang, 'playNow')}</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>{t(lang, 'locked')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* 6 Racing Maps */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t(lang, 'selectMap')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {MAPS_CATALOG.map((mp) => (
                    <button
                      key={mp.id}
                      onClick={() => setSelectedMap(mp.id)}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        selectedMap === mp.id
                          ? 'bg-[#162033] border-amber-400'
                          : 'bg-[#111726] border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm text-white">
                          {t(lang, mp.nameKey)}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: mp.accentHex }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {t(lang, mp.descKey)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather, Day/Night & Police Chase Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111726] border border-white/10 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                    <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t(lang, 'weather')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['clear', 'rain', 'fog', 'snow', 'dynamic'] as WeatherType[]).map(
                      (w) => (
                        <button
                          key={w}
                          onClick={() => setWeather(w)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            weather === w
                              ? 'bg-sky-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {t(lang, `weather_${w}`)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-[#111726] border border-white/10 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t(lang, 'timeOfDay')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['day', 'sunset', 'night', 'dawn', 'dynamic'] as TimeOfDay[]).map(
                      (td) => (
                        <button
                          key={td}
                          onClick={() => setTimeOfDay(td)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            timeOfDay === td
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {t(lang, `time_${td}`)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-[#111726] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t(lang, 'policeChase')}</span>
                  </div>
                  {activeModeCfg.supportsPolice ? (
                    <button
                      onClick={() => setPoliceEnabled(!policeEnabled)}
                      className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        policeEnabled
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {policeEnabled ? t(lang, 'policeOn') : t(lang, 'policeOff')}
                    </button>
                  ) : (
                    <div className="text-xs text-slate-500 py-2">
                      {t(lang, 'policeOff')}
                    </div>
                  )}
                </div>
              </div>

              {/* Multiplayer Lobby Grid when Multiplayer Mode selected */}
              {selectedMode === 'multiplayer' && (
                <div className="bg-[#111726] border border-cyan-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-cyan-400 font-semibold">
                        {t(lang, 'mpLobby')}
                      </div>
                      <div className="font-mono-tabular text-lg font-bold text-white">
                        {t(lang, 'roomCode')}: {roomCode}
                      </div>
                    </div>
                    <button
                      onClick={() => setRoomCode(generateRoomCode())}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{t(lang, 'createRoom')}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {lobbyDrivers.map((drv, idx) => (
                      <div
                        key={drv.name}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                          drv.isYou
                            ? 'bg-cyan-500/15 border-cyan-400/50 text-white font-bold'
                            : 'bg-slate-900/80 border-white/10 text-slate-300'
                        }`}
                      >
                        <span className="truncate">
                          #{idx + 1} {drv.name}
                        </span>
                        <span className="text-emerald-400 shrink-0 ml-2">
                          {t(lang, 'ready')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer CTA */}
        {selectedMode !== 'career' && (
          <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-3 bg-[#090d16]">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-200 cursor-pointer"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              onClick={handleStartCustomRace}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>
                {selectedMode === 'multiplayer'
                  ? t(lang, 'startMpRace')
                  : t(lang, 'playNow')}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
