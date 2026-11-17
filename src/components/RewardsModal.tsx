import React, { useState } from 'react';
import { Award, Check, Coins, Gift, Trophy, X } from 'lucide-react';
import {
  ACHIEVEMENTS_CATALOG,
  DAILY_REWARDS,
  MISSIONS_CATALOG,
} from '../data/tracksAndModes';
import { t } from '../i18n/translations';
import { AchievementDef, MissionDef, PlayerProgress } from '../types/game';
import { canClaimDailyReward } from '../utils/storage';

interface RewardsModalProps {
  progress: PlayerProgress;
  initialTab?: 'daily' | 'missions' | 'achievements' | 'leaderboard';
  onClaimDaily: () => void;
  onClaimMission: (mission: MissionDef) => void;
  onClaimAchievement: (ach: AchievementDef) => void;
  onClose: () => void;
}

export const RewardsModal: React.FC<RewardsModalProps> = ({
  progress,
  initialTab = 'daily',
  onClaimDaily,
  onClaimMission,
  onClaimAchievement,
  onClose,
}) => {
  const lang = progress.settings.language;
  const [tab, setTab] = useState<'daily' | 'missions' | 'achievements' | 'leaderboard'>(
    initialTab
  );

  const dailyReady = canClaimDailyReward(progress);
  const currentDayIndex = progress.dailyStreak % 7;

  const getMissionValue = (metric: MissionDef['metric']): number => {
    return Math.floor(progress.stats[metric] ?? 0);
  };

  const getAchievementValue = (metric: AchievementDef['metric']): number => {
    if (metric === 'carsUnlocked') return progress.unlockedCars.length;
    if (metric === 'careerStage') return progress.careerStageUnlocked;
    return Math.floor(progress.stats[metric] ?? 0);
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0b101b] border border-white/15 rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 overflow-x-auto custom-scroll">
            <button
              onClick={() => setTab('daily')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'daily'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{t(lang, 'dailyRewards')}</span>
            </button>
            <button
              onClick={() => setTab('missions')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'missions'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{t(lang, 'missions')}</span>
            </button>
            <button
              onClick={() => setTab('achievements')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'achievements'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t(lang, 'achievements')}</span>
            </button>
            <button
              onClick={() => setTab('leaderboard')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                tab === 'leaderboard'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>{t(lang, 'leaderboard')}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            aria-label={t(lang, 'close')}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scroll">
          {tab === 'daily' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111726] border border-white/10 rounded-xl p-4">
                <div>
                  <div className="text-xs text-slate-400">{t(lang, 'streak')}</div>
                  <div className="font-display text-2xl font-bold text-white tabular-nums">
                    {progress.dailyStreak} {t(lang, 'days')}
                  </div>
                </div>
                <button
                  onClick={onClaimDaily}
                  disabled={!dailyReady}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-display font-bold text-sm ${
                    dailyReady
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span>
                    {dailyReady ? t(lang, 'claimDaily') : t(lang, 'claimed')}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {DAILY_REWARDS.map((item, idx) => {
                  const isClaimedToday = !dailyReady && idx === (progress.dailyStreak - 1) % 7;
                  const isNext = dailyReady && idx === currentDayIndex;
                  const past = idx < currentDayIndex;
                  return (
                    <div
                      key={item.day}
                      className={`rounded-xl border p-3.5 text-center flex flex-col items-center justify-between gap-2 ${
                        isNext
                          ? 'bg-amber-500/15 border-amber-400'
                          : past || isClaimedToday
                          ? 'bg-emerald-950/30 border-emerald-500/30'
                          : 'bg-[#111726] border-white/10'
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-300">
                        {lang === 'hi' ? item.labelHi : item.labelEn}
                      </span>
                      <Coins className="w-6 h-6 text-amber-400" />
                      <span className="font-mono-tabular text-sm font-bold text-white">
                        +{item.coins.toLocaleString()}
                      </span>
                      {(past || isClaimedToday) && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                          <Check className="w-3 h-3" />
                          {t(lang, 'claimed')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {!dailyReady && (
                <p className="text-xs text-slate-400 text-center">
                  {t(lang, 'dailyComeBack')}
                </p>
              )}
            </div>
          )}

          {tab === 'missions' && (
            <div className="space-y-3">
              {MISSIONS_CATALOG.map((m) => {
                const cur = Math.min(m.target, getMissionValue(m.metric));
                const done = cur >= m.target;
                const claimed = progress.claimedMissions.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className="bg-[#111726] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="font-display font-bold text-base text-white">
                        {t(lang, m.titleKey)}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t(lang, m.descKey)}
                      </p>
                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-amber-400"
                            style={{ width: `${(cur / m.target) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono-tabular text-xs text-slate-300">
                          {cur} / {m.target}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onClaimMission(m)}
                      disabled={!done || claimed}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                        claimed
                          ? 'bg-emerald-950/50 text-emerald-400 cursor-default'
                          : done
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {claimed
                        ? t(lang, 'claimed')
                        : `${t(lang, 'claim')} +${m.rewardCoins.toLocaleString()}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'achievements' && (
            <div className="space-y-3">
              {ACHIEVEMENTS_CATALOG.map((a) => {
                const cur = Math.min(a.target, getAchievementValue(a.metric));
                const done = cur >= a.target;
                const claimed = progress.claimedAchievements.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className="bg-[#111726] border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="font-display font-bold text-base text-white">
                        {t(lang, a.titleKey)}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t(lang, a.descKey)}
                      </p>
                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden max-w-xs">
                          <div
                            className="h-full bg-sky-400"
                            style={{ width: `${(cur / a.target) * 100}%` }}
                          />
                        </div>
                        <span className="font-mono-tabular text-xs text-slate-300">
                          {cur} / {a.target}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onClaimAchievement(a)}
                      disabled={!done || claimed}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                        claimed
                          ? 'bg-emerald-950/50 text-emerald-400 cursor-default'
                          : done
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {claimed
                        ? t(lang, 'claimed')
                        : `${t(lang, 'claim')} +${a.rewardCoins.toLocaleString()}`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">{t(lang, 'driver')}</th>
                    <th className="py-2.5 px-3">{t(lang, 'car')}</th>
                    <th className="py-2.5 px-3">{t(lang, 'mode')}</th>
                    <th className="py-2.5 px-3 text-right">{t(lang, 'topSpeed')}</th>
                    <th className="py-2.5 px-3 text-right">{t(lang, 'score')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...progress.leaderboard]
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 12)
                    .map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-white/5 ${
                          entry.isPlayer ? 'bg-amber-500/10 text-amber-200' : 'text-slate-200'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono-tabular font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold">{entry.driver}</td>
                        <td className="py-3 px-3 text-slate-300">{entry.carName}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {t(lang, `mode_${entry.mode}`)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular">
                          {entry.topSpeed} {t(lang, 'kmh')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-tabular font-bold text-amber-300">
                          {entry.score.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
