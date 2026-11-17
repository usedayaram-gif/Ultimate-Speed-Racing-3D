import React, { useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  Pause,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { t } from '../i18n/translations';
import { ControlScheme, Language, RaceHUDState } from '../types/game';

interface RaceHUDProps {
  hud: RaceHUDState;
  language: Language;
  controlScheme: ControlScheme;
  muted: boolean;
  onControlChange: (patch: {
    steer?: number;
    throttle?: boolean;
    brake?: boolean;
    nitro?: boolean;
  }) => void;
  onCycleCamera: () => void;
  onToggleMute: () => void;
  onPause: () => void;
}

export const RaceHUD: React.FC<RaceHUDProps> = ({
  hud,
  language,
  controlScheme,
  muted,
  onControlChange,
  onCycleCamera,
  onToggleMute,
  onPause,
}) => {
  const [wheelAngleDeg, setWheelAngleDeg] = useState(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const activeSteerPtr = useRef<number | null>(null);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${rem.toFixed(1).padStart(4, '0')}`;
  };

  const handleWheelPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    // Angle relative to straight up (-90deg)
    let angle = Math.atan2(dx, -dy);
    const maxRad = Math.PI * 0.45;
    angle = Math.max(-maxRad, Math.min(maxRad, angle));
    const normSteer = angle / maxRad;
    setWheelAngleDeg((angle * 180) / Math.PI);
    onControlChange({ steer: normSteer });
  };

  const releaseWheel = () => {
    activeSteerPtr.current = null;
    setWheelAngleDeg(0);
    onControlChange({ steer: 0 });
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Telemetry Row */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Position, Distance, Time */}
        <div className="bg-[#090d16]/85 border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center gap-4">
          {hud.totalRacers > 1 && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400">
                {t(language, 'pos')}
              </div>
              <div className="font-display text-xl sm:text-2xl font-bold text-amber-400 tabular-nums leading-none">
                {hud.position}
                <span className="text-xs text-slate-400">/{hud.totalRacers}</span>
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-semibold text-slate-400">
              {t(language, 'dist')}
            </div>
            <div className="font-mono-tabular text-sm sm:text-base font-bold text-white leading-tight">
              {(hud.distanceMeters / 1000).toFixed(2)}
              {hud.targetDistanceMeters > 0
                ? ` / ${(hud.targetDistanceMeters / 1000).toFixed(1)} km`
                : ' km'}
            </div>
          </div>

          <div className="hidden sm:block">
            <div className="text-[10px] font-semibold text-slate-400">
              {t(language, 'time')}
            </div>
            <div className="font-mono-tabular text-sm sm:text-base font-bold text-slate-200 leading-tight">
              {formatTime(hud.elapsedTime)}
            </div>
          </div>
        </div>

        {/* Top-Center: Event Banner / Police Pursuit Alert */}
        <div className="flex flex-col items-center gap-2 max-w-xs sm:max-w-sm">
          {hud.policeActive && (
            <div className="bg-rose-950/90 border border-rose-500/60 rounded-xl px-4 py-2 w-full min-w-[200px]">
              <div className="flex items-center justify-between text-xs font-bold text-rose-200">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  {t(language, 'policeAlert')}
                </span>
                <span className="font-mono-tabular">{hud.policeDistanceMeters}m</span>
              </div>
              {hud.bustProgress > 0 && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[10px] text-rose-300">
                    <span>{t(language, 'bustedMeter')}</span>
                    <span>{hud.bustProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${hud.bustProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {hud.evadeProgress > 0 && (
                <div className="mt-1.5">
                  <div className="flex justify-between text-[10px] text-sky-300">
                    <span>{t(language, 'evading')}</span>
                    <span>{hud.evadeProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${hud.evadeProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {hud.eventBanner && (
            <div className="bg-amber-500 text-slate-950 font-display font-bold text-xs sm:text-sm px-4 py-1.5 rounded-lg shadow-lg">
              {hud.eventBanner}
            </div>
          )}
        </div>

        {/* Top-Right: Score + Camera + Mute + Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden md:block bg-[#090d16]/85 border border-white/10 rounded-xl px-3.5 py-2 text-right">
            <div className="text-[10px] font-semibold text-slate-400">
              {t(language, 'score')}
            </div>
            <div className="font-mono-tabular text-sm font-bold text-amber-300">
              {hud.score.toLocaleString()}
            </div>
          </div>

          <button
            onClick={onCycleCamera}
            className="flex items-center gap-1.5 bg-[#090d16]/90 hover:bg-[#141c2d] border border-white/15 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 cursor-pointer min-h-[42px]"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">
              {t(language, `cam_${hud.cameraAngle}`)}
            </span>
          </button>

          <button
            onClick={onToggleMute}
            aria-label={t(language, 'muteAudio')}
            className="flex items-center justify-center bg-[#090d16]/90 hover:bg-[#141c2d] border border-white/15 rounded-xl w-11 h-11 text-slate-200 cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <button
            onClick={onPause}
            aria-label={t(language, 'pause')}
            className="flex items-center justify-center bg-[#090d16]/90 hover:bg-[#141c2d] border border-white/15 rounded-xl w-11 h-11 text-white cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Track Progress Bar (thin top/mid edge indicator when finite race) */}
      {hud.targetDistanceMeters > 0 && (
        <div className="mx-auto w-full max-w-md h-1 bg-white/10 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-amber-400 transition-all duration-100"
            style={{ width: `${hud.progress * 100}%` }}
          />
        </div>
      )}

      {/* Spacer keeping center 85%+ completely clear */}
      <div className="flex-1" />

      {/* Bottom Controls + Speedometer Cluster */}
      <div className="flex items-end justify-between gap-3">
        {/* Left Steering Controls */}
        <div className="pointer-events-auto touch-control flex items-end gap-2">
          {controlScheme === 'wheel' ? (
            <div
              ref={wheelRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                activeSteerPtr.current = e.pointerId;
                handleWheelPointer(e);
              }}
              onPointerMove={(e) => {
                if (activeSteerPtr.current === e.pointerId) {
                  handleWheelPointer(e);
                }
              }}
              onPointerUp={releaseWheel}
              onPointerCancel={releaseWheel}
              className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-[#0b101b]/85 border-4 border-slate-600 flex items-center justify-center relative cursor-grab active:cursor-grabbing shadow-xl"
              style={{ transform: `rotate(${wheelAngleDeg}deg)` }}
            >
              <div className="w-20 h-20 rounded-full border-2 border-amber-400/60 flex items-center justify-center">
                <div className="w-full h-3 bg-slate-700" />
              </div>
              <div className="absolute top-1.5 w-3 h-3 rounded-full bg-amber-400" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onPointerDown={() => onControlChange({ steer: -1 })}
                onPointerUp={() => onControlChange({ steer: 0 })}
                onPointerLeave={() => onControlChange({ steer: 0 })}
                onPointerCancel={() => onControlChange({ steer: 0 })}
                aria-label={t(language, 'steerLeft')}
                className="touch-control w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#090d16]/85 active:bg-amber-500 active:text-slate-950 border border-white/15 flex items-center justify-center text-white cursor-pointer"
              >
                <ChevronLeft className="w-9 h-9" />
              </button>
              <button
                onPointerDown={() => onControlChange({ steer: 1 })}
                onPointerUp={() => onControlChange({ steer: 0 })}
                onPointerLeave={() => onControlChange({ steer: 0 })}
                onPointerCancel={() => onControlChange({ steer: 0 })}
                aria-label={t(language, 'steerRight')}
                className="touch-control w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#090d16]/85 active:bg-amber-500 active:text-slate-950 border border-white/15 flex items-center justify-center text-white cursor-pointer"
              >
                <ChevronRight className="w-9 h-9" />
              </button>
            </div>
          )}
        </div>

        {/* Center Compact Digital Speedometer & Nitro Gauge */}
        <div className="bg-[#090d16]/88 border border-white/15 rounded-2xl px-4 py-2.5 flex items-center gap-4 min-w-[180px] sm:min-w-[230px]">
          <div className="text-center">
            <div className="text-[10px] font-semibold text-slate-400">
              {t(language, 'gear')}
            </div>
            <div className="font-display text-xl font-bold text-amber-400 tabular-nums leading-none">
              {hud.gear}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl sm:text-3xl font-bold text-white tabular-nums leading-none">
                {hud.speedKmh}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {t(language, 'kmh')}
              </span>
            </div>
            {/* RPM Bar */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full transition-all duration-75 ${
                  hud.rpmRatio > 0.85 ? 'bg-rose-500' : 'bg-amber-400'
                }`}
                style={{ width: `${hud.rpmRatio * 100}%` }}
              />
            </div>
            {/* Nitro Bar */}
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-cyan-400 transition-all duration-75"
                style={{ width: `${hud.nitro}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Pedals: Brake, Gas, Nitro */}
        <div className="pointer-events-auto touch-control flex items-end gap-2">
          <button
            onPointerDown={() => onControlChange({ nitro: true })}
            onPointerUp={() => onControlChange({ nitro: false })}
            onPointerLeave={() => onControlChange({ nitro: false })}
            onPointerCancel={() => onControlChange({ nitro: false })}
            className={`touch-control w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
              hud.isNitroActive
                ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                : 'bg-[#090d16]/85 border-cyan-500/40 text-cyan-300'
            }`}
          >
            <Flame className="w-5 h-5" />
            <span>{t(language, 'nitroBtn')}</span>
          </button>

          <button
            onPointerDown={() => onControlChange({ brake: true })}
            onPointerUp={() => onControlChange({ brake: false })}
            onPointerLeave={() => onControlChange({ brake: false })}
            onPointerCancel={() => onControlChange({ brake: false })}
            className="touch-control w-14 h-16 sm:w-16 sm:h-20 rounded-2xl bg-rose-950/85 active:bg-rose-500 border border-rose-500/40 text-rose-200 active:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
          >
            {t(language, 'brake')}
          </button>

          <button
            onPointerDown={() => onControlChange({ throttle: true })}
            onPointerUp={() => onControlChange({ throttle: false })}
            onPointerLeave={() => onControlChange({ throttle: false })}
            onPointerCancel={() => onControlChange({ throttle: false })}
            className="touch-control w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-emerald-950/85 active:bg-emerald-500 border border-emerald-500/50 text-emerald-200 active:text-slate-950 flex items-center justify-center text-xs sm:text-sm font-bold cursor-pointer"
          >
            {t(language, 'gas')}
          </button>
        </div>
      </div>
    </div>
  );
};
