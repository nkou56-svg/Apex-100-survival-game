import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CoinSpawnSpec,
  EnemyArchetype,
  GameHUDState,
  GamePhase,
  GUN_DEFS,
  GUN_ORDER,
  GunId,
  LevelConfig,
  SHOP_ITEMS,
  ShopItemId,
} from '../types/game';
import { soundEngine } from './audio';
import { generateLevel } from './levels';
import {
  CloneRig,
  createCloneModel,
  createCoinMesh,
  createEnemyModel,
  createObstacleProp,
  createPlayerModel,
  createShopkeeperStall,
  EnemyRig,
  PlayerRig,
  ShopkeeperRig,
} from './models';
import { createContactShadowTexture, createGroundTexture } from './textures';

// Pre-allocated math scratch objects (zero per-frame GC)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _mouseNdc = new THREE.Vector2();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);

interface ActiveEnemy {
  id: string;
  archetype: EnemyArchetype;
  rig: EnemyRig;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  speed: number;
  scale: number;
  coinDrop: number;
  isBoss: boolean;
  bossName?: string;
  attackCooldown: number;
  cooldownTimer: number;
  windupTimer: number;
  windupDuration: number;
  dashTimer: number;
  dashDirX: number;
  dashDirZ: number;
  hitFlashTimer: number;
  walkPhase: number;
  patternCounter: number;
}

interface ActiveClone {
  rig: CloneRig;
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  walkPhase: number;
  fireCooldown: number;
  slotIndex: number;
}

interface ActiveCoin {
  id: string;
  mesh: THREE.Group;
  x: number;
  z: number;
  value: number;
  phase: number;
  collected: boolean;
}

interface ActiveObstacle {
  x: number;
  z: number;
  radius: number;
  mesh: THREE.Group;
}

interface Projectile {
  active: boolean;
  fromPlayer: boolean;
  pierce: boolean;
  hitIds: Set<string>;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  life: number;
}

interface BurstParticle {
  active: boolean;
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const STORAGE_KEY = 'apex100_survival_stats_v1';
const MAX_CLONES = 15;

export class SurvivalEngine {
  private container: HTMLElement;
  private onStateChange: (hud: GameHUDState) => void;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private playerFlashlight: THREE.SpotLight;
  private playerLantern: THREE.PointLight;

  private groundMesh: THREE.Mesh;
  private arenaRingMesh: THREE.Mesh;
  private shadowTex: THREE.CanvasTexture;
  private currentGroundTex: THREE.CanvasTexture | null = null;

  private levelGroup: THREE.Group;
  private perimeterInstanced: THREE.InstancedMesh | null = null;
  private aimReticle: THREE.Mesh;

  private playerRig: PlayerRig;
  private shopkeeperRig: ShopkeeperRig;

  private projectiles: Projectile[] = [];
  private particles: BurstParticle[] = [];

  private enemies: ActiveEnemy[] = [];
  private clones: ActiveClone[] = [];
  private clonesCount = 0;
  private coins: ActiveCoin[] = [];
  private obstacles: ActiveObstacle[] = [];

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private elapsed = 0;

  // Game state
  private phase: GamePhase = 'title';
  private levelConfig: LevelConfig = generateLevel(1);
  private level = 1;
  private hearts = 3;
  private readonly maxHearts = 3;
  private playerCoins = 0;
  private ownedGuns: GunId[] = [];
  private activeGun: GunId | null = null;
  private bandages = 0;
  private medkits = 0;
  private enemiesDefeatedTotal = 0;
  private totalCoinsCollected = 0;
  private bestLevel = 1;
  private levelClearTransitionTimer = 0;
  private victoryFireworkTimer = 0;
  private statusToast: string | null = null;
  private statusToastTimer = 0;

  // Player kinematics
  private playerX = 0;
  private playerZ = 0;
  private playerVx = 0;
  private playerVz = 0;
  private playerYaw = 0;
  private playerWalkPhase = 0;
  private playerInvulnTimer = 0;
  private attackCooldownTimer = 0;
  private meleeSlashTimer = 0;
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private dashDirX = 0;
  private dashDirZ = 1;

  // Juice
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private camX = 0;
  private camY = 16;
  private camZ = 16;
  private camLookX = 0;
  private camLookY = 0.8;
  private camLookZ = 0;

  // Input state
  private heldKeys = new Set<string>();
  private pointerDown = false;
  private hasMouseMoved = false;
  private aimWorldX = 0;
  private aimWorldZ = -4;
  private lastHudSync = 0;

  constructor(
    container: HTMLElement,
    onStateChange: (hud: GameHUDState) => void
  ) {
    this.container = container;
    this.onStateChange = onStateChange;

    this.loadSavedStats();

    // Software WebGL detection per Three.js skill
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxAnisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy()
    );

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.2, 220);

    // Mandatory studio environment reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    // 3-point warm/cool lighting rig
    this.hemiLight = new THREE.HemisphereLight(0x9ad8ff, 0x3a572c, 0.72);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff2d6, 2.0);
    this.keyLight.position.set(18, 28, 16);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 80;
    const d = 28;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
    this.rimLight.position.set(-16, 14, -18);
    this.scene.add(this.rimLight);

    this.shadowTex = createContactShadowTexture();

    // Infinite-feeling terrain ground plane extending into horizon fog
    const groundGeo = new THREE.PlaneGeometry(180, 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.04,
    });
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Arena boundary ring
    const ringGeo = new THREE.RingGeometry(1, 1.04, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.arenaRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.arenaRingMesh.rotation.x = -Math.PI / 2;
    this.arenaRingMesh.position.y = 0.03;
    this.scene.add(this.arenaRingMesh);

    // Ground aim reticle
    const reticleGeo = new THREE.RingGeometry(0.45, 0.62, 24);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    this.aimReticle = new THREE.Mesh(reticleGeo, reticleMat);
    this.aimReticle.rotation.x = -Math.PI / 2;
    this.aimReticle.position.y = 0.05;
    this.aimReticle.visible = false;
    this.scene.add(this.aimReticle);

    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);

    // Hero & Blackout Tactical Flashlight + Shopkeeper rigs
    this.playerRig = createPlayerModel(this.shadowTex);
    this.scene.add(this.playerRig.root);

    this.playerFlashlight = new THREE.SpotLight(
      0xe0f2fe,
      0,
      28,
      Math.PI / 4.2,
      0.55,
      1.2
    );
    this.playerFlashlight.position.set(0, 2.2, 0.2);
    this.playerFlashlight.target.position.set(0, 0.2, 9);
    this.playerRig.root.add(this.playerFlashlight);
    this.playerRig.root.add(this.playerFlashlight.target);

    this.playerLantern = new THREE.PointLight(0x93c5fd, 0, 10, 1.4);
    this.playerLantern.position.set(0, 2.1, 0);
    this.playerRig.root.add(this.playerLantern);

    this.shopkeeperRig = createShopkeeperStall(this.shadowTex);
    this.shopkeeperRig.root.visible = false;
    this.scene.add(this.shopkeeperRig.root);

    // Pre-allocate projectile pool (zero GC during combat)
    const playerProjGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const enemyProjGeo = new THREE.SphereGeometry(0.24, 8, 8);

    for (let i = 0; i < 144; i++) {
      const fromPlayer = i < 100;
      const mat = new THREE.MeshBasicMaterial({
        color: fromPlayer ? 0x38bdf8 : 0xf43f5e,
      });
      const mesh = new THREE.Mesh(
        fromPlayer ? playerProjGeo : enemyProjGeo,
        mat
      );
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromPlayer,
        pierce: false,
        hitIds: new Set<string>(),
        mesh,
        x: 0,
        y: 1.0,
        z: 0,
        vx: 0,
        vz: 0,
        damage: 0,
        life: 0,
      });
    }

    // Pre-allocate particle pool
    const partGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    for (let i = 0; i < 72; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const mesh = new THREE.Mesh(partGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        active: false,
        mesh,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
      });
    }

    // Build initial Level 1 scene for atmospheric live backdrop on Title Screen
    this.buildLevelScene(1);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHudState();
    this.startLoop();
  }

  private loadSavedStats(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { bestLevel?: number };
        if (typeof parsed.bestLevel === 'number' && parsed.bestLevel >= 1) {
          this.bestLevel = Math.min(100, parsed.bestLevel);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveStats(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ bestLevel: this.bestLevel })
      );
    } catch {
      // Ignore storage errors
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.renderer.domElement.addEventListener(
      'pointermove',
      this.handlePointerMove
    );
    this.renderer.domElement.addEventListener(
      'pointerdown',
      this.handlePointerDown
    );
    window.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.handleContextLost
    );
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.renderer.domElement.removeEventListener(
      'pointermove',
      this.handlePointerMove
    );
    this.renderer.domElement.removeEventListener(
      'pointerdown',
      this.handlePointerDown
    );
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleBlur = (): void => {
    this.heldKeys.clear();
    this.pointerDown = false;
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  };

  private handleContextRestored = (): void => {
    if (!this.disposed) {
      this.startLoop();
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (
      [
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ].includes(e.code)
    ) {
      if (this.phase === 'playing' || this.phase === 'title') {
        e.preventDefault();
      }
    }

    if (e.repeat) {
      this.heldKeys.add(e.code);
      return;
    }
    this.heldKeys.add(e.code);

    if (e.code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (this.phase === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        this.startNewGame();
      }
      return;
    }

    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (this.phase === 'playing') {
        this.pauseGame();
      } else if (this.phase === 'paused') {
        this.resumeGame();
      }
      return;
    }

    if (this.phase === 'playing') {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.triggerDash();
      } else if (e.code === 'Digit1') {
        this.useHealingItem('bandage');
      } else if (e.code === 'Digit2') {
        this.useHealingItem('medkit');
      } else if (e.code === 'KeyE') {
        this.cycleGun();
      } else if (e.code === 'KeyF') {
        this.triggerMeleeBash();
      } else if (e.code === 'Space' || e.code === 'KeyJ') {
        this.triggerPrimaryAttack();
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.hasMouseMoved = true;
    this.updateAimFromMouse();
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    soundEngine.unlock();
    this.handlePointerMove(e);
    if (this.phase === 'playing') {
      this.pointerDown = true;
      this.triggerPrimaryAttack();
    }
  };

  private handlePointerUp = (): void => {
    this.pointerDown = false;
  };

  private updateAimFromMouse(): void {
    _raycaster.setFromCamera(_mouseNdc, this.camera);
    if (_raycaster.ray.intersectPlane(_groundPlane, _vec3A)) {
      this.aimWorldX = _vec3A.x;
      this.aimWorldZ = _vec3A.z;
    }
  }

  private applyEquippedGunVisual(): void {
    if (!this.activeGun) {
      this.playerRig.gunGroup.visible = false;
      return;
    }
    const def = GUN_DEFS[this.activeGun];
    this.playerRig.gunGroup.visible = true;
    this.playerRig.gunRailMat.color.setHex(def.colorHex);
    this.playerRig.gunRailMat.emissive.setHex(def.colorHex);
    // Distinct barrel silhouette per gun
    if (this.activeGun === 'shotgun') {
      this.playerRig.gunBarrel.scale.set(1.6, 1.0, 0.85);
    } else if (this.activeGun === 'railgun') {
      this.playerRig.gunBarrel.scale.set(0.9, 1.5, 1.35);
    } else if (this.activeGun === 'plasma') {
      this.playerRig.gunBarrel.scale.set(1.25, 1.25, 1.15);
    } else {
      this.playerRig.gunBarrel.scale.set(1.0, 1.0, 1.0);
    }
  }

  public cycleGun(): void {
    if (this.ownedGuns.length === 0) {
      this.showToast('Buy a gun from the shopkeeper first!');
      return;
    }
    if (this.ownedGuns.length === 1) {
      this.showToast(`Equipped: ${GUN_DEFS[this.ownedGuns[0]].name}`);
      return;
    }
    const idx = this.activeGun ? this.ownedGuns.indexOf(this.activeGun) : -1;
    const nextIdx = (idx + 1) % this.ownedGuns.length;
    this.activeGun = this.ownedGuns[nextIdx];
    this.applyEquippedGunVisual();
    soundEngine.playWeaponSwitch();
    this.showToast(`Switched Gun: ${GUN_DEFS[this.activeGun].name}`);
    this.emitHudState();
  }

  // Public Game Actions
  public startNewGame(): void {
    soundEngine.unlock();
    this.level = 1;
    this.hearts = this.maxHearts;
    this.playerCoins = 0;
    this.ownedGuns = [];
    this.activeGun = null;
    this.clonesCount = 0;
    this.bandages = 0;
    this.medkits = 0;
    this.enemiesDefeatedTotal = 0;
    this.totalCoinsCollected = 0;
    this.levelClearTransitionTimer = 0;
    this.statusToast = null;

    this.buildLevelScene(1);
    this.phase = 'playing';
    this.aimReticle.visible = true;
    this.emitHudState();
  }

  public retryCurrentLevel(): void {
    soundEngine.unlock();
    this.hearts = this.maxHearts;
    this.levelClearTransitionTimer = 0;
    this.buildLevelScene(this.level);
    this.phase = 'playing';
    this.aimReticle.visible = true;
    this.emitHudState();
  }

  public returnToTitle(): void {
    this.heldKeys.clear();
    this.pointerDown = false;
    this.ownedGuns = [];
    this.activeGun = null;
    this.clonesCount = 0;
    this.buildLevelScene(1);
    this.phase = 'title';
    this.aimReticle.visible = false;
    this.emitHudState();
  }

  public pauseGame(): void {
    if (this.phase === 'playing') {
      this.heldKeys.clear();
      this.pointerDown = false;
      this.phase = 'paused';
      this.emitHudState();
    }
  }

  public resumeGame(): void {
    if (this.phase === 'paused') {
      this.clock.getDelta();
      this.phase = 'playing';
      this.emitHudState();
    }
  }

  public toggleMute(): void {
    const next = !soundEngine.isMuted();
    soundEngine.setMuted(next);
    this.emitHudState();
  }

  private grantGun(gunId: GunId): void {
    if (!this.ownedGuns.includes(gunId)) {
      this.ownedGuns.push(gunId);
      // Keep canonical order for clean cycling
      this.ownedGuns.sort(
        (a, b) => GUN_ORDER.indexOf(a) - GUN_ORDER.indexOf(b)
      );
    }
    this.activeGun = gunId;
    this.applyEquippedGunVisual();
  }

  public buyShopItem(itemId: ShopItemId): boolean {
    if (this.phase !== 'shop') return false;
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) return false;
    if (this.level < item.minShopLevel) return false;
    if (this.playerCoins < item.cost) {
      this.showToast('Not enough coins!');
      return false;
    }

    if (
      itemId === 'gun' ||
      itemId === 'shotgun' ||
      itemId === 'plasma' ||
      itemId === 'railgun'
    ) {
      const gunId: GunId = itemId === 'gun' ? 'blaster' : itemId;
      if (this.ownedGuns.includes(gunId)) {
        this.showToast(`You already own the ${GUN_DEFS[gunId].name}!`);
        return false;
      }
      this.playerCoins -= item.cost;
      this.grantGun(gunId);
      soundEngine.playPurchase();
      const extraHint =
        this.ownedGuns.length > 1
          ? ' Press E in combat to switch guns!'
          : ' Left-click or Space to shoot.';
      this.showToast(`${GUN_DEFS[gunId].name} equipped!${extraHint}`);
      this.emitHudState();
      return true;
    }

    if (itemId === 'clone') {
      if (this.clonesCount >= MAX_CLONES) {
        this.showToast(`Maximum ${MAX_CLONES} clones active!`);
        return false;
      }
      this.playerCoins -= item.cost;
      this.clonesCount += 1;
      this.spawnCloneEntity(this.clonesCount - 1);
      soundEngine.playPurchase();
      this.showToast(
        `Clone Ally #${this.clonesCount} deployed! They will fight alongside you.`
      );
      this.emitHudState();
      return true;
    }

    if (itemId === 'bandage') {
      this.playerCoins -= item.cost;
      if (this.hearts < this.maxHearts) {
        this.hearts = Math.min(this.maxHearts, this.hearts + 1);
        soundEngine.playHeal();
        this.showToast('Bandage used: +1 Heart restored!');
      } else {
        this.bandages += 1;
        soundEngine.playPurchase();
        this.showToast('Bandage stored in pouch (Press 1 in combat).');
      }
      this.emitHudState();
      return true;
    }

    if (itemId === 'medkit') {
      this.playerCoins -= item.cost;
      if (this.hearts < this.maxHearts) {
        this.hearts = Math.min(this.maxHearts, this.hearts + 2);
        soundEngine.playHeal();
        this.showToast('Medkit used: +2 Hearts restored!');
      } else {
        this.medkits += 1;
        soundEngine.playPurchase();
        this.showToast('Medkit stored in pouch (Press 2 in combat).');
      }
      this.emitHudState();
      return true;
    }

    return false;
  }

  public useHealingItem(kind: 'bandage' | 'medkit'): boolean {
    if (this.phase !== 'playing' && this.phase !== 'shop') return false;
    if (this.hearts >= this.maxHearts) {
      this.showToast('Health is already full!');
      return false;
    }
    if (kind === 'bandage') {
      if (this.bandages <= 0) return false;
      this.bandages -= 1;
      this.hearts = Math.min(this.maxHearts, this.hearts + 1);
      soundEngine.playHeal();
      this.spawnBurst(this.playerX, 1.1, this.playerZ, 0x22c55e, 14);
      this.showToast('Bandage used! +1 Heart');
      this.emitHudState();
      return true;
    }
    if (kind === 'medkit') {
      if (this.medkits <= 0) return false;
      this.medkits -= 1;
      this.hearts = Math.min(this.maxHearts, this.hearts + 2);
      soundEngine.playHeal();
      this.spawnBurst(this.playerX, 1.1, this.playerZ, 0x10b981, 18);
      this.showToast('Medkit used! +2 Hearts');
      this.emitHudState();
      return true;
    }
    return false;
  }

  public proceedToNextLevel(): void {
    if (this.phase !== 'shop') return;
    if (this.level >= 100) return;

    this.level += 1;
    if (this.level > this.bestLevel) {
      this.bestLevel = this.level;
      this.saveStats();
    }

    this.buildLevelScene(this.level);
    this.phase = 'playing';
    this.aimReticle.visible = true;
    this.emitHudState();
  }

  private showToast(msg: string): void {
    this.statusToast = msg;
    this.statusToastTimer = 2.6;
  }

  private clearLevelScene(): void {
    for (const enemy of this.enemies) {
      this.levelGroup.remove(enemy.rig.root);
    }
    this.enemies = [];

    for (const clone of this.clones) {
      this.levelGroup.remove(clone.rig.root);
    }
    this.clones = [];

    for (const coin of this.coins) {
      this.levelGroup.remove(coin.mesh);
    }
    this.coins = [];

    while (this.levelGroup.children.length > 0) {
      const child = this.levelGroup.children[0];
      this.levelGroup.remove(child);
    }
    this.obstacles = [];

    if (this.perimeterInstanced) {
      this.perimeterInstanced.geometry.dispose();
      (this.perimeterInstanced.material as THREE.Material).dispose();
      this.perimeterInstanced = null;
    }

    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
      p.hitIds.clear();
    }
    for (const pt of this.particles) {
      pt.active = false;
      pt.mesh.visible = false;
    }

    this.shopkeeperRig.root.visible = false;
  }

  private spawnCloneEntity(slotIndex: number): void {
    const rig = createCloneModel(this.shadowTex);
    const isOuter = slotIndex >= 6;
    const ringRadius = isOuter ? 4.0 : 2.5;
    const ringPos = isOuter ? slotIndex - 6 : slotIndex;
    const ringCap = isOuter ? 9 : 6;
    const angle = (ringPos / ringCap) * Math.PI * 2 + 0.8;
    const cx = this.playerX + Math.cos(angle) * ringRadius;
    const cz = this.playerZ + Math.sin(angle) * ringRadius;
    rig.root.position.set(cx, 0, cz);
    this.levelGroup.add(rig.root);
    this.clones.push({
      rig,
      x: cx,
      z: cz,
      vx: 0,
      vz: 0,
      yaw: this.playerYaw,
      walkPhase: slotIndex * 1.4,
      fireCooldown: 0.35 + (slotIndex % 5) * 0.15,
      slotIndex,
    });
  }

  private applyBlackoutLighting(isBlackout: boolean, biome: LevelConfig['biome']): void {
    if (isBlackout) {
      this.scene.background = new THREE.Color(0x030612);
      this.scene.fog = new THREE.FogExp2(0x030612, 0.046);
      this.keyLight.color.setHex(0x64748b);
      this.keyLight.intensity = 0.14;
      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x020617);
      this.hemiLight.intensity = 0.16;
      this.rimLight.intensity = 0.12;
      this.playerFlashlight.intensity = 18.0;
      this.playerLantern.intensity = 4.2;
      this.renderer.toneMappingExposure = 1.0;
    } else {
      this.scene.background = new THREE.Color(biome.skyColor);
      this.scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
      this.keyLight.color.set(biome.keyLightColor);
      this.keyLight.intensity = biome.keyLightIntensity;
      this.hemiLight.color.set(biome.hemiSkyColor);
      this.hemiLight.groundColor.set(biome.hemiGroundColor);
      this.hemiLight.intensity = 0.72;
      this.rimLight.intensity = 0.55;
      this.playerFlashlight.intensity = 0;
      this.playerLantern.intensity = 0;
      this.renderer.toneMappingExposure = 1.1;
    }
  }

  private buildLevelScene(levelNum: number): void {
    this.clearLevelScene();
    const cfg = generateLevel(levelNum);
    this.levelConfig = cfg;
    const { biome, arenaRadius, isBlackout } = cfg;

    this.applyBlackoutLighting(isBlackout, biome);

    // Ground procedural texture
    if (this.currentGroundTex) {
      this.currentGroundTex.dispose();
    }
    this.currentGroundTex = createGroundTexture(
      biome.groundPrimary,
      biome.groundSecondary,
      biome.groundAccent,
      levelNum * 13,
      this.maxAnisotropy
    );
    const groundMat = this.groundMesh.material as THREE.MeshStandardMaterial;
    groundMat.map = this.currentGroundTex;
    groundMat.needsUpdate = true;

    // Arena ring scale
    this.arenaRingMesh.scale.setScalar(arenaRadius);
    const ringMat = this.arenaRingMesh.material as THREE.MeshStandardMaterial;
    ringMat.color.set(biome.accentGlow);
    ringMat.emissive.set(biome.accentGlow);

    // Natural outdoor perimeter ring using InstancedMesh
    const count = 64;
    const perimeterGeo =
      biome.propPrimary === 'pillar'
        ? new THREE.CylinderGeometry(0.9, 1.15, 4.8, 8)
        : biome.propPrimary === 'crystal' || biome.propPrimary === 'obsidian'
          ? new THREE.ConeGeometry(1.4, 5.2, 6)
          : new THREE.DodecahedronGeometry(1.6, 0);
    const perimeterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.12,
    });
    const instanced = new THREE.InstancedMesh(perimeterGeo, perimeterMat, count);
    instanced.castShadow = !this.isSoftwareGl;
    instanced.receiveShadow = true;

    const baseColorA = new THREE.Color(biome.propColorA);
    const baseColorB = new THREE.Color(biome.propColorB);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = arenaRadius + 2.4 + (i % 3) * 1.65;
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;
      const sc = 0.85 + ((i * 37) % 30) / 100;
      const heightOffset =
        biome.propPrimary === 'pillar'
          ? 2.4 * sc
          : biome.propPrimary === 'crystal' || biome.propPrimary === 'obsidian'
            ? 2.4 * sc
            : 1.15 * sc;

      _dummy.position.set(px, heightOffset, pz);
      _dummy.rotation.set(0, angle + i * 0.4, 0);
      _dummy.scale.set(sc, sc * (1.0 + (i % 3) * 0.18), sc);
      _dummy.updateMatrix();
      instanced.setMatrixAt(i, _dummy.matrix);

      _color.copy(i % 2 === 0 ? baseColorA : baseColorB);
      _color.offsetHSL(0, 0, ((i % 5) - 2) * 0.03);
      instanced.setColorAt(i, _color);
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    instanced.computeBoundingSphere();
    this.perimeterInstanced = instanced;
    this.levelGroup.add(instanced);

    // Interior cover obstacles
    for (const spec of cfg.obstacles) {
      const propMesh = createObstacleProp(
        spec.kind,
        spec.scale,
        biome.propColorA,
        biome.propColorB,
        this.shadowTex
      );
      propMesh.position.set(spec.x, 0, spec.z);
      propMesh.rotation.y = spec.rotation;
      this.levelGroup.add(propMesh);
      this.obstacles.push({
        x: spec.x,
        z: spec.z,
        radius: spec.radius,
        mesh: propMesh,
      });
    }

    // Spawn collectible coins
    for (const c of cfg.coins) {
      this.spawnCoin(c);
    }

    // Spawn enemies
    for (const eSpec of cfg.enemies) {
      const rig = createEnemyModel(
        eSpec.archetype,
        eSpec.colorHex,
        eSpec.accentHex,
        eSpec.scale,
        this.shadowTex
      );
      rig.root.position.set(eSpec.x, 0, eSpec.z);
      this.levelGroup.add(rig.root);

      this.enemies.push({
        id: eSpec.id,
        archetype: eSpec.archetype,
        rig,
        x: eSpec.x,
        z: eSpec.z,
        vx: 0,
        vz: 0,
        hp: eSpec.maxHp,
        maxHp: eSpec.maxHp,
        speed: eSpec.speed,
        scale: eSpec.scale,
        coinDrop: eSpec.coinDrop,
        isBoss: eSpec.isBoss,
        bossName: eSpec.bossName,
        attackCooldown: eSpec.attackCooldown,
        cooldownTimer: 0.7 + Math.random() * 0.7,
        windupTimer: 0,
        windupDuration:
          levelNum > 20
            ? eSpec.archetype === 'brute'
              ? 0.48
              : 0.34
            : eSpec.archetype === 'brute'
              ? 0.65
              : 0.45,
        dashTimer: 0,
        dashDirX: 0,
        dashDirZ: 1,
        hitFlashTimer: 0,
        walkPhase: Math.random() * Math.PI * 2,
        patternCounter: 0,
      });
    }

    // Reset player at center-south spawn
    this.playerX = 0;
    this.playerZ = Math.min(6.5, arenaRadius * 0.35);
    this.playerVx = 0;
    this.playerVz = 0;
    this.playerYaw = Math.PI;
    this.playerInvulnTimer = 0.75;
    this.attackCooldownTimer = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.aimWorldX = 0;
    this.aimWorldZ = -4;

    this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.applyEquippedGunVisual();

    // Spawn purchased Clones alongside player
    for (let i = 0; i < this.clonesCount; i++) {
      this.spawnCloneEntity(i);
    }

    if (isBlackout) {
      this.showToast('Blackout Level! Flashlight active.');
    }

    // Position camera directly centered behind & above player (2x zoomed in)
    this.camX = this.playerX;
    this.camY = 6.95;
    this.camZ = this.playerZ + 6.0;
    this.camLookX = this.playerX;
    this.camLookY = 0.9;
    this.camLookZ = this.playerZ;
    this.camera.position.set(this.camX, this.camY, this.camZ);
    this.camera.lookAt(this.camLookX, this.camLookY, this.camLookZ);
    this.keyLight.position.set(this.playerX + 18, 28, this.playerZ + 16);
    this.keyLight.target.position.set(this.playerX, 0, this.playerZ);
  }

  private spawnCoin(spec: CoinSpawnSpec): void {
    const mesh = createCoinMesh(this.shadowTex);
    mesh.position.set(spec.x, 0, spec.z);
    this.levelGroup.add(mesh);
    this.coins.push({
      id: spec.id,
      mesh,
      x: spec.x,
      z: spec.z,
      value: spec.value,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  private triggerDash(): void {
    if (this.dashCooldownTimer > 0 || this.dashTimer > 0) return;

    let dx = 0;
    let dz = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) dz -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) dz += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) dx -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) dx += 1;

    if (dx === 0 && dz === 0) {
      dx = Math.sin(this.playerYaw);
      dz = Math.cos(this.playerYaw);
    } else {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
    }

    this.dashDirX = dx;
    this.dashDirZ = dz;
    this.dashTimer = 0.16;
    this.dashCooldownTimer = 0.95;
    this.playerInvulnTimer = Math.max(this.playerInvulnTimer, 0.22);
    soundEngine.playDash();
    this.spawnBurst(this.playerX, 0.5, this.playerZ, 0x93c5fd, 8);
  }

  private getAimDirection(outVec: THREE.Vector3): THREE.Vector3 {
    if (this.hasMouseMoved) {
      const dx = this.aimWorldX - this.playerX;
      const dz = this.aimWorldZ - this.playerZ;
      const len = Math.hypot(dx, dz);
      if (len > 0.15) {
        return outVec.set(dx / len, 0, dz / len);
      }
    }
    let nearest: ActiveEnemy | null = null;
    let bestDist = Infinity;
    for (const enemy of this.enemies) {
      const d = Math.hypot(enemy.x - this.playerX, enemy.z - this.playerZ);
      if (d < bestDist) {
        bestDist = d;
        nearest = enemy;
      }
    }
    if (nearest) {
      const dx = nearest.x - this.playerX;
      const dz = nearest.z - this.playerZ;
      const len = Math.hypot(dx, dz) || 1;
      return outVec.set(dx / len, 0, dz / len);
    }
    return outVec.set(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
  }

  private triggerPrimaryAttack(): void {
    if (this.attackCooldownTimer > 0) return;
    if (this.activeGun) {
      this.firePlayerGun();
    } else {
      this.triggerMeleeBash();
    }
  }

  private spawnPlayerBolt(
    sx: number,
    sz: number,
    dx: number,
    dz: number,
    speed: number,
    damage: number,
    colorHex: number,
    pierce: boolean,
    scale = 1.0
  ): void {
    const proj = this.projectiles.find((p) => !p.active && p.fromPlayer);
    if (!proj) return;
    proj.active = true;
    proj.pierce = pierce;
    proj.hitIds.clear();
    proj.x = sx;
    proj.y = 1.08;
    proj.z = sz;
    proj.vx = dx * speed;
    proj.vz = dz * speed;
    proj.damage = damage;
    proj.life = pierce ? 1.4 : 1.2;
    (proj.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    proj.mesh.scale.setScalar(scale);
    proj.mesh.position.set(proj.x, proj.y, proj.z);
    proj.mesh.visible = true;
  }

  private firePlayerGun(): void {
    if (!this.activeGun) return;
    const gun = GUN_DEFS[this.activeGun];
    this.attackCooldownTimer = gun.cooldown;
    const dir = this.getAimDirection(_vec3B);
    this.playerYaw = Math.atan2(dir.x, dir.z);

    const spawnX = this.playerX + dir.x * 0.95;
    const spawnZ = this.playerZ + dir.z * 0.95;
    const baseAngle = Math.atan2(dir.z, dir.x);
    const dmgBonus = Math.floor(this.level * 0.45);

    for (let i = 0; i < gun.pellets; i++) {
      const offset =
        gun.pellets === 1
          ? (Math.random() - 0.5) * gun.spread
          : ((i / (gun.pellets - 1)) - 0.5) * gun.spread;
      const angle = baseAngle + offset;
      this.spawnPlayerBolt(
        spawnX,
        spawnZ,
        Math.cos(angle),
        Math.sin(angle),
        gun.speed,
        gun.damage + dmgBonus,
        gun.colorHex,
        gun.pierce,
        gun.id === 'railgun' ? 1.45 : gun.id === 'shotgun' ? 0.85 : 1.0
      );
    }

    this.shakeIntensity = Math.max(
      this.shakeIntensity,
      gun.id === 'railgun' || gun.id === 'shotgun' ? 0.16 : 0.08
    );
    soundEngine.playShoot();
    this.spawnBurst(spawnX, 1.08, spawnZ, gun.colorHex, 5);
  }

  private triggerMeleeBash(): void {
    if (this.attackCooldownTimer > 0) return;
    this.attackCooldownTimer = 0.34;
    this.meleeSlashTimer = 0.18;

    const dir = this.getAimDirection(_vec3B);
    this.playerYaw = Math.atan2(dir.x, dir.z);
    soundEngine.playMelee();

    const meleeDamage = 26 + Math.floor(this.level * 0.5);
    const reach = 3.25;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dx = enemy.x - this.playerX;
      const dz = enemy.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= reach + enemy.scale * 0.65) {
        const nx = dist > 0.01 ? dx / dist : dir.x;
        const nz = dist > 0.01 ? dz / dist : dir.z;
        const dot = nx * dir.x + nz * dir.z;
        if (dot > -0.25 || dist < 1.7) {
          this.damageEnemy(enemy, meleeDamage, nx * 8, nz * 8);
        }
      }
    }
  }

  private damageEnemy(
    enemy: ActiveEnemy,
    amount: number,
    knockX: number,
    knockZ: number
  ): void {
    enemy.hp -= amount;
    enemy.hitFlashTimer = 0.11;
    enemy.vx += knockX / enemy.scale;
    enemy.vz += knockZ / enemy.scale;
    enemy.rig.hpBarGroup.visible = true;

    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    enemy.rig.hpBarFill.scale.x = Math.max(0.001, ratio);

    this.spawnBurst(enemy.x, 1.1 * enemy.scale, enemy.z, 0xfbbf24, 7);

    if (enemy.hp <= 0) {
      this.defeatEnemy(enemy);
    } else {
      soundEngine.playEnemyHit();
    }
  }

  private defeatEnemy(enemy: ActiveEnemy): void {
    const idx = this.enemies.indexOf(enemy);
    if (idx === -1) return;
    this.enemies.splice(idx, 1);
    this.levelGroup.remove(enemy.rig.root);

    this.enemiesDefeatedTotal += 1;
    this.hitstopTimer = enemy.isBoss ? 0.07 : 0.032;
    this.shakeIntensity = Math.max(
      this.shakeIntensity,
      enemy.isBoss ? 0.55 : 0.22
    );
    soundEngine.playEnemyDefeat();

    this.spawnBurst(
      enemy.x,
      1.1 * enemy.scale,
      enemy.z,
      enemy.isBoss ? 0xfbbf24 : 0xef4444,
      enemy.isBoss ? 28 : 14
    );

    const drops = Math.min(8, enemy.coinDrop);
    const valPerCoin = Math.max(1, Math.round(enemy.coinDrop / drops));
    for (let i = 0; i < drops; i++) {
      const a = (i / drops) * Math.PI * 2 + Math.random() * 0.4;
      const r = drops === 1 ? 0 : 0.75 + Math.random() * 0.9;
      this.spawnCoin({
        id: `drop-${enemy.id}-${i}-${this.elapsed}`,
        x: THREE.MathUtils.clamp(
          enemy.x + Math.cos(a) * r,
          -this.levelConfig.arenaRadius + 1,
          this.levelConfig.arenaRadius - 1
        ),
        z: THREE.MathUtils.clamp(
          enemy.z + Math.sin(a) * r,
          -this.levelConfig.arenaRadius + 1,
          this.levelConfig.arenaRadius - 1
        ),
        value: valPerCoin,
      });
    }

    if (this.enemies.length === 0) {
      this.onAllEnemiesDefeated();
    } else {
      this.emitHudState();
    }
  }

  private onAllEnemiesDefeated(): void {
    for (const coin of this.coins) {
      if (!coin.collected) {
        coin.collected = true;
        this.levelGroup.remove(coin.mesh);
        this.playerCoins += coin.value;
        this.totalCoinsCollected += coin.value;
      }
    }
    this.coins = [];

    if (this.level >= 100) {
      this.bestLevel = 100;
      this.saveStats();
      this.phase = 'victory';
      this.aimReticle.visible = false;
      this.heldKeys.clear();
      this.pointerDown = false;
      soundEngine.playVictoryFanfare();
      this.emitHudState();
      return;
    }

    // Restore arena visibility so the player can clearly see the Shopkeeper on blackout levels
    if (this.levelConfig.isBlackout) {
      this.applyBlackoutLighting(false, this.levelConfig.biome);
    }

    soundEngine.playLevelClear();
    this.levelClearTransitionTimer = 1.05;
    this.aimReticle.visible = false;
    this.heldKeys.clear();
    this.pointerDown = false;

    this.shopkeeperRig.root.position.set(0, 0, -4.5);
    this.shopkeeperRig.root.visible = true;
    this.spawnBurst(0, 1.5, -4.5, 0xfbbf24, 20);
    this.emitHudState();
  }

  private hurtPlayer(): void {
    if (this.playerInvulnTimer > 0 || this.phase !== 'playing') return;
    this.hearts = Math.max(0, this.hearts - 1);
    this.playerInvulnTimer = 1.15;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.45);
    this.hitstopTimer = 0.045;
    soundEngine.playPlayerHurt();
    this.spawnBurst(this.playerX, 1.1, this.playerZ, 0xef4444, 14);

    if (this.hearts <= 0) {
      this.phase = 'gameover';
      this.aimReticle.visible = false;
      this.heldKeys.clear();
      this.pointerDown = false;
    }
    this.emitHudState();
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number
  ): void {
    let spawned = 0;
    for (const pt of this.particles) {
      if (pt.active) continue;
      pt.active = true;
      pt.x = x;
      pt.y = y;
      pt.z = z;
      const angle = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 5.5;
      pt.vx = Math.cos(angle) * spd;
      pt.vy = 2.5 + Math.random() * 4.5;
      pt.vz = Math.sin(angle) * spd;
      pt.maxLife = 0.32 + Math.random() * 0.26;
      pt.life = pt.maxLife;
      (pt.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      pt.mesh.position.set(x, y, z);
      pt.mesh.scale.setScalar(1);
      pt.mesh.visible = true;
      spawned++;
      if (spawned >= count) break;
    }
  }

  private spawnEnemyOrb(
    sx: number,
    sz: number,
    dx: number,
    dz: number,
    speed: number
  ): void {
    const proj = this.projectiles.find((p) => !p.active && !p.fromPlayer);
    if (!proj) return;
    proj.active = true;
    proj.pierce = false;
    proj.hitIds.clear();
    proj.x = sx;
    proj.y = 1.08;
    proj.z = sz;
    proj.vx = dx * speed;
    proj.vz = dz * speed;
    proj.damage = 1;
    proj.life = 2.8;
    proj.mesh.scale.setScalar(1);
    proj.mesh.position.set(proj.x, proj.y, proj.z);
    proj.mesh.visible = true;
  }

  private resolveArenaAndObstacleCollision(
    x: number,
    z: number,
    entityRadius: number
  ): { x: number; z: number } {
    let nx = x;
    let nz = z;

    for (const obs of this.obstacles) {
      const dx = nx - obs.x;
      const dz = nz - obs.z;
      const dist = Math.hypot(dx, dz);
      const minDist = obs.radius + entityRadius;
      if (dist < minDist) {
        if (dist > 0.001) {
          const push = minDist - dist;
          nx += (dx / dist) * push;
          nz += (dz / dist) * push;
        } else {
          nx += minDist;
        }
      }
    }

    const maxR = this.levelConfig.arenaRadius - entityRadius;
    const distFromCenter = Math.hypot(nx, nz);
    if (distFromCenter > maxR && distFromCenter > 0.001) {
      nx = (nx / distFromCenter) * maxR;
      nz = (nz / distFromCenter) * maxR;
    }

    return { x: nx, z: nz };
  }

  private updateSimulation(dt: number): void {
    this.elapsed += dt;

    if (this.statusToastTimer > 0) {
      this.statusToastTimer -= dt;
      if (this.statusToastTimer <= 0) {
        this.statusToast = null;
        this.emitHudState();
      }
    }

    this.updateCoins(dt);
    this.updateParticles(dt);

    if (this.phase === 'title') {
      const angle = this.elapsed * 0.22;
      const r = 17.5;
      this.camera.position.set(Math.cos(angle) * r, 10.5, Math.sin(angle) * r);
      this.camera.lookAt(0, 1.0, 0);
      this.playerRig.bodyPivot.position.y = Math.sin(this.elapsed * 2.2) * 0.04;
      for (const enemy of this.enemies) {
        enemy.rig.bodyPivot.position.y =
          Math.sin(this.elapsed * 2.5 + enemy.walkPhase) * 0.06;
        for (const ring of enemy.rig.orbitRings) {
          ring.rotation.y += dt * 1.8;
        }
      }
      return;
    }

    if (this.phase === 'paused' || this.phase === 'gameover') {
      return;
    }

    if (this.phase === 'victory') {
      this.victoryFireworkTimer -= dt;
      if (this.victoryFireworkTimer <= 0) {
        this.victoryFireworkTimer = 0.38;
        const a = Math.random() * Math.PI * 2;
        const d = 2 + Math.random() * 8;
        this.spawnBurst(
          Math.cos(a) * d,
          2.2 + Math.random() * 2.5,
          Math.sin(a) * d,
          Math.random() > 0.5 ? 0xfbbf24 : 0x38bdf8,
          16
        );
      }
      const angle = this.elapsed * 0.35;
      this.camera.position.set(
        this.playerX + Math.cos(angle) * 11,
        6.5,
        this.playerZ + Math.sin(angle) * 11
      );
      this.camera.lookAt(this.playerX, 1.3, this.playerZ);
      return;
    }

    if (this.phase === 'shop') {
      this.shopkeeperRig.staffArm.rotation.x =
        Math.sin(this.elapsed * 3.5) * 0.25;
      this.shopkeeperRig.keeperGroup.position.y =
        Math.sin(this.elapsed * 2.5) * 0.04;

      const targetCamX = 0;
      const targetCamY = 4.6;
      const targetCamZ = 3.2;
      this.camX = THREE.MathUtils.damp(this.camX, targetCamX, 5, dt);
      this.camY = THREE.MathUtils.damp(this.camY, targetCamY, 5, dt);
      this.camZ = THREE.MathUtils.damp(this.camZ, targetCamZ, 5, dt);
      this.camLookX = THREE.MathUtils.damp(this.camLookX, 0, 5, dt);
      this.camLookY = THREE.MathUtils.damp(this.camLookY, 1.4, 5, dt);
      this.camLookZ = THREE.MathUtils.damp(this.camLookZ, -4.2, 5, dt);
      this.camera.position.set(this.camX, this.camY, this.camZ);
      this.camera.lookAt(this.camLookX, this.camLookY, this.camLookZ);
      return;
    }

    if (this.levelClearTransitionTimer > 0) {
      this.levelClearTransitionTimer -= dt;
      this.shopkeeperRig.staffArm.rotation.x =
        Math.sin(this.elapsed * 4) * 0.25;
      this.camX = THREE.MathUtils.damp(this.camX, 0, 4.5, dt);
      this.camY = THREE.MathUtils.damp(this.camY, 7.5, 4.5, dt);
      this.camZ = THREE.MathUtils.damp(this.camZ, 7.5, 4.5, dt);
      this.camera.position.set(this.camX, this.camY, this.camZ);
      this.camera.lookAt(0, 1.2, -3.5);
      if (this.levelClearTransitionTimer <= 0) {
        this.phase = 'shop';
        this.emitHudState();
      }
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    this.updatePlayer(dt);
    this.updateClones(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateCamera(dt);

    if (this.elapsed - this.lastHudSync > 0.1) {
      this.lastHudSync = this.elapsed;
      this.emitHudState();
    }
  }

  private updatePlayer(dt: number): void {
    if (this.playerInvulnTimer > 0) this.playerInvulnTimer -= dt;
    if (this.attackCooldownTimer > 0) this.attackCooldownTimer -= dt;
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer -= dt;

    if (this.meleeSlashTimer > 0) {
      this.meleeSlashTimer -= dt;
      const mat = this.playerRig.meleeSlashArc
        .material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (this.meleeSlashTimer / 0.18) * 0.85);
      this.playerRig.meleeSlashArc.scale.setScalar(
        1.0 + (1 - this.meleeSlashTimer / 0.18) * 0.35
      );
    }

    if (
      this.pointerDown ||
      this.heldKeys.has('Space') ||
      this.heldKeys.has('KeyJ')
    ) {
      this.triggerPrimaryAttack();
    }

    let moveX = 0;
    let moveZ = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) moveZ -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveZ += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft'))
      moveX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight'))
      moveX += 1;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dashSpeed = 20.5;
      this.playerVx = this.dashDirX * dashSpeed;
      this.playerVz = this.dashDirZ * dashSpeed;
    } else {
      const moveSpeed = 8.4;
      const len = Math.hypot(moveX, moveZ);
      const targetVx = len > 0 ? (moveX / len) * moveSpeed : 0;
      const targetVz = len > 0 ? (moveZ / len) * moveSpeed : 0;
      this.playerVx = THREE.MathUtils.damp(this.playerVx, targetVx, 16, dt);
      this.playerVz = THREE.MathUtils.damp(this.playerVz, targetVz, 16, dt);
    }

    const nextPos = this.resolveArenaAndObstacleCollision(
      this.playerX + this.playerVx * dt,
      this.playerZ + this.playerVz * dt,
      0.62
    );
    this.playerX = nextPos.x;
    this.playerZ = nextPos.z;

    if (this.hasMouseMoved) {
      this.updateAimFromMouse();
      this.aimReticle.position.set(this.aimWorldX, 0.05, this.aimWorldZ);
    }
    const aimDir = this.getAimDirection(_vec3C);
    const targetYaw = Math.atan2(aimDir.x, aimDir.z);
    let diff = targetYaw - this.playerYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.playerYaw += diff * Math.min(1, dt * 18);

    this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
    this.playerRig.root.rotation.y = this.playerYaw;

    const speedMag = Math.hypot(this.playerVx, this.playerVz);
    if (speedMag > 0.6) {
      this.playerWalkPhase += dt * speedMag * 1.85;
      const swing = Math.sin(this.playerWalkPhase) * 0.65;
      this.playerRig.leftLeg.rotation.x = swing;
      this.playerRig.rightLeg.rotation.x = -swing;
      this.playerRig.leftArm.rotation.x = -swing * 0.5;
      this.playerRig.bodyPivot.position.y =
        Math.abs(Math.cos(this.playerWalkPhase)) * 0.08;
    } else {
      this.playerRig.leftLeg.rotation.x = THREE.MathUtils.damp(
        this.playerRig.leftLeg.rotation.x,
        0,
        12,
        dt
      );
      this.playerRig.rightLeg.rotation.x = THREE.MathUtils.damp(
        this.playerRig.rightLeg.rotation.x,
        0,
        12,
        dt
      );
      this.playerRig.leftArm.rotation.x = THREE.MathUtils.damp(
        this.playerRig.leftArm.rotation.x,
        0,
        12,
        dt
      );
      this.playerRig.bodyPivot.position.y = Math.sin(this.elapsed * 3) * 0.03;
    }

    if (this.activeGun) {
      const cd = GUN_DEFS[this.activeGun].cooldown;
      const recoil = Math.max(0, this.attackCooldownTimer / cd);
      this.playerRig.rightArm.rotation.x = -recoil * 0.25;
    }

    if (this.playerInvulnTimer > 0) {
      this.playerRig.bodyPivot.visible =
        Math.floor(this.playerInvulnTimer * 18) % 2 === 0;
    } else {
      this.playerRig.bodyPivot.visible = true;
    }
  }

  private updateClones(dt: number): void {
    const innerCount = Math.min(6, this.clones.length);
    const outerCount = Math.max(1, this.clones.length - 6);
    for (const c of this.clones) {
      const isOuter = c.slotIndex >= 6;
      const ringRadius = isOuter ? 4.1 : 2.5;
      const ringTotal = isOuter ? outerCount : innerCount;
      const ringIdx = isOuter ? c.slotIndex - 6 : c.slotIndex;
      const spinDir = isOuter ? -0.55 : 0.75;
      const orbitAngle =
        this.elapsed * spinDir + (ringIdx / Math.max(1, ringTotal)) * Math.PI * 2;
      const targetX = this.playerX + Math.cos(orbitAngle) * ringRadius;
      const targetZ = this.playerZ + Math.sin(orbitAngle) * ringRadius;

      const dx = targetX - c.x;
      const dz = targetZ - c.z;
      const distToSlot = Math.hypot(dx, dz);
      const speed = Math.min(8.5, distToSlot * 3.6);
      const targetVx = distToSlot > 0.1 ? (dx / distToSlot) * speed : 0;
      const targetVz = distToSlot > 0.1 ? (dz / distToSlot) * speed : 0;

      c.vx = THREE.MathUtils.damp(c.vx, targetVx, 10, dt);
      c.vz = THREE.MathUtils.damp(c.vz, targetVz, 10, dt);

      const resolved = this.resolveArenaAndObstacleCollision(
        c.x + c.vx * dt,
        c.z + c.vz * dt,
        0.5
      );
      c.x = resolved.x;
      c.z = resolved.z;
      c.rig.root.position.set(c.x, 0, c.z);

      // Find nearest enemy to aim & shoot
      let nearest: ActiveEnemy | null = null;
      let bestDist = 18;
      for (const e of this.enemies) {
        const ed = Math.hypot(e.x - c.x, e.z - c.z);
        if (ed < bestDist) {
          bestDist = ed;
          nearest = e;
        }
      }

      if (nearest) {
        const edx = nearest.x - c.x;
        const edz = nearest.z - c.z;
        const len = Math.hypot(edx, edz) || 1;
        c.yaw = Math.atan2(edx / len, edz / len);
        c.fireCooldown -= dt;
        if (c.fireCooldown <= 0) {
          c.fireCooldown = 0.68;
          const nx = edx / len;
          const nz = edz / len;
          this.spawnPlayerBolt(
            c.x + nx * 0.7,
            c.z + nz * 0.7,
            nx,
            nz,
            25,
            12 + Math.floor(this.level * 0.35),
            0x34d399,
            false,
            0.88
          );
          this.spawnBurst(c.x + nx * 0.7, 1.0, c.z + nz * 0.7, 0x34d399, 3);
        }
      } else if (Math.hypot(c.vx, c.vz) > 0.3) {
        c.yaw = Math.atan2(c.vx, c.vz);
      }

      c.rig.root.rotation.y = c.yaw;
      const spd = Math.hypot(c.vx, c.vz);
      if (spd > 0.4) {
        c.walkPhase += dt * spd * 2.0;
        const swing = Math.sin(c.walkPhase) * 0.55;
        c.rig.leftLeg.rotation.x = swing;
        c.rig.rightLeg.rotation.x = -swing;
      } else {
        c.rig.bodyPivot.position.y = Math.sin(this.elapsed * 3.5 + c.slotIndex) * 0.04;
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        for (const m of e.rig.flashMaterials) {
          m.emissive.setHex(e.hitFlashTimer > 0 ? 0xffffff : 0x000000);
          m.emissiveIntensity = e.hitFlashTimer > 0 ? 0.85 : 0;
        }
      }

      for (const ring of e.rig.orbitRings) {
        ring.rotation.y += dt * 2.2;
        ring.rotation.z += dt * 0.9;
      }
      if (e.rig.hpBarGroup.visible) {
        e.rig.hpBarGroup.lookAt(this.camera.position);
      }

      const dx = this.playerX - e.x;
      const dz = this.playerZ - e.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const dirX = dx / dist;
      const dirZ = dz / dist;

      e.rig.root.rotation.y = Math.atan2(dirX, dirZ);

      if (e.cooldownTimer > 0) e.cooldownTimer -= dt;

      const telMat = e.rig.telegraphRing.material as THREE.MeshBasicMaterial;
      if (e.windupTimer > 0) {
        e.windupTimer -= dt;
        const progress = 1 - Math.max(0, e.windupTimer / e.windupDuration);
        telMat.opacity = 0.35 + progress * 0.55;
        e.rig.telegraphRing.scale.setScalar(0.85 + progress * 0.45);
        e.rig.bodyPivot.scale.set(
          e.scale * (1 + progress * 0.14),
          e.scale * (1 - progress * 0.12),
          e.scale * (1 + progress * 0.14)
        );

        if (e.windupTimer <= 0) {
          telMat.opacity = 0;
          e.rig.bodyPivot.scale.setScalar(e.scale);
          this.executeEnemyAttack(e, dirX, dirZ, dist);
        }
      } else if (e.dashTimer > 0) {
        e.dashTimer -= dt;
        e.vx = e.dashDirX * (e.isBoss ? 14.5 : 15.5);
        e.vz = e.dashDirZ * (e.isBoss ? 14.5 : 15.5);
        if (dist < 1.15 * e.scale) {
          this.hurtPlayer();
        }
      } else {
        telMat.opacity = 0;
        let targetVx = 0;
        let targetVz = 0;

        if (e.archetype === 'weaver') {
          if (dist > 9.5) {
            targetVx = dirX * e.speed;
            targetVz = dirZ * e.speed;
          } else if (dist < 5.2) {
            targetVx = -dirX * e.speed * 0.85;
            targetVz = -dirZ * e.speed * 0.85;
          } else {
            targetVx = -dirZ * e.speed * 0.75;
            targetVz = dirX * e.speed * 0.75;
          }
          if (e.cooldownTimer <= 0 && dist < 17) {
            e.windupTimer = e.windupDuration;
            e.cooldownTimer = e.attackCooldown;
          }
        } else if (e.archetype === 'charger') {
          if (dist > 6.8) {
            targetVx = dirX * e.speed;
            targetVz = dirZ * e.speed;
          } else if (e.cooldownTimer <= 0) {
            e.dashDirX = dirX;
            e.dashDirZ = dirZ;
            e.windupTimer = 0.48;
            e.cooldownTimer = e.attackCooldown;
          } else {
            targetVx = -dirZ * e.speed * 0.6;
            targetVz = dirX * e.speed * 0.6;
          }
        } else if (e.archetype === 'boss') {
          if (dist > 3.2) {
            targetVx = dirX * e.speed;
            targetVz = dirZ * e.speed;
          }
          if (e.cooldownTimer <= 0) {
            e.dashDirX = dirX;
            e.dashDirZ = dirZ;
            e.windupTimer = 0.55;
            e.cooldownTimer = e.attackCooldown;
          }
        } else {
          const attackRange = e.archetype === 'brute' ? 2.15 : 1.75;
          if (dist > attackRange * 0.85) {
            targetVx = dirX * e.speed;
            targetVz = dirZ * e.speed;
          }
          if (dist <= attackRange && e.cooldownTimer <= 0) {
            e.windupTimer = e.windupDuration;
            e.cooldownTimer = e.attackCooldown;
          }
        }

        for (let j = 0; j < this.enemies.length; j++) {
          if (i === j) continue;
          const other = this.enemies[j];
          const sdx = e.x - other.x;
          const sdz = e.z - other.z;
          const sdist = Math.hypot(sdx, sdz);
          const minSep = (e.scale + other.scale) * 0.82;
          if (sdist < minSep && sdist > 0.001) {
            const push = ((minSep - sdist) / minSep) * 4.5;
            targetVx += (sdx / sdist) * push;
            targetVz += (sdz / sdist) * push;
          }
        }

        e.vx = THREE.MathUtils.damp(e.vx, targetVx, 10, dt);
        e.vz = THREE.MathUtils.damp(e.vz, targetVz, 10, dt);
      }

      const resolved = this.resolveArenaAndObstacleCollision(
        e.x + e.vx * dt,
        e.z + e.vz * dt,
        0.65 * e.scale
      );
      e.x = resolved.x;
      e.z = resolved.z;
      e.rig.root.position.set(e.x, 0, e.z);

      const spd = Math.hypot(e.vx, e.vz);
      if (spd > 0.4) {
        e.walkPhase += dt * spd * 2.2;
        e.rig.limbs.forEach((limb, idx) => {
          limb.rotation.x = Math.sin(e.walkPhase + idx * Math.PI) * 0.45;
        });
      }
    }
  }

  private executeEnemyAttack(
    e: ActiveEnemy,
    dirX: number,
    dirZ: number,
    dist: number
  ): void {
    const isHardMode = this.level > 20;
    const orbSpeed = isHardMode ? 14.2 : 11.5;

    if (e.archetype === 'weaver') {
      if (isHardMode) {
        const baseA = Math.atan2(dirZ, dirX);
        for (const offset of [-0.22, 0, 0.22]) {
          this.spawnEnemyOrb(
            e.x,
            e.z,
            Math.cos(baseA + offset),
            Math.sin(baseA + offset),
            orbSpeed
          );
        }
      } else {
        this.spawnEnemyOrb(e.x, e.z, dirX, dirZ, orbSpeed);
      }
      this.spawnBurst(e.x, 1.35, e.z, 0xf43f5e, 6);
    } else if (e.archetype === 'charger') {
      e.dashTimer = isHardMode ? 0.42 : 0.34;
    } else if (e.archetype === 'boss') {
      e.patternCounter += 1;
      if (e.patternCounter % 3 === 0) {
        const count = this.level === 100 ? 16 : isHardMode ? 12 : 8;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + e.patternCounter * 0.25;
          this.spawnEnemyOrb(
            e.x,
            e.z,
            Math.cos(angle),
            Math.sin(angle),
            this.level === 100 ? 13.5 : isHardMode ? 12.0 : 9.8
          );
        }
        this.spawnBurst(e.x, 1.8, e.z, 0xfbbf24, 16);
      } else if (e.patternCounter % 3 === 1 && dist > 3.5) {
        e.dashTimer = isHardMode ? 0.45 : 0.38;
      } else {
        const offsets = isHardMode ? [-0.36, -0.18, 0, 0.18, 0.36] : [-0.24, 0, 0.24];
        for (const offset of offsets) {
          const baseA = Math.atan2(dirZ, dirX) + offset;
          this.spawnEnemyOrb(
            e.x,
            e.z,
            Math.cos(baseA),
            Math.sin(baseA),
            isHardMode ? 14.5 : 12.0
          );
        }
        if (dist <= 3.1 * e.scale) {
          this.hurtPlayer();
        }
      }
    } else {
      const strikeReach = e.archetype === 'brute' ? 2.55 : 2.05;
      this.spawnBurst(e.x + dirX * 0.8, 0.6, e.z + dirZ * 0.8, 0xef4444, 8);
      if (dist <= strikeReach) {
        this.hurtPlayer();
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      let hitObs = false;
      for (const obs of this.obstacles) {
        if (Math.hypot(p.x - obs.x, p.z - obs.z) < obs.radius + 0.15) {
          hitObs = true;
          break;
        }
      }
      if (
        hitObs ||
        Math.hypot(p.x, p.z) > this.levelConfig.arenaRadius + 1.5
      ) {
        p.active = false;
        p.mesh.visible = false;
        this.spawnBurst(
          p.x,
          p.y,
          p.z,
          p.fromPlayer ? 0x38bdf8 : 0xf43f5e,
          4
        );
        continue;
      }

      if (p.fromPlayer) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          if (p.hitIds.has(enemy.id)) continue;
          const hitR = 0.72 * enemy.scale;
          if (Math.hypot(p.x - enemy.x, p.z - enemy.z) <= hitR) {
            p.hitIds.add(enemy.id);
            const len = Math.hypot(p.vx, p.vz) || 1;
            this.damageEnemy(
              enemy,
              p.damage,
              (p.vx / len) * 3.5,
              (p.vz / len) * 3.5
            );
            if (!p.pierce) {
              p.active = false;
              p.mesh.visible = false;
              break;
            }
          }
        }
      } else {
        if (Math.hypot(p.x - this.playerX, p.z - this.playerZ) <= 0.72) {
          p.active = false;
          p.mesh.visible = false;
          this.hurtPlayer();
        }
      }
    }
  }

  private updateCoins(dt: number): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      if (c.collected) continue;

      c.phase += dt * 3.2;
      c.mesh.rotation.y = c.phase;
      c.mesh.children[1].position.y = 0.65 + Math.sin(c.phase * 1.4) * 0.12;

      if (this.phase === 'playing') {
        const dx = this.playerX - c.x;
        const dz = this.playerZ - c.z;
        const dist = Math.hypot(dx, dz);

        if (dist < 2.75 && dist > 0.01) {
          const pull = 12.5 * dt;
          c.x += (dx / dist) * pull;
          c.z += (dz / dist) * pull;
          c.mesh.position.set(c.x, 0, c.z);
        }

        if (dist < 1.15) {
          c.collected = true;
          this.levelGroup.remove(c.mesh);
          this.coins.splice(i, 1);
          this.playerCoins += c.value;
          this.totalCoinsCollected += c.value;
          soundEngine.playCoin();
          this.spawnBurst(c.x, 0.8, c.z, 0xfbbf24, 8);
          this.emitHudState();
        }
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        pt.mesh.visible = false;
        continue;
      }
      pt.vy -= 14 * dt;
      pt.x += pt.vx * dt;
      pt.y = Math.max(0.08, pt.y + pt.vy * dt);
      pt.z += pt.vz * dt;
      pt.mesh.position.set(pt.x, pt.y, pt.z);
      pt.mesh.scale.setScalar(Math.max(0.05, pt.life / pt.maxLife));
    }
  }

  private updateCamera(dt: number): void {
    const lookAheadX = this.hasMouseMoved ? _mouseNdc.x * 4.2 : 0;
    const lookAheadZ = this.hasMouseMoved ? -_mouseNdc.y * 3.4 : 0;

    const targetLookX = this.playerX + lookAheadX;
    const targetLookZ = this.playerZ + lookAheadZ;

    const targetCamX = targetLookX;
    const targetCamY = 6.95;
    const targetCamZ = targetLookZ + 6.0;

    this.camX = THREE.MathUtils.damp(this.camX, targetCamX, 10, dt);
    this.camY = THREE.MathUtils.damp(this.camY, targetCamY, 10, dt);
    this.camZ = THREE.MathUtils.damp(this.camZ, targetCamZ, 10, dt);

    this.camLookX = THREE.MathUtils.damp(this.camLookX, targetLookX, 12, dt);
    this.camLookY = 0.9;
    this.camLookZ = THREE.MathUtils.damp(this.camLookZ, targetLookZ, 12, dt);

    let sx = 0;
    let sy = 0;
    if (this.shakeIntensity > 0.005) {
      sx = (Math.random() - 0.5) * this.shakeIntensity;
      sy = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = THREE.MathUtils.damp(
        this.shakeIntensity,
        0,
        14,
        dt
      );
    }

    this.camera.position.set(this.camX + sx, this.camY + sy, this.camZ);
    this.camera.lookAt(this.camLookX, this.camLookY, this.camLookZ);
    this.camera.updateMatrixWorld();

    if (this.hasMouseMoved) {
      this.updateAimFromMouse();
      this.aimReticle.position.set(this.aimWorldX, 0.05, this.aimWorldZ);
    }

    // Keep shadow-casting key light centered on the player
    this.keyLight.position.set(this.playerX + 18, 28, this.playerZ + 16);
    this.keyLight.target.position.set(this.playerX, 0, this.playerZ);
  }

  private emitHudState(): void {
    const boss = this.enemies.find((e) => e.isBoss);
    this.onStateChange({
      phase: this.phase,
      level: this.level,
      levelTitle: this.levelConfig.title,
      biomeName: this.levelConfig.biome.name,
      isBlackout: this.levelConfig.isBlackout,
      hearts: this.hearts,
      maxHearts: this.maxHearts,
      coins: this.playerCoins,
      hasGun: this.ownedGuns.length > 0,
      ownedGuns: [...this.ownedGuns],
      activeGun: this.activeGun,
      clonesCount: this.clonesCount,
      maxClones: MAX_CLONES,
      bandages: this.bandages,
      medkits: this.medkits,
      enemiesRemaining: this.enemies.length,
      enemiesTotal: this.levelConfig.enemies.length,
      dashReadyRatio:
        this.dashCooldownTimer <= 0
          ? 1
          : Math.max(0, 1 - this.dashCooldownTimer / 0.95),
      isBossLevel: this.levelConfig.isBossLevel,
      bossName: boss ? boss.bossName || 'Biome Warden' : null,
      bossHp: boss ? Math.max(0, boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 1,
      enemiesDefeatedTotal: this.enemiesDefeatedTotal,
      totalCoinsCollected: this.totalCoinsCollected,
      bestLevel: this.bestLevel,
      muted: soundEngine.isMuted(),
      levelClearBanner: this.levelClearTransitionTimer > 0,
      statusToast: this.statusToast,
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    this.clock.start();
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.updateSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.clearLevelScene();

    if (this.currentGroundTex) this.currentGroundTex.dispose();
    this.shadowTex.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
