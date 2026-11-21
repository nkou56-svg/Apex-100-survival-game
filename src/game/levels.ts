import {
  BiomePalette,
  CoinSpawnSpec,
  EnemyArchetype,
  EnemySpawnSpec,
  LevelConfig,
  ObstacleSpec,
} from '../types/game';

export const BIOMES: readonly BiomePalette[] = [
  {
    id: 'emerald-glade',
    name: 'Sunlit Glade',
    skyColor: '#69b4e8',
    fogColor: '#86c6ee',
    fogDensity: 0.011,
    groundPrimary: '#4d8c4a',
    groundSecondary: '#3b7338',
    groundAccent: '#78b858',
    keyLightColor: '#fff2d6',
    keyLightIntensity: 2.1,
    hemiSkyColor: '#9ad8ff',
    hemiGroundColor: '#3a572c',
    propPrimary: 'tree',
    propSecondary: 'rock',
    propColorA: '#2f6e39',
    propColorB: '#7a7d7a',
    accentGlow: '#84cc16',
  },
  {
    id: 'amber-canyon',
    name: 'Amber Canyon',
    skyColor: '#e89d65',
    fogColor: '#eaac77',
    fogDensity: 0.012,
    groundPrimary: '#c76d3b',
    groundSecondary: '#9e5027',
    groundAccent: '#e29855',
    keyLightColor: '#ffdfba',
    keyLightIntensity: 2.2,
    hemiSkyColor: '#ffd4a3',
    hemiGroundColor: '#6b3218',
    propPrimary: 'cactus',
    propSecondary: 'rock',
    propColorA: '#4e8a47',
    propColorB: '#9c5233',
    accentGlow: '#f59e0b',
  },
  {
    id: 'teal-marsh',
    name: 'Mistwood Marsh',
    skyColor: '#5c9c99',
    fogColor: '#6db0ab',
    fogDensity: 0.013,
    groundPrimary: '#366b64',
    groundSecondary: '#27524c',
    groundAccent: '#529c8a',
    keyLightColor: '#e6fffa',
    keyLightIntensity: 1.9,
    hemiSkyColor: '#8cd4cd',
    hemiGroundColor: '#1f3d39',
    propPrimary: 'mushroom',
    propSecondary: 'tree',
    propColorA: '#22d3ee',
    propColorB: '#2a5748',
    accentGlow: '#2dd4bf',
  },
  {
    id: 'frost-tundra',
    name: 'Frostpeak Tundra',
    skyColor: '#99c5e8',
    fogColor: '#b7daf5',
    fogDensity: 0.011,
    groundPrimary: '#d0e6f5',
    groundSecondary: '#a3c4dc',
    groundAccent: '#77b6ea',
    keyLightColor: '#ffffff',
    keyLightIntensity: 2.0,
    hemiSkyColor: '#d9f0ff',
    hemiGroundColor: '#587894',
    propPrimary: 'pine',
    propSecondary: 'crystal',
    propColorA: '#2d5c57',
    propColorB: '#38bdf8',
    accentGlow: '#38bdf8',
  },
  {
    id: 'sunken-ruins',
    name: 'Sunken Citadel',
    skyColor: '#6d8299',
    fogColor: '#8195ab',
    fogDensity: 0.012,
    groundPrimary: '#7d8a87',
    groundSecondary: '#5b6764',
    groundAccent: '#48a885',
    keyLightColor: '#ffeed9',
    keyLightIntensity: 1.95,
    hemiSkyColor: '#a6c1d9',
    hemiGroundColor: '#3a4542',
    propPrimary: 'pillar',
    propSecondary: 'rock',
    propColorA: '#8d9996',
    propColorB: '#536360',
    accentGlow: '#34d399',
  },
  {
    id: 'crimson-badlands',
    name: 'Crimson Badlands',
    skyColor: '#a34c4c',
    fogColor: '#b85c54',
    fogDensity: 0.012,
    groundPrimary: '#8a3932',
    groundSecondary: '#66241f',
    groundAccent: '#c45a41',
    keyLightColor: '#ffd4c2',
    keyLightIntensity: 2.05,
    hemiSkyColor: '#e88b7d',
    hemiGroundColor: '#421614',
    propPrimary: 'rock',
    propSecondary: 'obsidian',
    propColorA: '#70302b',
    propColorB: '#4a2024',
    accentGlow: '#fb7185',
  },
  {
    id: 'lumina-cavern',
    name: 'Lumina Cavern',
    skyColor: '#253352',
    fogColor: '#2f4066',
    fogDensity: 0.014,
    groundPrimary: '#364566',
    groundSecondary: '#27324d',
    groundAccent: '#38bdf8',
    keyLightColor: '#c4e0ff',
    keyLightIntensity: 1.9,
    hemiSkyColor: '#60a5fa',
    hemiGroundColor: '#1b243b',
    propPrimary: 'crystal',
    propSecondary: 'mushroom',
    propColorA: '#38bdf8',
    propColorB: '#a78bfa',
    accentGlow: '#60a5fa',
  },
  {
    id: 'gilded-sky',
    name: 'Skyward Bastion',
    skyColor: '#75a6d9',
    fogColor: '#9bc2e8',
    fogDensity: 0.01,
    groundPrimary: '#d9cfa9',
    groundSecondary: '#b5a87c',
    groundAccent: '#e6b84c',
    keyLightColor: '#fff8db',
    keyLightIntensity: 2.2,
    hemiSkyColor: '#bfe0ff',
    hemiGroundColor: '#756847',
    propPrimary: 'pillar',
    propSecondary: 'tree',
    propColorA: '#dfd6ba',
    propColorB: '#4b8a5a',
    accentGlow: '#fbbf24',
  },
  {
    id: 'obsidian-caldera',
    name: 'Obsidian Caldera',
    skyColor: '#3d2122',
    fogColor: '#522926',
    fogDensity: 0.014,
    groundPrimary: '#33292a',
    groundSecondary: '#21191a',
    groundAccent: '#f97316',
    keyLightColor: '#ffba82',
    keyLightIntensity: 2.0,
    hemiSkyColor: '#f97316',
    hemiGroundColor: '#1a0e0e',
    propPrimary: 'obsidian',
    propSecondary: 'rock',
    propColorA: '#2b2429',
    propColorB: '#4f2c27',
    accentGlow: '#f97316',
  },
  {
    id: 'apex-sanctum',
    name: 'Apex Sanctum',
    skyColor: '#1b2038',
    fogColor: '#252b4a',
    fogDensity: 0.013,
    groundPrimary: '#2a304d',
    groundSecondary: '#1c2036',
    groundAccent: '#f59e0b',
    keyLightColor: '#ffe7b3',
    keyLightIntensity: 2.25,
    hemiSkyColor: '#818cf8',
    hemiGroundColor: '#171929',
    propPrimary: 'pillar',
    propSecondary: 'crystal',
    propColorA: '#3d4469',
    propColorB: '#f59e0b',
    accentGlow: '#fbbf24',
  },
];

const ADJECTIVES = [
  'Sunlit',
  'Verdant',
  'Whispering',
  'Golden',
  'Shattered',
  'Howling',
  'Gilded',
  'Ashen',
  'Crystalline',
  'Apex',
];

const NOUNS = [
  'Clearing',
  'Outpost',
  'Crossroads',
  'Basin',
  'Ridge',
  'Watchtower',
  'Sanctuary',
  'Labyrinth',
  'Crucible',
  'Citadel',
];

function seededRandom(seed: number): () => number {
  let state = seed * 1664525 + 1013904223;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function getBiomeForLevel(level: number): BiomePalette {
  if (level === 100) {
    return BIOMES[9];
  }
  // Cycle through distinct biomes every 2 levels in early game, and rotate vividly across all 100 levels
  const zoneIndex = Math.floor((level - 1) / 5) % BIOMES.length;
  const subShift = (level - 1) % 3 === 2 ? 1 : 0;
  return BIOMES[(zoneIndex + subShift) % BIOMES.length];
}

function getEnemyColors(archetype: EnemyArchetype): {
  colorHex: string;
  accentHex: string;
} {
  switch (archetype) {
    case 'stalker':
      return { colorHex: '#dc2626', accentHex: '#fde047' };
    case 'brute':
      return { colorHex: '#7c2d12', accentHex: '#fb923c' };
    case 'weaver':
      return { colorHex: '#0284c7', accentHex: '#67e8f9' };
    case 'charger':
      return { colorHex: '#be123c', accentHex: '#fda4af' };
    case 'boss':
      return { colorHex: '#991b1b', accentHex: '#fbbf24' };
  }
}

export function generateLevel(level: number): LevelConfig {
  const clampedLevel = Math.max(1, Math.min(100, Math.floor(level)));
  const rand = seededRandom(clampedLevel * 7919 + 31);
  const baseBiome = getBiomeForLevel(clampedLevel);

  // Subtle per-level color shift so every single level looks slightly unique
  const biome: BiomePalette = {
    ...baseBiome,
  };

  const isFinalLevel = clampedLevel === 100;
  const isBossLevel = isFinalLevel || clampedLevel % 10 === 0;
  const isBlackout = clampedLevel > 10 && clampedLevel % 2 === 1;
  const arenaRadius = isFinalLevel
    ? 28
    : Math.min(26, 17 + Math.floor(clampedLevel / 14));

  const adj = ADJECTIVES[(clampedLevel - 1) % ADJECTIVES.length];
  const noun = NOUNS[Math.floor((clampedLevel - 1) / 10) % NOUNS.length];
  const title = isFinalLevel
    ? 'Throne of the Apex Titan'
    : isBossLevel
      ? `${biome.name} — Warden Gate`
      : isBlackout
        ? `${adj} ${noun} (Blackout)`
        : `${adj} ${noun}`;

  // Place interior cover obstacles (keeping center spawn safe)
  const obstacles: ObstacleSpec[] = [];
  const obstacleCount = isFinalLevel ? 8 : 5 + (clampedLevel % 6);
  for (let i = 0; i < obstacleCount; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = rand() * Math.PI * 2;
      const dist = 5.5 + rand() * (arenaRadius - 8.5);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scale = 0.85 + rand() * 0.45;
      const radius = 1.1 * scale;

      const overlaps = obstacles.some(
        (o) => Math.hypot(o.x - x, o.z - z) < o.radius + radius + 2.4
      );
      if (!overlaps) {
        obstacles.push({
          x,
          z,
          radius,
          scale,
          kind: i % 2 === 0 ? biome.propPrimary : biome.propSecondary,
          rotation: rand() * Math.PI * 2,
        });
        break;
      }
    }
  }

  // Generate enemies with smooth ramp through 20 and steep hard mode after Level 20
  const enemies: EnemySpawnSpec[] = [];
  const isHardMode = clampedLevel > 20;
  const baseCount =
    clampedLevel === 1
      ? 3
      : clampedLevel <= 5
        ? 3 + clampedLevel
        : isHardMode
          ? Math.min(24, 9 + Math.floor((clampedLevel - 20) * 0.22))
          : Math.min(10, 5 + Math.floor(clampedLevel * 0.25));

  const hpScale = isHardMode
    ? 2.65 + (clampedLevel - 20) * 0.24
    : 1 + (clampedLevel - 1) * 0.085;
  const speedScale = isHardMode
    ? 1.28 + Math.min(0.75, (clampedLevel - 20) * 0.011)
    : 1 + Math.min(0.28, (clampedLevel - 1) * 0.014);

  if (isBossLevel) {
    const bossHp = isFinalLevel
      ? 1450
      : isHardMode
        ? Math.round(220 + clampedLevel * 7.2)
        : Math.round(90 + clampedLevel * 3.8);
    const bossScale = isFinalLevel ? 2.15 : 1.65;
    const bossColors = getEnemyColors('boss');
    enemies.push({
      id: `L${clampedLevel}-boss`,
      archetype: 'boss',
      x: 0,
      z: -arenaRadius * 0.52,
      maxHp: bossHp,
      speed: (isFinalLevel ? 4.8 : isHardMode ? 4.1 : 3.5) * speedScale,
      scale: bossScale,
      coinDrop: isFinalLevel ? 80 : (isHardMode ? 24 : 12) + Math.floor(clampedLevel / 4),
      colorHex: bossColors.colorHex,
      accentHex: bossColors.accentHex,
      attackCooldown: isFinalLevel ? 1.15 : isHardMode ? 1.35 : 1.9,
      isBoss: true,
      bossName: isFinalLevel
        ? 'APEX TITAN OVERLORD'
        : `WARDEN OF LEVEL ${clampedLevel}`,
    });
  }

  const minionCount = isFinalLevel
    ? 10
    : isBossLevel
      ? Math.max(3, Math.floor(baseCount * 0.5))
      : baseCount;

  for (let i = 0; i < minionCount; i++) {
    let archetype: EnemyArchetype = 'stalker';
    if (clampedLevel >= 2 && i % 4 === 1) archetype = 'brute';
    if (clampedLevel >= 4 && i % 4 === 2) archetype = 'weaver';
    if (clampedLevel >= 7 && i % 4 === 3) archetype = 'charger';
    if (clampedLevel === 1) archetype = 'stalker';

    const angle = (i / minionCount) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const dist = 8.5 + rand() * (arenaRadius - 10.5);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;

    let baseHp = 22;
    let baseSpeed = 3.7;
    let scale = 1.0;
    let coinDrop = 2;
    let attackCooldown = 1.5;

    if (archetype === 'brute') {
      baseHp = 44;
      baseSpeed = 2.6;
      scale = 1.3;
      coinDrop = 3;
      attackCooldown = 1.9;
    } else if (archetype === 'weaver') {
      baseHp = 26;
      baseSpeed = 2.8;
      scale = 1.05;
      coinDrop = 3;
      attackCooldown = 2.25;
    } else if (archetype === 'charger') {
      baseHp = 30;
      baseSpeed = 4.2;
      scale = 1.05;
      coinDrop = 3;
      attackCooldown = 2.0;
    }

    const colors = getEnemyColors(archetype);
    const minCooldown = isHardMode ? 0.62 : 0.95;
    const cdReduction = isHardMode
      ? 0.25 + (clampedLevel - 20) * 0.008
      : clampedLevel * 0.005;

    enemies.push({
      id: `L${clampedLevel}-E${i}`,
      archetype,
      x,
      z,
      maxHp: Math.round(baseHp * hpScale),
      speed: baseSpeed * speedScale,
      scale,
      coinDrop: coinDrop + Math.floor(clampedLevel / 20),
      colorHex: colors.colorHex,
      accentHex: colors.accentHex,
      attackCooldown: Math.max(minCooldown, attackCooldown - cdReduction),
      isBoss: false,
    });
  }

  // Place collectible coins around the arena
  const coins: CoinSpawnSpec[] = [];
  const coinCount =
    clampedLevel === 1
      ? 14
      : Math.min(20, 8 + Math.floor(clampedLevel / 8));
  for (let i = 0; i < coinCount; i++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const angle = (i / coinCount) * Math.PI * 2 + rand() * 0.4;
      const dist = 3.8 + rand() * (arenaRadius - 5.2);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const blocked = obstacles.some(
        (o) => Math.hypot(o.x - x, o.z - z) < o.radius + 1.0
      );
      if (!blocked) {
        coins.push({
          id: `L${clampedLevel}-C${i}`,
          x,
          z,
          value: clampedLevel >= 40 ? 2 : 1,
        });
        break;
      }
    }
  }

  return {
    level: clampedLevel,
    title,
    arenaRadius,
    biome,
    obstacles,
    enemies,
    coins,
    isBossLevel,
    isFinalLevel,
    isBlackout,
  };
}
