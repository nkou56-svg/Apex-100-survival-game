import * as THREE from 'three';
import { EnemyArchetype, PropKind } from '../types/game';

export interface PlayerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  head: THREE.Group;
  gunGroup: THREE.Group;
  gunRailMat: THREE.MeshStandardMaterial;
  gunBarrel: THREE.Mesh;
  muzzlePoint: THREE.Object3D;
  meleeSlashArc: THREE.Mesh;
  visorMat: THREE.MeshStandardMaterial;
  armorMat: THREE.MeshStandardMaterial;
}

export interface CloneRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  rightArm: THREE.Group;
}

export interface EnemyRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  limbs: THREE.Object3D[];
  orbitRings: THREE.Object3D[];
  telegraphRing: THREE.Mesh;
  hpBarGroup: THREE.Group;
  hpBarFill: THREE.Mesh;
  flashMaterials: THREE.MeshStandardMaterial[];
}

export interface ShopkeeperRig {
  root: THREE.Group;
  keeperGroup: THREE.Group;
  lanternGlow: THREE.Mesh;
  staffArm: THREE.Group;
}

export function createContactShadow(
  shadowTex: THREE.Texture,
  radius: number
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return mesh;
}

export function createPlayerModel(shadowTex: THREE.Texture): PlayerRig {
  const root = new THREE.Group();
  root.add(createContactShadow(shadowTex, 0.95));

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.35,
    metalness: 0.45,
  });
  const undersuitMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.1,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.82,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.2,
    roughness: 0.15,
    metalness: 0.2,
  });

  // Legs (articulated at hip y = 0.72)
  const makeLeg = (xOffset: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, 0.72, 0);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.26, 6, 10),
      undersuitMat
    );
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.24, 0.36),
      armorMat
    );
    boot.position.set(0, -0.58, 0.05);
    boot.castShadow = true;
    legGroup.add(boot);

    return legGroup;
  };

  const leftLeg = makeLeg(-0.2);
  const rightLeg = makeLeg(0.2);
  bodyPivot.add(leftLeg, rightLeg);

  // Torso armor
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.28, 0.72, 10),
    armorMat
  );
  torso.position.y = 1.1;
  torso.castShadow = true;
  bodyPivot.add(torso);

  // Chest plate & belt trim
  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.38, 0.48),
    armorMat
  );
  chestPlate.position.set(0, 1.2, 0.04);
  chestPlate.castShadow = true;
  bodyPivot.add(chestPlate);

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.31, 0.31, 0.12, 10),
    trimMat
  );
  belt.position.y = 0.78;
  bodyPivot.add(belt);

  // Backpack power core
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.48, 0.22),
    undersuitMat
  );
  pack.position.set(0, 1.15, -0.32);
  pack.castShadow = true;
  bodyPivot.add(pack);

  const packCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.26, 8),
    visorMat
  );
  packCore.position.set(0, 1.15, -0.42);
  bodyPivot.add(packCore);

  // Helmet / Head
  const head = new THREE.Group();
  head.position.set(0, 1.66, 0);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 14, 12),
    armorMat
  );
  helmet.castShadow = true;
  head.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.14, 0.24),
    visorMat
  );
  visor.position.set(0, 0.02, 0.18);
  head.add(visor);

  const crest = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.14, 0.36),
    trimMat
  );
  crest.position.set(0, 0.26, -0.02);
  head.add(crest);
  bodyPivot.add(head);

  // Left arm + Energy Gauntlet
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.44, 1.36, 0);
  const leftPauldron = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    trimMat
  );
  leftArm.add(leftPauldron);
  const leftForearm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.1, 0.34, 6, 8),
    undersuitMat
  );
  leftForearm.position.set(0, -0.25, 0.08);
  leftForearm.rotation.x = -0.35;
  leftForearm.castShadow = true;
  leftArm.add(leftForearm);
  bodyPivot.add(leftArm);

  // Right arm + Blaster Gun
  const rightArm = new THREE.Group();
  rightArm.position.set(0.44, 1.36, 0);
  const rightPauldron = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    trimMat
  );
  rightArm.add(rightPauldron);
  const rightForearm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.1, 0.34, 6, 8),
    undersuitMat
  );
  rightForearm.position.set(0, -0.18, 0.16);
  rightForearm.rotation.x = -Math.PI / 2.4;
  rightForearm.castShadow = true;
  rightArm.add(rightForearm);

  // Composite Blaster Gun (visible once purchased from Shopkeeper)
  const gunGroup = new THREE.Group();
  gunGroup.position.set(0, -0.16, 0.42);
  gunGroup.visible = false;

  const gunBodyMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.85,
  });
  const gunReceiver = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.56),
    gunBodyMat
  );
  gunReceiver.castShadow = true;
  gunGroup.add(gunReceiver);

  const gunBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.055, 0.36, 10),
    trimMat
  );
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.03, 0.38);
  gunGroup.add(gunBarrel);

  const gunRailMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.3,
    roughness: 0.2,
    metalness: 0.3,
  });
  const gunRail = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, 0.42),
    gunRailMat
  );
  gunRail.position.set(0, 0.1, 0.05);
  gunGroup.add(gunRail);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.03, 0.6);
  gunGroup.add(muzzlePoint);

  rightArm.add(gunGroup);
  bodyPivot.add(rightArm);

  // Melee energy slash arc (flashes on close-range bash)
  const slashGeo = new THREE.RingGeometry(0.95, 1.85, 20, 1, -0.9, 1.8);
  const slashMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const meleeSlashArc = new THREE.Mesh(slashGeo, slashMat);
  meleeSlashArc.rotation.x = -Math.PI / 2;
  meleeSlashArc.rotation.z = Math.PI / 2;
  meleeSlashArc.position.set(0, 1.0, 0.4);
  root.add(meleeSlashArc);

  return {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    head,
    gunGroup,
    gunRailMat,
    gunBarrel,
    muzzlePoint,
    meleeSlashArc,
    visorMat,
    armorMat,
  };
}

export function createCloneModel(shadowTex: THREE.Texture): CloneRig {
  const root = new THREE.Group();
  root.add(createContactShadow(shadowTex, 0.72));

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(0.82);
  root.add(bodyPivot);

  const holoArmorMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.5,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
    metalness: 0.15,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x6ee7b7,
    emissive: 0x34d399,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });

  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.7, 0);
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.12, 0.38, 6, 8),
      darkMat
    );
    mesh.position.y = -0.34;
    mesh.castShadow = true;
    leg.add(mesh);
    return leg;
  };
  const leftLeg = makeLeg(-0.18);
  const rightLeg = makeLeg(0.18);
  bodyPivot.add(leftLeg, rightLeg);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.25, 0.68, 8),
    holoArmorMat
  );
  torso.position.y = 1.06;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 10),
    holoArmorMat
  );
  head.position.y = 1.62;
  head.castShadow = true;
  bodyPivot.add(head);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.12, 0.22),
    visorMat
  );
  visor.position.set(0, 1.64, 0.16);
  bodyPivot.add(visor);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.4, 1.32, 0);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.16, 0.56),
    visorMat
  );
  gun.position.set(0, -0.1, 0.32);
  rightArm.add(gun);
  bodyPivot.add(rightArm);

  return {
    root,
    bodyPivot,
    leftLeg,
    rightLeg,
    rightArm,
  };
}

export function createEnemyModel(
  archetype: EnemyArchetype,
  colorHex: string,
  accentHex: string,
  scale: number,
  shadowTex: THREE.Texture
): EnemyRig {
  const root = new THREE.Group();
  root.add(createContactShadow(shadowTex, 0.9 * scale));

  const bodyPivot = new THREE.Group();
  bodyPivot.scale.setScalar(scale);
  root.add(bodyPivot);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.45,
    metalness: 0.35,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.8,
    metalness: 0.2,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.4,
  });

  const flashMaterials = [primaryMat, darkMat];
  const limbs: THREE.Object3D[] = [];
  const orbitRings: THREE.Object3D[] = [];

  if (archetype === 'stalker') {
    const carapace = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.48, 0),
      primaryMat
    );
    carapace.position.y = 0.72;
    carapace.scale.set(1.0, 0.75, 1.3);
    carapace.castShadow = true;
    bodyPivot.add(carapace);

    const head = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.55, 6),
      darkMat
    );
    head.rotation.x = Math.PI / 2;
    head.position.set(0, 0.75, 0.62);
    head.castShadow = true;
    bodyPivot.add(head);

    for (const sx of [-0.14, 0.14]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), accentMat);
      eye.position.set(sx, 0.85, 0.52);
      bodyPivot.add(eye);
    }

    const dorsalSpike = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.5, 5),
      accentMat
    );
    dorsalSpike.position.set(0, 1.15, -0.05);
    dorsalSpike.rotation.x = -0.35;
    bodyPivot.add(dorsalSpike);

    const legOffsets = [
      [-0.38, 0.45, 0.32],
      [0.38, 0.45, 0.32],
      [-0.38, 0.45, -0.32],
      [0.38, 0.45, -0.32],
    ];
    for (const [lx, ly, lz] of legOffsets) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.05, 0.55, 6),
        darkMat
      );
      leg.position.set(lx, ly - 0.18, lz);
      leg.castShadow = true;
      bodyPivot.add(leg);
      limbs.push(leg);
    }
  } else if (archetype === 'brute') {
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.95, 0.68),
      primaryMat
    );
    torso.position.y = 1.05;
    torso.castShadow = true;
    bodyPivot.add(torso);

    const helm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.34, 0.42, 8),
      darkMat
    );
    helm.position.set(0, 1.72, 0.05);
    helm.castShadow = true;
    bodyPivot.add(helm);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.16),
      accentMat
    );
    visor.position.set(0, 1.72, 0.28);
    bodyPivot.add(visor);

    for (const sx of [-0.58, 0.58]) {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 8),
        darkMat
      );
      pauldron.position.set(sx, 1.42, 0);
      pauldron.castShadow = true;
      bodyPivot.add(pauldron);
    }

    const clubArm = new THREE.Group();
    clubArm.position.set(0.62, 1.25, 0.15);
    const armMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.65, 0.24),
      primaryMat
    );
    armMesh.position.y = -0.25;
    clubArm.add(armMesh);
    const hammerHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.55, 8),
      accentMat
    );
    hammerHead.rotation.z = Math.PI / 2;
    hammerHead.position.set(0, -0.55, 0.22);
    clubArm.add(hammerHead);
    bodyPivot.add(clubArm);
    limbs.push(clubArm);

    for (const lx of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.6, 0.34),
        darkMat
      );
      leg.position.set(lx, 0.3, 0);
      leg.castShadow = true;
      bodyPivot.add(leg);
      limbs.push(leg);
    }
  } else if (archetype === 'weaver') {
    const pedestal = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.55, 6),
      darkMat
    );
    pedestal.position.y = 0.45;
    pedestal.castShadow = true;
    bodyPivot.add(pedestal);

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 0),
      accentMat
    );
    core.position.y = 1.35;
    core.castShadow = true;
    bodyPivot.add(core);
    limbs.push(core);

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.06, 8, 24),
      primaryMat
    );
    ring1.position.y = 1.35;
    bodyPivot.add(ring1);
    orbitRings.push(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.05, 8, 24),
      darkMat
    );
    ring2.position.y = 1.35;
    ring2.rotation.x = Math.PI / 3;
    bodyPivot.add(ring2);
    orbitRings.push(ring2);
  } else if (archetype === 'charger') {
    const hull = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.25, 6),
      primaryMat
    );
    hull.rotation.x = Math.PI / 2;
    hull.position.y = 0.88;
    hull.castShadow = true;
    bodyPivot.add(hull);

    for (const sx of [-0.36, 0.36]) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.22, 0.9),
        accentMat
      );
      blade.position.set(sx, 0.9, 0.15);
      blade.rotation.y = sx > 0 ? -0.18 : 0.18;
      bodyPivot.add(blade);
    }

    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.45, 0.55),
      darkMat
    );
    fin.position.set(0, 1.25, -0.15);
    bodyPivot.add(fin);
  } else {
    // Boss / Apex Titan
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.55, 1.4, 8),
      primaryMat
    );
    torso.position.y = 1.55;
    torso.castShadow = true;
    bodyPivot.add(torso);

    const reactor = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.38, 1),
      accentMat
    );
    reactor.position.set(0, 1.65, 0.52);
    bodyPivot.add(reactor);
    limbs.push(reactor);

    const head = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.44, 0),
      darkMat
    );
    head.position.set(0, 2.55, 0.05);
    head.castShadow = true;
    bodyPivot.add(head);

    for (const sx of [-0.34, 0.34]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.65, 6),
        accentMat
      );
      horn.position.set(sx, 2.95, 0);
      horn.rotation.z = sx > 0 ? -0.38 : 0.38;
      bodyPivot.add(horn);
    }

    const crownRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.08, 10, 28),
      accentMat
    );
    crownRing.position.y = 2.55;
    crownRing.rotation.x = Math.PI / 2;
    bodyPivot.add(crownRing);
    orbitRings.push(crownRing);

    for (const sx of [-0.95, 0.95]) {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 1.05, 0.36),
        darkMat
      );
      arm.position.set(sx, 1.5, 0.18);
      arm.castShadow = true;
      bodyPivot.add(arm);
      limbs.push(arm);
    }

    for (const lx of [-0.36, 0.36]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.9, 0.45),
        darkMat
      );
      leg.position.set(lx, 0.45, 0);
      leg.castShadow = true;
      bodyPivot.add(leg);
      limbs.push(leg);
    }
  }

  // Telegraph ring on ground (glows bright orange/red before enemy strike)
  const telegraphGeo = new THREE.RingGeometry(0.85 * scale, 1.15 * scale, 24);
  const telegraphMat = new THREE.MeshBasicMaterial({
    color: 0xff3b30,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const telegraphRing = new THREE.Mesh(telegraphGeo, telegraphMat);
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.04;
  root.add(telegraphRing);

  // Overhead floating HP bar
  const hpBarGroup = new THREE.Group();
  hpBarGroup.position.y = archetype === 'boss' ? 3.55 * scale : 2.15 * scale;
  hpBarGroup.visible = false;

  const barWidth = archetype === 'boss' ? 2.2 : 1.15;
  const bgBar = new THREE.Mesh(
    new THREE.PlaneGeometry(barWidth, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide })
  );
  hpBarGroup.add(bgBar);

  const fillGeo = new THREE.PlaneGeometry(barWidth - 0.06, 0.1);
  fillGeo.translate((barWidth - 0.06) / 2, 0, 0);
  const hpBarFill = new THREE.Mesh(
    fillGeo,
    new THREE.MeshBasicMaterial({
      color: archetype === 'boss' ? 0xf59e0b : 0xef4444,
      side: THREE.DoubleSide,
    })
  );
  hpBarFill.position.set(-(barWidth - 0.06) / 2, 0, 0.01);
  hpBarGroup.add(hpBarFill);
  root.add(hpBarGroup);

  return {
    root,
    bodyPivot,
    limbs,
    orbitRings,
    telegraphRing,
    hpBarGroup,
    hpBarFill,
    flashMaterials,
  };
}

export function createCoinMesh(shadowTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(shadowTex, 0.45));

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xb45309,
    emissiveIntensity: 0.25,
    metalness: 0.9,
    roughness: 0.18,
  });
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.35,
    metalness: 0.85,
    roughness: 0.25,
  });

  const body = new THREE.Group();
  body.position.y = 0.65;

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.1, 18),
    goldMat
  );
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  body.add(disc);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.05, 8, 18),
    goldMat
  );
  body.add(rim);

  const emblem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    innerMat
  );
  emblem.scale.set(0.8, 1.2, 0.45);
  body.add(emblem);

  group.add(body);
  return group;
}

export function createShopkeeperStall(shadowTex: THREE.Texture): ShopkeeperRig {
  const root = new THREE.Group();
  root.add(createContactShadow(shadowTex, 2.6));

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.85,
    metalness: 0.05,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.4,
    metalness: 0.6,
  });
  const clothRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.75,
    metalness: 0.05,
  });
  const clothCreamMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.75,
    metalness: 0.05,
  });

  // Wooden counter base
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.05, 1.2),
    woodMat
  );
  counter.position.set(0, 0.525, 0.65);
  counter.castShadow = true;
  counter.receiveShadow = true;
  root.add(counter);

  const counterTop = new THREE.Mesh(
    new THREE.BoxGeometry(3.65, 0.14, 1.4),
    trimMat
  );
  counterTop.position.set(0, 1.1, 0.65);
  counterTop.castShadow = true;
  root.add(counterTop);

  // Corner posts & striped awning
  for (const px of [-1.6, 1.6]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 2.9, 8),
      woodMat
    );
    post.position.set(px, 1.45, 0.15);
    post.castShadow = true;
    root.add(post);
  }

  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.12, 2.0),
      i % 2 === 0 ? clothRedMat : clothCreamMat
    );
    stripe.position.set(-1.55 + i * 0.62, 2.9, 0.55);
    stripe.rotation.x = 0.18;
    stripe.castShadow = true;
    root.add(stripe);
  }

  // Display props on counter: Bandage roll, Medkit box, Blaster Gun
  const bandageRoll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.28, 12),
    clothCreamMat
  );
  bandageRoll.position.set(-1.05, 1.31, 0.75);
  root.add(bandageRoll);

  const medkitBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.28, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
  );
  medkitBox.position.set(0, 1.31, 0.75);
  root.add(medkitBox);
  const medCross = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.06, 0.08),
    clothRedMat
  );
  medCross.position.set(0, 1.46, 0.75);
  root.add(medCross);

  const gunDisplay = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.18, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.85,
      roughness: 0.22,
    })
  );
  gunDisplay.position.set(1.05, 1.28, 0.75);
  root.add(gunDisplay);

  // Hanging warm lantern
  const lanternGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.6,
      roughness: 0.2,
    })
  );
  lanternGlow.position.set(1.6, 2.35, 1.05);
  root.add(lanternGlow);

  // Shopkeeper Character standing behind counter
  const keeperGroup = new THREE.Group();
  keeperGroup.position.set(0, 0, -0.35);

  const robeMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.7,
    metalness: 0.1,
  });
  const hatMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.5,
    metalness: 0.2,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    roughness: 0.6,
    metalness: 0.05,
  });

  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.52, 1.35, 10),
    robeMat
  );
  robe.position.y = 0.68;
  robe.castShadow = true;
  keeperGroup.add(robe);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skinMat);
  head.position.y = 1.6;
  head.castShadow = true;
  keeperGroup.add(head);

  const hatBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 0.06, 14),
    hatMat
  );
  hatBrim.position.y = 1.82;
  keeperGroup.add(hatBrim);

  const hatCrown = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.55, 10),
    hatMat
  );
  hatCrown.position.y = 2.1;
  keeperGroup.add(hatCrown);

  const staffArm = new THREE.Group();
  staffArm.position.set(0.45, 1.3, 0.1);
  const arm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.09, 0.35, 6, 8),
    robeMat
  );
  arm.position.set(0, -0.15, 0.12);
  arm.rotation.x = -0.6;
  staffArm.add(arm);
  keeperGroup.add(staffArm);

  root.add(keeperGroup);

  return {
    root,
    keeperGroup,
    lanternGlow,
    staffArm,
  };
}

export function createObstacleProp(
  kind: PropKind,
  scale: number,
  colorA: string,
  colorB: string,
  shadowTex: THREE.Texture
): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(shadowTex, 1.15 * scale));

  const inner = new THREE.Group();
  inner.scale.setScalar(scale);
  group.add(inner);

  const matA = new THREE.MeshStandardMaterial({
    color: colorA,
    roughness: 0.78,
    metalness: 0.08,
  });
  const matB = new THREE.MeshStandardMaterial({
    color: colorB,
    roughness: 0.55,
    metalness: 0.2,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    roughness: 0.9,
    metalness: 0.02,
  });

  if (kind === 'tree') {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.34, 1.6, 8),
      woodMat
    );
    trunk.position.y = 0.8;
    trunk.castShadow = true;
    inner.add(trunk);

    const canopy1 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95, 0),
      matA
    );
    canopy1.position.y = 2.05;
    canopy1.castShadow = true;
    inner.add(canopy1);

    const canopy2 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.68, 0),
      matA
    );
    canopy2.position.set(0.35, 2.55, 0.2);
    canopy2.castShadow = true;
    inner.add(canopy2);
  } else if (kind === 'pine') {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.28, 1.1, 7),
      woodMat
    );
    trunk.position.y = 0.55;
    trunk.castShadow = true;
    inner.add(trunk);

    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(1.05 - i * 0.24, 1.25, 8),
        matA
      );
      cone.position.y = 1.45 + i * 0.75;
      cone.castShadow = true;
      inner.add(cone);
    }
  } else if (kind === 'cactus') {
    const stem = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 1.7, 6, 10),
      matA
    );
    stem.position.y = 1.1;
    stem.castShadow = true;
    inner.add(stem);

    const armL = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.65, 6, 8),
      matA
    );
    armL.position.set(-0.42, 1.35, 0);
    armL.rotation.z = 0.55;
    armL.castShadow = true;
    inner.add(armL);

    const armR = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.55, 6, 8),
      matA
    );
    armR.position.set(0.42, 1.15, 0);
    armR.rotation.z = -0.55;
    armR.castShadow = true;
    inner.add(armR);
  } else if (kind === 'crystal' || kind === 'obsidian') {
    const crystalMat = new THREE.MeshStandardMaterial({
      color: kind === 'crystal' ? colorA : colorB,
      emissive: kind === 'crystal' ? colorA : 0xf97316,
      emissiveIntensity: kind === 'crystal' ? 0.45 : 0.3,
      roughness: 0.18,
      metalness: 0.65,
    });
    const base = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.75, 0),
      matB
    );
    base.scale.set(1.1, 0.45, 1.1);
    base.position.y = 0.28;
    inner.add(base);

    for (let i = 0; i < 3; i++) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.32 - i * 0.05, 1.85 - i * 0.35, 6),
        crystalMat
      );
      shard.position.set((i - 1) * 0.25, 0.95 - i * 0.12, (i % 2) * 0.2 - 0.1);
      shard.rotation.z = (i - 1) * 0.22;
      shard.castShadow = true;
      inner.add(shard);
    }
  } else if (kind === 'pillar') {
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.35, 1.15),
      matA
    );
    plinth.position.y = 0.175;
    plinth.castShadow = true;
    inner.add(plinth);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.44, 2.2, 10),
      matA
    );
    shaft.position.y = 1.4;
    shaft.castShadow = true;
    inner.add(shaft);

    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.26, 1.05),
      matB
    );
    cap.position.y = 2.55;
    cap.castShadow = true;
    inner.add(cap);
  } else if (kind === 'mushroom') {
    const stalk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 1.25, 10),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 })
    );
    stalk.position.y = 0.625;
    stalk.castShadow = true;
    inner.add(stalk);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: colorA,
        emissive: colorA,
        emissiveIntensity: 0.35,
        roughness: 0.35,
      })
    );
    cap.position.y = 1.15;
    cap.castShadow = true;
    inner.add(cap);
  } else {
    // Rock formation
    const mainRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.85, 0),
      matB
    );
    mainRock.position.y = 0.55;
    mainRock.scale.set(1.15, 0.9, 1.0);
    mainRock.castShadow = true;
    inner.add(mainRock);

    const sideRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.52, 0),
      matA
    );
    sideRock.position.set(0.55, 0.35, 0.3);
    sideRock.castShadow = true;
    inner.add(sideRock);
  }

  return group;
}
