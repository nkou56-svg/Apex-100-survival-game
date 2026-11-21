import { useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import {
  GameOverModal,
  PauseModal,
  VictoryModal,
} from './components/OverlayModals';
import { ShopModal } from './components/ShopModal';
import { TitleScreen } from './components/TitleScreen';
import { SurvivalEngine } from './game/SurvivalEngine';
import { GameHUDState } from './types/game';

const INITIAL_HUD: GameHUDState = {
  phase: 'title',
  level: 1,
  levelTitle: 'Sunlit Clearing',
  biomeName: 'Sunlit Glade',
  isBlackout: false,
  hearts: 3,
  maxHearts: 3,
  coins: 0,
  hasGun: false,
  ownedGuns: [],
  activeGun: null,
  clonesCount: 0,
  maxClones: 15,
  bandages: 0,
  medkits: 0,
  enemiesRemaining: 3,
  enemiesTotal: 3,
  dashReadyRatio: 1,
  isBossLevel: false,
  bossName: null,
  bossHp: 0,
  bossMaxHp: 1,
  enemiesDefeatedTotal: 0,
  totalCoinsCollected: 0,
  bestLevel: 1,
  muted: false,
  levelClearBanner: false,
  statusToast: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<SurvivalEngine | null>(null);
  const [hud, setHud] = useState<GameHUDState>(INITIAL_HUD);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new SurvivalEngine(container, (nextHud) => {
      setHud(nextHud);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Isolated WebGL canvas mount so React HUD updates never tear down the 3D loop */}
      <div ref={mountRef} className="w-full h-full" />

      {hud.phase === 'title' && (
        <TitleScreen
          bestLevel={hud.bestLevel}
          muted={hud.muted}
          onStart={() => engineRef.current?.startNewGame()}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {(hud.phase === 'playing' || hud.phase === 'paused') && (
        <GameHUD
          hud={hud}
          onPause={() => engineRef.current?.pauseGame()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onUseBandage={() => engineRef.current?.useHealingItem('bandage')}
          onUseMedkit={() => engineRef.current?.useHealingItem('medkit')}
          onCycleGun={() => engineRef.current?.cycleGun()}
        />
      )}

      {hud.phase === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={() => engineRef.current?.startNewGame()}
          onMainMenu={() => engineRef.current?.returnToTitle()}
        />
      )}

      {hud.phase === 'shop' && (
        <ShopModal
          hud={hud}
          onBuyItem={(id) => engineRef.current?.buyShopItem(id)}
          onUseHealing={(kind) => engineRef.current?.useHealingItem(kind)}
          onContinue={() => engineRef.current?.proceedToNextLevel()}
        />
      )}

      {hud.phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          onRetryLevel={() => engineRef.current?.retryCurrentLevel()}
          onRestartRun={() => engineRef.current?.startNewGame()}
          onMainMenu={() => engineRef.current?.returnToTitle()}
        />
      )}

      {hud.phase === 'victory' && (
        <VictoryModal
          hud={hud}
          onPlayAgain={() => engineRef.current?.startNewGame()}
          onMainMenu={() => engineRef.current?.returnToTitle()}
        />
      )}
    </div>
  );
}
