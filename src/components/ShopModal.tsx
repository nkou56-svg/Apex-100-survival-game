import { ArrowRight, Cross, Heart, ShieldPlus, Users, Zap } from 'lucide-react';
import { GameHUDState, GunId, SHOP_ITEMS, ShopItemId } from '../types/game';

interface ShopModalProps {
  hud: GameHUDState;
  onBuyItem: (itemId: ShopItemId) => void;
  onUseHealing: (kind: 'bandage' | 'medkit') => void;
  onContinue: () => void;
}

export function ShopModal({
  hud,
  onBuyItem,
  onUseHealing,
  onContinue,
}: ShopModalProps) {
  const visibleItems = SHOP_ITEMS.filter(
    (item) => hud.level >= item.minShopLevel
  );

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-slate-950/55 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-950/95 border border-amber-400/30 rounded-2xl p-6 sm:p-7 shadow-2xl my-auto">
        {/* Header with Shopkeeper Title, Hearts & Coins */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="text-xs font-medium text-amber-400 tracking-wide mb-1">
              Level {hud.level} Complete · Sanctuary Outpost
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Shopkeeper&apos;s Stall
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              {hud.level >= 5
                ? `Advanced Armory & Clone Support unlocked! Stock up before Level ${hud.level + 1}.`
                : `Stock up on healing supplies or gear up before Level ${hud.level + 1}.`}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 flex items-center gap-2">
              {Array.from({ length: hud.maxHearts }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-5 h-5 ${
                    idx < hud.hearts
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-slate-600 fill-slate-800'
                  }`}
                />
              ))}
              <span className="font-mono-num text-sm font-bold text-slate-200 ml-1">
                {hud.hearts}/{hud.maxHearts}
              </span>
            </div>

            <div className="bg-slate-900 border border-amber-400/40 rounded-xl px-4 py-2 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2" />
                <polygon points="12,6 15,12 12,18 9,12" fill="#FEF3C7" />
              </svg>
              <span className="font-mono-num text-lg font-bold text-amber-300">
                {hud.coins} Coins
              </span>
            </div>
          </div>
        </div>

        {hud.statusToast && (
          <div className="mt-4 bg-slate-900 border border-sky-400/40 rounded-lg px-4 py-2 text-sm text-sky-200">
            {hud.statusToast}
          </div>
        )}

        {/* Item Grid: 3 items for Levels 1-4; unlocks Clone Ally & upgraded guns after Level 5 */}
        <div
          className={`grid grid-cols-1 gap-4 mt-5 ${
            visibleItems.length <= 3
              ? 'sm:grid-cols-3'
              : 'sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {visibleItems.map((item) => {
            const isGunItem =
              item.id === 'gun' ||
              item.id === 'shotgun' ||
              item.id === 'plasma' ||
              item.id === 'railgun';
            const mappedGunId: GunId | null =
              item.id === 'gun'
                ? 'blaster'
                : isGunItem
                  ? (item.id as GunId)
                  : null;
            const gunAlreadyOwned =
              mappedGunId !== null && hud.ownedGuns.includes(mappedGunId);
            const clonesMaxed =
              item.id === 'clone' && hud.clonesCount >= hud.maxClones;
            const canAfford = hud.coins >= item.cost;
            const disabled = gunAlreadyOwned || clonesMaxed || !canAfford;

            return (
              <div
                key={item.id}
                className="bg-slate-900 border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400">
                      {item.id === 'bandage' && (
                        <ShieldPlus className="w-5 h-5 text-emerald-400" />
                      )}
                      {item.id === 'medkit' && (
                        <Cross className="w-5 h-5 text-rose-400" />
                      )}
                      {item.id === 'clone' && (
                        <Users className="w-5 h-5 text-emerald-300" />
                      )}
                      {(item.id === 'gun' ||
                        item.id === 'shotgun' ||
                        item.id === 'plasma' ||
                        item.id === 'railgun') && (
                        <Zap
                          className={`w-5 h-5 ${
                            item.id === 'shotgun'
                              ? 'text-orange-400'
                              : item.id === 'plasma'
                                ? 'text-purple-400'
                                : item.id === 'railgun'
                                  ? 'text-emerald-400'
                                  : 'text-sky-400'
                          }`}
                        />
                      )}
                    </div>
                    <span className="font-mono-num text-sm font-bold text-amber-300">
                      {item.cost} Coins
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-white">
                    {item.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug">
                    {item.description}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {item.id === 'bandage' && hud.bandages > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>In pouch: {hud.bandages}</span>
                      {hud.hearts < hud.maxHearts && (
                        <button
                          type="button"
                          onClick={() => onUseHealing('bandage')}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                        >
                          Use Now
                        </button>
                      )}
                    </div>
                  )}
                  {item.id === 'medkit' && hud.medkits > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>In pouch: {hud.medkits}</span>
                      {hud.hearts < hud.maxHearts && (
                        <button
                          type="button"
                          onClick={() => onUseHealing('medkit')}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                        >
                          Use Now
                        </button>
                      )}
                    </div>
                  )}
                  {item.id === 'clone' && (
                    <div className="text-xs text-emerald-300 font-mono-num">
                      Active Clones: {hud.clonesCount} / {hud.maxClones}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onBuyItem(item.id)}
                    className={`w-full py-2.5 px-3 rounded-lg font-semibold text-sm transition-colors ${
                      gunAlreadyOwned
                        ? 'bg-sky-950 text-sky-300 border border-sky-500/40 cursor-default'
                        : clonesMaxed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : canAfford
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {gunAlreadyOwned
                      ? hud.activeGun === mappedGunId
                        ? 'Equipped'
                        : 'Owned'
                      : clonesMaxed
                        ? 'Max Clones Active'
                        : canAfford
                          ? `Buy ${item.name}`
                          : 'Not Enough Coins'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Continue Action */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {hud.ownedGuns.length > 1
              ? 'Press E anytime in combat to switch between your owned guns!'
              : !hud.hasGun
                ? 'Tip: Buy the Gun (15 Coins) to shoot enemies from a safe distance.'
                : hud.level + 1 > 10 && (hud.level + 1) % 2 === 1
                  ? `Heads up: Level ${hud.level + 1} is a Blackout level — your flashlight will guide you!`
                  : 'Healing items bought at full health are stored in your pouch (keys 1 & 2).'}
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto flex items-center justify-center gap-2 font-display font-bold text-base px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer shrink-0"
          >
            <span>Continue to Level {hud.level + 1}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
