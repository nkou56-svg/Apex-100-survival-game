import { Volume2, VolumeX } from 'lucide-react';

interface TitleScreenProps {
  bestLevel: number;
  muted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  bestLevel,
  muted,
  onStart,
  onToggleMute,
}: TitleScreenProps) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 pointer-events-none">
      {/* Top utility row */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-200 tracking-wide bg-slate-950/75 px-3.5 py-2 rounded-lg border border-white/10">
          {bestLevel > 1 ? `Best Survival Run · Level ${bestLevel} / 100` : '100-Level 3D Action Survival'}
        </div>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-slate-100 border border-white/15 transition-colors text-sm font-medium cursor-pointer"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{muted ? 'Muted' : 'Sound On'}</span>
        </button>
      </div>

      {/* Center Hero Title Lockup over calm atmospheric 3D world */}
      <div className="flex flex-col items-center text-center my-auto max-w-2xl mx-auto">
        <div className="bg-slate-950/80 border border-white/15 rounded-2xl px-8 py-9 sm:px-12 sm:py-11 shadow-2xl">
          <div className="flex justify-center mb-4">
            <svg
              width="290"
              height="68"
              viewBox="0 0 290 68"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="APEX 100"
              className="w-64 sm:w-72 h-auto"
            >
              <path
                d="M14 54L32 14H46L64 54H51L47.5 45H30.5L27 54H14ZM34.5 35H43.5L39 23.5L34.5 35Z"
                fill="#F8FAFC"
              />
              <path
                d="M72 54V14H95C105.5 14 112 20 112 28.5C112 37 105.5 43 95 43H84.5V54H72ZM84.5 33H93.5C97.8 33 100 31.2 100 28.5C100 25.8 97.8 24 93.5 24H84.5V33Z"
                fill="#F8FAFC"
              />
              <path
                d="M120 54V14H154V24H132.5V29H151V38.5H132.5V44H154.5V54H120Z"
                fill="#F8FAFC"
              />
              <path
                d="M161 54L176 33.5L162 14H176.5L183.5 25L190.5 14H205L191 33.5L206 54H191.5L183.5 42L175.5 54H161Z"
                fill="#F8FAFC"
              />
              <rect x="215" y="14" width="62" height="40" rx="8" fill="#F59E0B" />
              <text
                x="246"
                y="43"
                textAnchor="middle"
                fill="#0F172A"
                fontFamily="Oxanium, sans-serif"
                fontWeight="800"
                fontSize="26"
              >
                100
              </text>
            </svg>
          </div>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto mb-7">
            Battle through 100 dynamic 3D arenas, gather gold coins, buy gear from the shopkeeper, and defeat the Apex Titan.
          </p>

          <button
            type="button"
            onClick={onStart}
            className="pointer-events-auto font-display text-lg font-bold tracking-wide px-10 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 transition-all shadow-lg cursor-pointer"
          >
            Start Survival Run
          </button>
        </div>
      </div>

      {/* Single flat control-hint line */}
      <div className="flex justify-center">
        <div className="bg-slate-950/80 border border-white/10 rounded-lg px-5 py-2 text-xs sm:text-sm text-slate-300 tracking-wide">
          WASD Move · Mouse / Space Attack · E Switch Gun · Shift Dash · 1 / 2 Heal · Esc Pause
        </div>
      </div>
    </div>
  );
}
