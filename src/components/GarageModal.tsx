import React, { useState } from 'react';
import { Check, Coins, Lock, Palette, Play, Wrench, X } from 'lucide-react';
import { CAR_BRANDS, CARS_CATALOG } from '../data/cars';
import { t } from '../i18n/translations';
import { CarConfig, CarUpgrades, PlayerProgress } from '../types/game';
import { DEFAULT_UPGRADES, getEffectiveStats, getUpgradeCost } from '../utils/storage';

interface GarageModalProps {
  progress: PlayerProgress;
  initialTab?: 'cars' | 'upgrade';
  previewCarId: string;
  onPreviewCar: (carId: string, colorHex?: string) => void;
  onSelectCar: (carId: string) => void;
  onUnlockCar: (car: CarConfig) => void;
  onSetCarColor: (carId: string, colorHex: string) => void;
  onUpgradeCar: (carId: string, statKey: keyof CarUpgrades, cost: number) => void;
  onRaceNow: () => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  progress,
  initialTab = 'cars',
  previewCarId,
  onPreviewCar,
  onSelectCar,
  onUnlockCar,
  onSetCarColor,
  onUpgradeCar,
  onRaceNow,
  onClose,
}) => {
  const lang = progress.settings.language;
  const [tab, setTab] = useState<'cars' | 'upgrade'>(initialTab);
  const [brandFilter, setBrandFilter] = useState<string>('All');

  const previewCar =
    CARS_CATALOG.find((c) => c.id === previewCarId) ?? CARS_CATALOG[0];
  const isUnlocked = progress.unlockedCars.includes(previewCar.id);
  const isSelected = progress.selectedCarId === previewCar.id;
  const activeColor =
    progress.carColors[previewCar.id] ?? previewCar.defaultColor;
  const carUpgrades = progress.upgrades[previewCar.id] ?? DEFAULT_UPGRADES;
  const effStats = getEffectiveStats(previewCar, carUpgrades);

  const filteredCars =
    brandFilter === 'All'
      ? CARS_CATALOG
      : CARS_CATALOG.filter((c) => c.brand === brandFilter);

  const upgradeRows: Array<{
    key: keyof CarUpgrades;
    label: string;
    statValue: string;
  }> = [
    {
      key: 'engine',
      label: t(lang, 'engine'),
      statValue: `${effStats.topSpeed} ${t(lang, 'kmh')}`,
    },
    {
      key: 'turbo',
      label: t(lang, 'turbo'),
      statValue: `${effStats.acceleration}/100`,
    },
    {
      key: 'tires',
      label: t(lang, 'tires'),
      statValue: `${effStats.handling}/100`,
    },
    {
      key: 'nitro',
      label: t(lang, 'nitroTank'),
      statValue: `${effStats.nitro}/100`,
    },
  ];

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-2 bg-[#0c111d]/95 border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setTab('cars')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'cars'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t(lang, 'selectCar')} (20)
          </button>
          <button
            onClick={() => setTab('upgrade')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'upgrade'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {t(lang, 'upgradeCar')}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[#0c111d]/95 border border-white/10 rounded-lg px-3 py-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-tabular text-sm font-bold text-amber-300">
              {progress.coins.toLocaleString()}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={t(lang, 'close')}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#0c111d]/95 border border-white/10 hover:bg-[#1a2234] text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Interactive Garage Dock (leaves center 3D car visible!) */}
      <div className="pointer-events-auto bg-[#0b101b]/95 border border-white/15 rounded-2xl p-4 flex flex-col gap-3 max-h-[58vh]">
        {/* Active Car Header + Stats + Paint Swatches + Action */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="text-xs font-medium text-amber-400">
              {previewCar.brand} · {previewCar.tier}
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              {previewCar.name}
            </h2>
          </div>

          {/* Stat Bars */}
          <div className="grid grid-cols-4 gap-3 flex-1 max-w-xl">
            <div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{t(lang, 'topSpeed')}</span>
                <span className="font-mono-tabular text-amber-300">{effStats.topSpeed}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${Math.min(100, (effStats.topSpeed / 520) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{t(lang, 'acceleration')}</span>
                <span className="font-mono-tabular text-sky-300">{effStats.acceleration}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-sky-400"
                  style={{ width: `${effStats.acceleration}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{t(lang, 'handling')}</span>
                <span className="font-mono-tabular text-emerald-300">{effStats.handling}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-emerald-400"
                  style={{ width: `${effStats.handling}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>{t(lang, 'nitro')}</span>
                <span className="font-mono-tabular text-cyan-300">{effStats.nitro}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-cyan-400"
                  style={{ width: `${effStats.nitro}%` }}
                />
              </div>
            </div>
          </div>

          {/* Paint Swatches + Unlock/Select/Race */}
          <div className="flex flex-wrap items-center gap-3">
            {isUnlocked && (
              <div className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-slate-400 mr-1" />
                {previewCar.palette.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => {
                      onSetCarColor(previewCar.id, hex);
                      onPreviewCar(previewCar.id, hex);
                    }}
                    aria-label={`Color ${hex}`}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                      activeColor === hex
                        ? 'border-white scale-110'
                        : 'border-white/25 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            )}

            {isUnlocked ? (
              <div className="flex items-center gap-2">
                {!isSelected ? (
                  <button
                    onClick={() => onSelectCar(previewCar.id)}
                    className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm cursor-pointer whitespace-nowrap"
                  >
                    {t(lang, 'select')}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-400">
                    <Check className="w-4 h-4" />
                    {t(lang, 'selected')}
                  </span>
                )}
                <button
                  onClick={() => {
                    onSelectCar(previewCar.id);
                    onRaceNow();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{t(lang, 'playNow')}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onUnlockCar(previewCar)}
                disabled={progress.coins < previewCar.price}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap ${
                  progress.coins >= previewCar.price
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>
                  {t(lang, 'unlock')} · {previewCar.price.toLocaleString()}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {tab === 'cars' ? (
          <div className="flex flex-col gap-3 overflow-hidden">
            {/* Brand Filter Row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scroll">
              {CAR_BRANDS.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setBrandFilter(brand)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    brandFilter === brand
                      ? 'bg-white text-slate-950'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>

            {/* Horizontal 20-car Selector Strip */}
            <div className="flex items-stretch gap-2.5 overflow-x-auto pb-2 custom-scroll">
              {filteredCars.map((car) => {
                const owned = progress.unlockedCars.includes(car.id);
                const active = previewCar.id === car.id;
                const equipped = progress.selectedCarId === car.id;
                const swatch = progress.carColors[car.id] ?? car.defaultColor;
                return (
                  <button
                    key={car.id}
                    onClick={() => onPreviewCar(car.id, swatch)}
                    className={`min-w-[188px] text-left rounded-xl p-3 border transition-all cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[#172033] border-amber-400'
                        : 'bg-[#111726] border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {car.brand}
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/30"
                        style={{ backgroundColor: swatch }}
                      />
                    </div>
                    <div className="font-display font-bold text-sm text-white mt-1 truncate">
                      {car.name}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-slate-300 tabular-nums">
                        {car.baseStats.topSpeed} {t(lang, 'kmh')}
                      </span>
                      {owned ? (
                        <span className="text-emerald-400 font-semibold">
                          {equipped ? t(lang, 'selected') : t(lang, 'unlocked')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-300 font-mono-tabular font-semibold">
                          <Lock className="w-3 h-3" />
                          {car.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Upgrade Tab */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 overflow-y-auto custom-scroll">
            {upgradeRows.map((row) => {
              const lv = carUpgrades[row.key];
              const isMax = lv >= 5;
              const cost = getUpgradeCost(lv, previewCar.price);
              const canAfford = isUnlocked && !isMax && progress.coins >= cost;
              return (
                <div
                  key={row.key}
                  className="bg-[#121828] border border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">
                        {row.label}
                      </span>
                      <span className="text-xs font-mono-tabular text-amber-400">
                        {t(lang, 'level')} {lv}/5
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 tabular-nums">
                      {row.statValue}
                    </div>
                    <div className="grid grid-cols-5 gap-1 mt-2.5">
                      {[0, 1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 rounded-sm ${
                            step < lv ? 'bg-amber-400' : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onUpgradeCar(previewCar.id, row.key, cost)}
                    disabled={!canAfford}
                    className={`flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${
                      !isUnlocked
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isMax
                        ? 'bg-emerald-950/60 text-emerald-400 cursor-default'
                        : canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>
                      {!isUnlocked
                        ? t(lang, 'locked')
                        : isMax
                        ? t(lang, 'maxLevel')
                        : `${t(lang, 'upgrade')} · ${cost.toLocaleString()}`}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
