import React from 'react';
import {
  Download,
  Gamepad2,
  Globe,
  Monitor,
  Smartphone,
  Volume2,
  X,
} from 'lucide-react';
import { t } from '../i18n/translations';
import {
  ControlScheme,
  GameSettings,
  GraphicsQuality,
  Language,
} from '../types/game';
import { downloadAndroidBuildKit } from '../utils/storage';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const lang: Language = settings.language;

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#0b101b] border border-white/15 rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-display text-xl font-bold text-white">
            {t(lang, 'settings')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t(lang, 'close')}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scroll">
          {/* Language Switch */}
          <div className="bg-[#111726] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Globe className="w-4 h-4 text-sky-400" />
              <span>{t(lang, 'language')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onUpdateSettings({ language: 'en' })}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold cursor-pointer border transition-colors ${
                  settings.language === 'en'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                {t(lang, 'english')}
              </button>
              <button
                onClick={() => onUpdateSettings({ language: 'hi' })}
                className={`py-2.5 px-4 rounded-xl text-sm font-semibold cursor-pointer border transition-colors ${
                  settings.language === 'hi'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                {t(lang, 'hindi')}
              </button>
            </div>
          </div>

          {/* Control Scheme */}
          <div className="bg-[#111726] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>{t(lang, 'controlScheme')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'buttons', label: t(lang, 'ctrlButtons') },
                  { id: 'wheel', label: t(lang, 'ctrlWheel') },
                  { id: 'keyboard', label: t(lang, 'ctrlKeyboard') },
                ] as Array<{ id: ControlScheme; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateSettings({ controlScheme: opt.id })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                    settings.controlScheme === opt.id
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Graphics Quality (Low-end & High-end optimization) */}
          <div className="bg-[#111726] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
              <Monitor className="w-4 h-4 text-amber-400" />
              <span>{t(lang, 'graphicsQuality')}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'low', label: t(lang, 'qualityLow') },
                  { id: 'medium', label: t(lang, 'qualityMedium') },
                  { id: 'high', label: t(lang, 'qualityHigh') },
                ] as Array<{ id: GraphicsQuality; label: string }>
              ).map((q) => (
                <button
                  key={q.id}
                  onClick={() => onUpdateSettings({ quality: q.id })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                    settings.quality === q.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Settings */}
          <div className="bg-[#111726] border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Volume2 className="w-4 h-4 text-rose-400" />
                <span>{t(lang, 'sfxVolume')}</span>
              </div>
              <button
                onClick={() => onUpdateSettings({ muted: !settings.muted })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  settings.muted
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {t(lang, 'muteAudio')}: {settings.muted ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t(lang, 'sfxVolume')}</span>
                  <span className="font-mono-tabular">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.sfxVolume}
                  onChange={(e) =>
                    onUpdateSettings({ sfxVolume: Number(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t(lang, 'musicVolume')}</span>
                  <span className="font-mono-tabular">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.musicVolume}
                  onChange={(e) =>
                    onUpdateSettings({ musicVolume: Number(e.target.value) })
                  }
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Android APK Build Option */}
          <div className="bg-[#111726] border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
              <Smartphone className="w-4 h-4" />
              <span>{t(lang, 'androidApkTitle')}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t(lang, 'androidApkDesc')}
            </p>
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 rounded-lg p-3 space-y-1">
              <div>1. npm run build</div>
              <div>2. npm install @capacitor/core @capacitor/cli @capacitor/android</div>
              <div>3. npx cap add android &amp;&amp; npx cap sync android</div>
              <div>4. cd android &amp;&amp; ./gradlew assembleDebug</div>
            </div>
            <button
              onClick={downloadAndroidBuildKit}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{t(lang, 'downloadApkBundle')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
