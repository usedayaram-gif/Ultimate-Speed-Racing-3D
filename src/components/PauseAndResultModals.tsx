import React from 'react';
import {
  Car,
  Coins,
  Home,
  Play,
  RotateCcw,
  Settings,
  ShieldAlert,
  Trophy,
} from 'lucide-react';
import { t } from '../i18n/translations';
import { Language, RaceResult } from '../types/game';

interface CountdownOverlayProps {
  countdownValue: number;
  language: Language;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  countdownValue,
  language,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center">
      <div className="bg-[#090d16]/85 border border-amber-400/50 rounded-3xl px-12 py-8 text-center">
        <div className="font-display text-6xl sm:text-8xl font-bold text-amber-400 tabular-nums">
          {countdownValue > 0 ? countdownValue : t(language, 'goLabel')}
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  language: Language;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  language,
  onResume,
  onRestart,
  onOpenSettings,
  onExit,
}) => {
  return (
    <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0b101b] border border-white/15 rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-2xl font-bold text-white text-center mb-4">
          {t(language, 'pause')}
        </h2>

        <button
          onClick={onResume}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{t(language, 'resume')}</span>
        </button>

        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t(language, 'restart')}</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>{t(language, 'settings')}</span>
        </button>

        <button
          onClick={onExit}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 border border-rose-500/30 text-rose-200 font-semibold text-sm cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>{t(language, 'exitToMenu')}</span>
        </button>
      </div>
    </div>
  );
};

interface RaceResultModalProps {
  result: RaceResult;
  language: Language;
  onRestart: () => void;
  onOpenGarage: () => void;
  onExit: () => void;
}

export const RaceResultModal: React.FC<RaceResultModalProps> = ({
  result,
  language,
  onRestart,
  onOpenGarage,
  onExit,
}) => {
  const headline = result.busted
    ? t(language, 'bustedTitle')
    : result.crashed
    ? t(language, 'crashedTitle')
    : result.victory
    ? t(language, 'victory')
    : t(language, 'raceComplete');

  return (
    <div className="fixed inset-0 z-30 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0b101b] border border-white/15 rounded-2xl p-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 mb-3">
            {result.busted ? (
              <ShieldAlert className="w-7 h-7 text-rose-400" />
            ) : (
              <Trophy className="w-7 h-7 text-amber-400" />
            )}
          </div>
          <h2 className="font-display text-3xl font-bold text-white">
            {headline}
          </h2>
          {result.totalRacers > 1 && !result.busted && (
            <p className="text-sm text-amber-300 font-semibold mt-1">
              {t(language, 'pos')}: #{result.position} / {result.totalRacers}
            </p>
          )}
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center bg-[#111726] border border-white/10 rounded-xl p-3">
          <div>
            <div className="text-[11px] text-slate-400">{t(language, 'time')}</div>
            <div className="font-mono-tabular text-sm font-bold text-white">
              {result.elapsedTime.toFixed(1)}s
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">{t(language, 'topSpeed')}</div>
            <div className="font-mono-tabular text-sm font-bold text-sky-300">
              {result.topSpeedKmh} {t(language, 'kmh')}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">{t(language, 'nearMiss')}</div>
            <div className="font-mono-tabular text-sm font-bold text-emerald-300">
              {result.nearMissCount}
            </div>
          </div>
        </div>

        {/* Coins Breakdown */}
        <div className="bg-[#111726] border border-white/10 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
          <div className="flex justify-between text-slate-300">
            <span>{t(language, 'baseReward')}</span>
            <span className="font-mono-tabular">+{result.coinsEarned.base}</span>
          </div>
          {result.coinsEarned.placement > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>{t(language, 'placementBonus')}</span>
              <span className="font-mono-tabular">+{result.coinsEarned.placement}</span>
            </div>
          )}
          {result.coinsEarned.nearMiss > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>{t(language, 'nearMissBonus')}</span>
              <span className="font-mono-tabular">+{result.coinsEarned.nearMiss}</span>
            </div>
          )}
          {result.coinsEarned.police > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>{t(language, 'policeBonus')}</span>
              <span className="font-mono-tabular">+{result.coinsEarned.police}</span>
            </div>
          )}
          {result.coinsEarned.speedBonus > 0 && (
            <div className="flex justify-between text-slate-300">
              <span>{t(language, 'speedBonus')}</span>
              <span className="font-mono-tabular">+{result.coinsEarned.speedBonus}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-amber-300 text-base">
            <span className="flex items-center gap-1.5">
              <Coins className="w-4 h-4" />
              {t(language, 'totalEarned')}
            </span>
            <span className="font-mono-tabular">
              +{result.coinsEarned.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t(language, 'raceAgain')}</span>
          </button>
          <button
            onClick={onOpenGarage}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
          >
            <Car className="w-4 h-4" />
            <span>{t(language, 'garage')}</span>
          </button>
          <button
            onClick={onExit}
            className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>{t(language, 'exitToMenu')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
