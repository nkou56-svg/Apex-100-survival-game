import { RotateCcw, Trophy } from 'lucide-react';
import { GameHUDState } from '../types/game';

interface PauseModalProps {
  hud: GameHUDState;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function PauseModal({
  hud,
  onResume,
  onRestart,
  onMainMenu,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75">
      <div className="w-full max-w-md bg-slate-950 border border-white/15 rounded-2xl p-7 text-center shadow-2xl">
        <div className="text-xs font-medium text-slate-400 mb-1">
          Level {hud.level} / 100 · {hud.levelTitle}
        </div>
        <h2 className="font-display text-3xl font-bold text-white mb-6">
          Game Paused
        </h2>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer"
          >
            Resume Game
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Restart from Level 1
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  hud: GameHUDState;
  onRetryLevel: () => void;
  onRestartRun: () => void;
  onMainMenu: () => void;
}

export function GameOverModal({
  hud,
  onRetryLevel,
  onRestartRun,
  onMainMenu,
}: GameOverModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="w-full max-w-md bg-slate-950 border border-rose-500/40 rounded-2xl p-7 text-center shadow-2xl">
        <div className="text-xs font-semibold text-rose-400 tracking-wide mb-1">
          All 3 Hearts Lost
        </div>
        <h2 className="font-display text-4xl font-extrabold text-white mb-2">
          GAME OVER
        </h2>
        <p className="text-sm text-slate-300 mb-6">
          You fell on Level {hud.level} ({hud.levelTitle}).
        </p>

        <div className="grid grid-cols-3 gap-3 bg-slate-900 border border-white/10 rounded-xl p-4 mb-6">
          <div>
            <div className="text-xs text-slate-400">Level</div>
            <div className="font-mono-num text-xl font-bold text-white">
              {hud.level}/100
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Coins</div>
            <div className="font-mono-num text-xl font-bold text-amber-400">
              {hud.coins}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Defeated</div>
            <div className="font-mono-num text-xl font-bold text-sky-400">
              {hud.enemiesDefeatedTotal}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onRetryLevel}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Level {hud.level}</span>
          </button>
          <button
            type="button"
            onClick={onRestartRun}
            className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            New Run (Level 1)
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

interface VictoryModalProps {
  hud: GameHUDState;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function VictoryModal({
  hud,
  onPlayAgain,
  onMainMenu,
}: VictoryModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70">
      <div className="w-full max-w-lg bg-slate-950/95 border border-amber-400/50 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Trophy className="w-9 h-9" />
        </div>

        <div className="text-xs font-semibold text-amber-400 tracking-wide mb-1">
          All 100 Levels Completed
        </div>
        <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-white mb-3">
          YOU WIN!
        </h2>
        <p className="text-slate-200 text-base leading-relaxed mb-6">
          Congratulations! You conquered every biome, defeated the Apex Titan on Level 100, and became the ultimate survivor.
        </p>

        <div className="grid grid-cols-3 gap-3 bg-slate-900 border border-white/10 rounded-xl p-4 mb-7">
          <div>
            <div className="text-xs text-slate-400">Levels Cleared</div>
            <div className="font-mono-num text-xl font-bold text-emerald-400">
              100 / 100
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Final Coins</div>
            <div className="font-mono-num text-xl font-bold text-amber-400">
              {hud.coins}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Enemies Defeated</div>
            <div className="font-mono-num text-xl font-bold text-sky-400">
              {hud.enemiesDefeatedTotal}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex-1 py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
