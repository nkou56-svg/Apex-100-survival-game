import { Heart, Pause, Volume2, VolumeX } from 'lucide-react';
import { GameHUDState, GUN_DEFS } from '../types/game';

interface GameHUDProps {
  hud: GameHUDState;
  onPause: () => void;
  onToggleMute: () => void;
  onUseBandage: () => void;
  onUseMedkit: () => void;
  onCycleGun: () => void;
}

export function GameHUD({
  hud,
  onPause,
  onToggleMute,
  onUseBandage,
  onUseMedkit,
  onCycleGun,
}: GameHUDProps) {
  const activeGunName = hud.activeGun
    ? GUN_DEFS[hud.activeGun].name
    : 'Energy Strike';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
      {/* Top Perimeter Bar */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Hearts + Equipped Weapon & Clones */}
        <div className="bg-slate-950/85 border border-white/15 rounded-xl px-4 py-2.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-2" aria-label={`Health ${hud.hearts} of ${hud.maxHearts} hearts`}>
            {Array.from({ length: hud.maxHearts }).map((_, idx) => {
              const filled = idx < hud.hearts;
              return (
                <Heart
                  key={idx}
                  className={`w-6 h-6 transition-transform duration-150 ${
                    filled
                      ? 'text-rose-500 fill-rose-500 scale-100'
                      : 'text-slate-600 fill-slate-800 scale-90'
                  }`}
                />
              );
            })}
            <span className="font-mono-num text-sm font-bold text-slate-200 ml-1">
              {hud.hearts}/{hud.maxHearts}
            </span>
          </div>
          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
            <span>Weapon: {activeGunName}</span>
            {hud.ownedGuns.length > 1 && (
              <button
                type="button"
                onClick={onCycleGun}
                className="pointer-events-auto text-amber-300 hover:text-amber-200 font-semibold cursor-pointer"
              >
                [E] Switch ({hud.ownedGuns.length})
              </button>
            )}
            <span aria-hidden="true">·</span>
            <span className="text-sky-400">
              Dash {hud.dashReadyRatio >= 0.99 ? 'Ready' : 'Charging'}
            </span>
            {hud.clonesCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-semibold">
                  Clones: {hud.clonesCount}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top-Center: Level Counter & Enemies Remaining */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`bg-slate-950/85 border rounded-xl px-5 py-2 text-center ${
              hud.isBlackout ? 'border-indigo-400/50' : 'border-white/15'
            }`}
          >
            <div className="font-display text-lg sm:text-xl font-bold text-white tracking-wide font-mono-num flex items-center justify-center gap-2">
              <span>
                Level {hud.level} <span className="text-slate-400 text-sm font-normal">/ 100</span>
              </span>
              {hud.isBlackout && (
                <span className="text-xs font-sans font-bold text-indigo-300 tracking-wider">
                  · BLACKOUT
                </span>
              )}
            </div>
            <div className="text-xs text-slate-300 flex items-center justify-center gap-2">
              <span>{hud.levelTitle}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-amber-400 font-semibold">
                {hud.enemiesRemaining} {hud.enemiesRemaining === 1 ? 'Enemy' : 'Enemies'} Left
              </span>
            </div>
          </div>

          {hud.isBossLevel && hud.bossName && hud.bossHp > 0 && (
            <div className="w-64 sm:w-80 bg-slate-950/90 border border-amber-500/40 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-1">
                <span>{hud.bossName}</span>
                <span className="font-mono-num">
                  {Math.ceil(hud.bossHp)} / {hud.bossMaxHp}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-transform duration-100 origin-left"
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, hud.bossHp / hud.bossMaxHp))})`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Coin Counter + Audio & Pause */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950/85 border border-amber-400/30 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2" />
              <polygon points="12,6 15,12 12,18 9,12" fill="#FEF3C7" />
            </svg>
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-slate-400">Coins</span>
              <span className="font-mono-num text-lg font-bold text-amber-300">
                {hud.coins}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={hud.muted ? 'Unmute sound' : 'Mute sound'}
            className="pointer-events-auto p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-slate-100 transition-colors cursor-pointer"
          >
            {hud.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="pointer-events-auto p-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-white/15 text-slate-100 transition-colors cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Transient center banners (Level Clear / Toast) */}
      <div className="flex flex-col items-center gap-2 pointer-events-none">
        {hud.levelClearBanner && (
          <div className="bg-slate-950/90 border border-amber-400/50 rounded-xl px-7 py-3 text-center shadow-xl">
            <div className="font-display text-2xl font-bold text-amber-400">
              Level {hud.level} Cleared
            </div>
            <div className="text-sm text-slate-200">
              Approaching Shopkeeper...
            </div>
          </div>
        )}
        {hud.statusToast && (
          <div className="bg-slate-950/90 border border-white/20 rounded-lg px-4 py-1.5 text-sm font-medium text-slate-100">
            {hud.statusToast}
          </div>
        )}
      </div>

      {/* Bottom Quick-Use Pouch & Control Reminder */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onUseBandage}
            disabled={hud.bandages <= 0 || hud.hearts >= hud.maxHearts}
            className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              hud.bandages > 0 && hud.hearts < hud.maxHearts
                ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-400/50 text-emerald-100'
                : 'bg-slate-950/80 border-white/10 text-slate-400 opacity-80 cursor-default'
            }`}
          >
            <span className="font-mono-num text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">
              1
            </span>
            <span>Bandage (+1 Heart)</span>
            <span className="font-mono-num font-bold text-white">×{hud.bandages}</span>
          </button>

          <button
            type="button"
            onClick={onUseMedkit}
            disabled={hud.medkits <= 0 || hud.hearts >= hud.maxHearts}
            className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
              hud.medkits > 0 && hud.hearts < hud.maxHearts
                ? 'bg-emerald-950/90 hover:bg-emerald-900 border-emerald-400/50 text-emerald-100'
                : 'bg-slate-950/80 border-white/10 text-slate-400 opacity-80 cursor-default'
            }`}
          >
            <span className="font-mono-num text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">
              2
            </span>
            <span>Medkit (+2 Hearts)</span>
            <span className="font-mono-num font-bold text-white">×{hud.medkits}</span>
          </button>
        </div>

        <div className="hidden md:block bg-slate-950/75 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-slate-300">
          WASD Move · Click / Space {hud.hasGun ? 'Shoot' : 'Strike'}{hud.ownedGuns.length > 1 ? ' · E Switch Gun' : ''} · Shift Dash
        </div>
      </div>
    </div>
  );
}
