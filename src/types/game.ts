export type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'shop'
  | 'gameover'
  | 'victory';

export type EnemyArchetype =
  | 'stalker'
  | 'brute'
  | 'weaver'
  | 'charger'
  | 'boss';

export type PropKind =
  | 'tree'
  | 'pine'
  | 'rock'
  | 'crystal'
  | 'pillar'
  | 'cactus'
  | 'mushroom'
  | 'obsidian';

export type GunId = 'blaster' | 'shotgun' | 'plasma' | 'railgun';

export interface GunDef {
  id: GunId;
  name: string;
  cost: number;
  damage: number;
  cooldown: number;
  speed: number;
  pellets: number;
  spread: number;
  pierce: boolean;
  colorHex: number;
  description: string;
}

export const GUN_DEFS: Record<GunId, GunDef> = {
  blaster: {
    id: 'blaster',
    name: 'Blaster Gun',
    cost: 15,
    damage: 18,
    cooldown: 0.19,
    speed: 28,
    pellets: 1,
    spread: 0,
    pierce: false,
    colorHex: 0x38bdf8,
    description: 'Allows you to shoot enemies from range.',
  },
  shotgun: {
    id: 'shotgun',
    name: 'Scatter Shotgun',
    cost: 35,
    damage: 14,
    cooldown: 0.42,
    speed: 26,
    pellets: 5,
    spread: 0.34,
    pierce: false,
    colorHex: 0xf97316,
    description: 'Fires a wide 5-bolt spread that shreds groups.',
  },
  plasma: {
    id: 'plasma',
    name: 'Hyper Plasma Rifle',
    cost: 55,
    damage: 28,
    cooldown: 0.13,
    speed: 34,
    pellets: 1,
    spread: 0.04,
    pierce: false,
    colorHex: 0xa855f7,
    description: 'Rapid-fire superheated plasma bolts.',
  },
  railgun: {
    id: 'railgun',
    name: 'Apex Railgun',
    cost: 80,
    damage: 65,
    cooldown: 0.48,
    speed: 46,
    pellets: 1,
    spread: 0,
    pierce: true,
    colorHex: 0x22c55e,
    description: 'High-velocity piercing beam that cuts through lines of enemies.',
  },
};

export const GUN_ORDER: readonly GunId[] = [
  'blaster',
  'shotgun',
  'plasma',
  'railgun',
];

export type ShopItemId =
  | 'bandage'
  | 'medkit'
  | 'gun'
  | 'shotgun'
  | 'plasma'
  | 'railgun'
  | 'clone';

export interface ShopItemDef {
  id: ShopItemId;
  name: string;
  cost: number;
  description: string;
  minShopLevel: number;
}

export const SHOP_ITEMS: readonly ShopItemDef[] = [
  {
    id: 'bandage',
    name: 'Bandage',
    cost: 10,
    description: 'Restores 1 heart of health.',
    minShopLevel: 1,
  },
  {
    id: 'medkit',
    name: 'Medkit',
    cost: 18,
    description: 'Restores 2 hearts of health.',
    minShopLevel: 1,
  },
  {
    id: 'gun',
    name: 'Gun',
    cost: 15,
    description: 'Allows you to shoot enemies from range.',
    minShopLevel: 1,
  },
  {
    id: 'clone',
    name: 'Clone Ally',
    cost: 30,
    description: 'Summons an autonomous 3D clone that fights and shoots alongside you.',
    minShopLevel: 5,
  },
  {
    id: 'shotgun',
    name: 'Scatter Shotgun',
    cost: 35,
    description: 'Fires a 5-bolt spread burst. Press E in combat to switch guns.',
    minShopLevel: 5,
  },
  {
    id: 'plasma',
    name: 'Hyper Plasma Rifle',
    cost: 55,
    description: 'High-damage rapid-fire plasma rifle. Press E to switch guns.',
    minShopLevel: 5,
  },
  {
    id: 'railgun',
    name: 'Apex Railgun',
    cost: 80,
    description: 'Piercing heavy bolts that pass through enemies. Press E to switch guns.',
    minShopLevel: 5,
  },
] as const;

export interface BiomePalette {
  id: string;
  name: string;
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  groundPrimary: string;
  groundSecondary: string;
  groundAccent: string;
  keyLightColor: string;
  keyLightIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  propPrimary: PropKind;
  propSecondary: PropKind;
  propColorA: string;
  propColorB: string;
  accentGlow: string;
}

export interface ObstacleSpec {
  x: number;
  z: number;
  radius: number;
  scale: number;
  kind: PropKind;
  rotation: number;
}

export interface EnemySpawnSpec {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  z: number;
  maxHp: number;
  speed: number;
  scale: number;
  coinDrop: number;
  colorHex: string;
  accentHex: string;
  attackCooldown: number;
  isBoss: boolean;
  bossName?: string;
}

export interface CoinSpawnSpec {
  id: string;
  x: number;
  z: number;
  value: number;
}

export interface LevelConfig {
  level: number;
  title: string;
  arenaRadius: number;
  biome: BiomePalette;
  obstacles: ObstacleSpec[];
  enemies: EnemySpawnSpec[];
  coins: CoinSpawnSpec[];
  isBossLevel: boolean;
  isFinalLevel: boolean;
  isBlackout: boolean;
}

export interface GameHUDState {
  phase: GamePhase;
  level: number;
  levelTitle: string;
  biomeName: string;
  isBlackout: boolean;
  hearts: number;
  maxHearts: number;
  coins: number;
  hasGun: boolean;
  ownedGuns: GunId[];
  activeGun: GunId | null;
  clonesCount: number;
  maxClones: number;
  bandages: number;
  medkits: number;
  enemiesRemaining: number;
  enemiesTotal: number;
  dashReadyRatio: number;
  isBossLevel: boolean;
  bossName: string | null;
  bossHp: number;
  bossMaxHp: number;
  enemiesDefeatedTotal: number;
  totalCoinsCollected: number;
  bestLevel: number;
  muted: boolean;
  levelClearBanner: boolean;
  statusToast: string | null;
}
