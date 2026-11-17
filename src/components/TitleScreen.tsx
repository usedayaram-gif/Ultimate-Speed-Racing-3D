import React from 'react';
import {
  Award,
  Car,
  Coins,
  Flag,
  Gift,
  Globe,
  Play,
  Settings,
  Users,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { t } from '../i18n/translations';
import { CarConfig, Language, ModalView, PlayerProgress } from '../types/game';
import { canClaimDailyReward, getEffectiveStats } from '../utils/storage';

interface TitleScreenProps {
  progress: PlayerProgress;
  activeCar: CarConfig;
  onStartQuickRace: () => void;
  onOpenModal: (modal: ModalView, initialTab?: string) => void;
  onToggleLanguage: () => void;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  activeCar,
  onStartQuickRace,
  onOpenModal,
  onToggleLanguage,
  onToggleMute,
}) => {
  const lang: Language = progress.settings.language;
  const effStats = getEffectiveStats(activeCar, progress.upgrades[activeCar.id]);
  const dailyReady = canClaimDailyReward(progress);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Perimeter Bar */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        {/* Bespoke Brand Emblem + Title Lockup */}
        <div className="flex items-center gap-3">
          <svg
            width="42"
            height="42"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M6 32L14 14H42L34 32H6Z"
              fill="#F59E0B"
              fillOpacity="0.16"
              stroke="#F59E0B"
              strokeWidth="2.5"
            />
            <path d="M12 25H35" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M18 19H38" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-none">
              {t(lang, 'gameTitle')}
            </h1>
            <p className="text-xs text-slate-300 mt-1 hidden sm:block">
              {t(lang, 'subtitle')}
            </p>
          </div>
        </div>

        {/* Right Perimeter Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-[#0f1420]/90 border border-white/10 rounded-lg px-3 py-2">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono-tabular text-sm font-bold text-amber-300">
              {progress.coins.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onToggleLanguage}
            className="flex items-center gap-1.5 bg-[#0f1420]/90 hover:bg-[#192235] border border-white/10 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 transition-colors cursor-pointer min-h-[40px] whitespace-nowrap"
            title="Switch Language"
          >
            <Globe className="w-4 h-4 text-sky-400" />
            <span>{lang === 'en' ? 'EN / हिन्दी' : 'हिन्दी / EN'}</span>
          </button>

          <button
            onClick={onToggleMute}
            aria-label={t(lang, 'muteAudio')}
            className="flex items-center justify-center bg-[#0f1420]/90 hover:bg-[#192235] border border-white/10 rounded-lg w-10 h-10 text-slate-200 transition-colors cursor-pointer"
          >
            {progress.settings.muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom Dock & Main Menu (leaves center 3D showroom unobstructed) */}
      <div className="flex flex-col gap-3 pointer-events-auto">
        {/* Selected Car Info Strip + Primary Start CTA */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="bg-[#0d121d]/90 border border-white/10 rounded-xl px-4 py-3 max-w-md">
            <div className="text-xs font-medium text-amber-400">
              {activeCar.brand} · {activeCar.tier}
            </div>
            <div className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
              {activeCar.name}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1.5 tabular-nums">
              <span>{effStats.topSpeed} {t(lang, 'kmh')}</span>
              <span aria-hidden="true">·</span>
              <span>{t(lang, 'acceleration')} {effStats.acceleration}</span>
              <span aria-hidden="true">·</span>
              <span>{t(lang, 'handling')} {effStats.handling}</span>
            </div>
          </div>

          <button
            onClick={onStartQuickRace}
            className="flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-display font-bold text-lg sm:text-xl px-8 py-4 rounded-xl transition-all cursor-pointer shadow-lg min-h-[56px] whitespace-nowrap"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>{t(lang, 'startGame')}</span>
          </button>
        </div>

        {/* Main Menu Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            onClick={() => onOpenModal('garage', 'cars')}
            className="flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border border-white/10 hover:border-amber-400/50 text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap"
          >
            <Car className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{t(lang, 'garage')}</span>
          </button>

          <button
            onClick={() => onOpenModal('garage', 'cars')}
            className="flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border border-white/10 hover:border-amber-400/50 text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap"
          >
            <Car className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="truncate">{t(lang, 'selectCar')}</span>
          </button>

          <button
            onClick={() => onOpenModal('garage', 'upgrade')}
            className="flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border border-white/10 hover:border-amber-400/50 text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap"
          >
            <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{t(lang, 'upgradeCar')}</span>
          </button>

          <button
            onClick={() => onOpenModal('modes')}
            className="flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border border-white/10 hover:border-amber-400/50 text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap"
          >
            <Flag className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{t(lang, 'raceMode')}</span>
          </button>

          <button
            onClick={() => onOpenModal('multiplayer')}
            className="flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border border-white/10 hover:border-amber-400/50 text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap"
          >
            <Users className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">{t(lang, 'multiplayerMode')}</span>
          </button>

          <button
            onClick={() => onOpenModal('rewards', 'daily')}
            className={`flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border ${
              dailyReady ? 'border-amber-400/70' : 'border-white/10'
            } text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap`}
          >
            <Gift className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{t(lang, 'dailyRewards')}</span>
          </button>

          <button
            onClick={() => onOpenModal('rewards', 'missions')}
            className="flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border border-white/10 hover:border-amber-400/50 text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap"
          >
            <Award className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="truncate">{t(lang, 'missions')}</span>
          </button>

          <button
            onClick={() => onOpenModal('settings')}
            className="flex items-center justify-center gap-2 bg-[#0f1522]/90 hover:bg-[#192235] border border-white/10 hover:border-amber-400/50 text-slate-100 rounded-xl px-3 py-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[46px] whitespace-nowrap"
          >
            <Settings className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="truncate">{t(lang, 'settings')}</span>
          </button>
        </div>

        {/* Single flat control hint line */}
        <div className="text-center text-xs text-slate-400 hidden sm:block">
          {t(lang, 'controlsHintDesktop')}
        </div>
      </div>
    </div>
  );
};
