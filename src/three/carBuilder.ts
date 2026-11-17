import * as THREE from 'three';
import { CarConfig } from '../types/game';
import { createContactShadowTexture } from './textures';

let sharedShadowTex: THREE.CanvasTexture | null = null;
function getShadowTexture(): THREE.CanvasTexture {
  if (!sharedShadowTex) {
    sharedShadowTex = createContactShadowTexture();
  }
  return sharedShadowTex;
}

export interface BuiltCarRig {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  paintMat: THREE.MeshPhysicalMaterial;
  wheels: THREE.Group[];
  frontWheelPivots: THREE.Group[];
  taillightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  nitroFlames: THREE.Mesh[];
  policeRedLight?: THREE.Mesh;
  policeBlueLight?: THREE.Mesh;
  policeRedMat?: THREE.MeshBasicMaterial;
  policeBlueMat?: THREE.MeshBasicMaterial;
}

function createWheel(radius: number, width: number, accentColor: string): THREE.Group {
  const wheelGroup = new THREE.Group();

  // Tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 20);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#111318',
    roughness: 0.88,
    metalness: 0.05,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheelGroup.add(tire);

  // Alloy Rim
  const rimGeo = new THREE.CylinderGeometry(radius * 0.66, radius * 0.66, width + 0.02, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.25,
    metalness: 0.9,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheelGroup.add(rim);

  // Spokes cross detail
  const spokeGeo = new THREE.BoxGeometry(width + 0.03, radius * 1.18, radius * 0.12);
  const spoke1 = new THREE.Mesh(spokeGeo, rimMat);
  const spoke2 = new THREE.Mesh(spokeGeo, rimMat);
  spoke2.rotation.x = Math.PI / 3;
  const spoke3 = new THREE.Mesh(spokeGeo, rimMat);
  spoke3.rotation.x = -Math.PI / 3;
  wheelGroup.add(spoke1, spoke2, spoke3);

  // Brake caliper accent inside wheel
  const caliperGeo = new THREE.BoxGeometry(width * 0.7, radius * 0.42, radius * 0.35);
  const caliperMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.35,
    metalness: 0.5,
  });
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(0, radius * 0.22, 0);
  wheelGroup.add(caliper);

  return wheelGroup;
}

function createSculptedBodyGeometry(car: CarConfig): THREE.BufferGeometry {
  const { width, height, length } = car.dimensions;
  const halfL = length / 2;

  // Profile in XY (X = Z along car length from -halfL rear to +halfL front, Y = height)
  const profile = new THREE.Shape();

  if (car.silhouette === 'wedge' || car.silhouette === 'track') {
    profile.moveTo(-halfL, 0.18);
    profile.lineTo(halfL - 0.1, 0.16);
    profile.lineTo(halfL, 0.32);
    profile.lineTo(halfL * 0.48, height * 0.54);
    profile.lineTo(halfL * 0.08, height * 0.96);
    profile.lineTo(-halfL * 0.42, height * 0.95);
    profile.lineTo(-halfL * 0.88, height * 0.66);
    profile.lineTo(-halfL, 0.56);
    profile.closePath();
  } else if (car.silhouette === 'hyper') {
    profile.moveTo(-halfL, 0.18);
    profile.lineTo(halfL - 0.15, 0.16);
    profile.lineTo(halfL, 0.34);
    profile.quadraticCurveTo(halfL * 0.5, height * 0.58, halfL * 0.12, height * 0.98);
    profile.lineTo(-halfL * 0.38, height * 0.97);
    profile.quadraticCurveTo(-halfL * 0.78, height * 0.74, -halfL, 0.58);
    profile.closePath();
  } else {
    // gt / coupe
    profile.moveTo(-halfL, 0.2);
    profile.lineTo(halfL - 0.08, 0.18);
    profile.lineTo(halfL, 0.42);
    profile.lineTo(halfL * 0.36, height * 0.62);
    profile.lineTo(halfL * 0.04, height);
    profile.lineTo(-halfL * 0.48, height * 0.98);
    profile.lineTo(-halfL * 0.84, height * 0.68);
    profile.lineTo(-halfL, 0.6);
    profile.closePath();
  }

  const extrudeWidth = width - 0.14;
  const geo = new THREE.ExtrudeGeometry(profile, {
    depth: extrudeWidth,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 2,
    curveSegments: 8,
  });

  // Rotate so X = width, Y = height, Z = length (facing -Z or +Z: let's face -Z forward!)
  geo.translate(0, 0, -extrudeWidth / 2);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function buildSupercarMesh(
  car: CarConfig,
  bodyColorHex: string,
  headlightsOn = true
): BuiltCarRig {
  const root = new THREE.Group();
  const { width, height, length } = car.dimensions;

  // 1. Contact shadow grounded at y=0.02
  const shadowGeo = new THREE.PlaneGeometry(width * 1.38, length * 1.24);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  root.add(shadow);

  // 2. Main Sculpted Clearcoat Body (Facing -Z forward)
  const bodyGeo = createSculptedBodyGeometry(car);
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(bodyColorHex),
    metalness: 0.65,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // 3. Carbon Fiber Lower Splitter, Side Skirts & Rear Diffuser
  const carbonMat = new THREE.MeshStandardMaterial({
    color: '#11141a',
    roughness: 0.55,
    metalness: 0.3,
  });

  const undertrayGeo = new THREE.BoxGeometry(width * 0.96, 0.1, length * 1.02);
  const undertray = new THREE.Mesh(undertrayGeo, carbonMat);
  undertray.position.set(0, 0.2, 0);
  undertray.castShadow = true;
  root.add(undertray);

  // Front aero splitter lip (car faces -Z)
  const splitterGeo = new THREE.BoxGeometry(width * 0.98, 0.06, 0.34);
  const splitter = new THREE.Mesh(splitterGeo, carbonMat);
  splitter.position.set(0, 0.17, -length / 2 - 0.06);
  root.add(splitter);

  // 4. Tinted Aerodynamic Canopy Windshield & Side Glass
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#090d16',
    metalness: 0.25,
    roughness: 0.08,
    clearcoat: 1.0,
    opacity: 0.92,
    transparent: true,
  });
  const canopyGeo = new THREE.BoxGeometry(width * 0.72, height * 0.34, length * 0.42);
  const canopy = new THREE.Mesh(canopyGeo, glassMat);
  canopy.position.set(0, height * 0.74, 0.06);
  canopy.rotation.x = 0.12;
  root.add(canopy);

  // 5. Racing Center Stripe / Accent Trim
  const accentMat = new THREE.MeshStandardMaterial({
    color: car.accentColor,
    roughness: 0.25,
    metalness: 0.6,
  });
  const hoodStripeGeo = new THREE.BoxGeometry(0.24, 0.03, length * 0.44);
  const hoodStripe = new THREE.Mesh(hoodStripeGeo, accentMat);
  hoodStripe.position.set(0, height * 0.48, -length * 0.26);
  hoodStripe.rotation.x = 0.22;
  root.add(hoodStripe);

  // 6. Spoiler / Rear Aero Wing
  if (car.spoilerStyle !== 'none') {
    const wingY = car.spoilerStyle === 'lip' ? height * 0.63 : height * 0.88;
    const wingW = car.spoilerStyle === 'lip' ? width * 0.82 : width * 0.98;
    const wingGeo = new THREE.BoxGeometry(wingW, 0.06, car.spoilerStyle === 'lip' ? 0.2 : 0.32);
    const wing = new THREE.Mesh(wingGeo, carbonMat);
    wing.position.set(0, wingY, length / 2 - 0.12);
    wing.rotation.x = -0.1;
    wing.castShadow = true;
    root.add(wing);

    if (car.spoilerStyle !== 'lip') {
      const strutGeo = new THREE.BoxGeometry(0.06, wingY - height * 0.56, 0.18);
      const strutL = new THREE.Mesh(strutGeo, carbonMat);
      strutL.position.set(-width * 0.26, height * 0.72, length / 2 - 0.14);
      const strutR = new THREE.Mesh(strutGeo, carbonMat);
      strutR.position.set(width * 0.26, height * 0.72, length / 2 - 0.14);
      root.add(strutL, strutR);
    }
  }

  // 7. LED Headlights (-Z front) & Taillight Bar (+Z rear)
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#e0f2fe',
    emissiveIntensity: headlightsOn ? 2.4 : 0.7,
    roughness: 0.1,
  });
  const hlGeo = new THREE.BoxGeometry(0.38, 0.09, 0.12);
  const hlL = new THREE.Mesh(hlGeo, headlightMat);
  hlL.position.set(-width * 0.34, 0.38, -length / 2 + 0.04);
  hlL.rotation.y = 0.18;
  const hlR = new THREE.Mesh(hlGeo, headlightMat);
  hlR.position.set(width * 0.34, 0.38, -length / 2 + 0.04);
  hlR.rotation.y = -0.18;
  root.add(hlL, hlR);

  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#ff1e1e',
    emissive: '#ef4444',
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const tlGeo = new THREE.BoxGeometry(width * 0.82, 0.08, 0.08);
  const tl = new THREE.Mesh(tlGeo, taillightMat);
  tl.position.set(0, 0.52, length / 2 + 0.01);
  root.add(tl);

  // 8. Exhausts & Nitro Flame Cones
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.95,
    roughness: 0.15,
  });
  const nitroFlames: THREE.Mesh[] = [];
  const flameMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.9,
  });

  const exhaustOffsets =
    car.exhaustCount === 4
      ? [-0.36, -0.22, 0.22, 0.36]
      : [-0.26, 0.26];

  exhaustOffsets.forEach((ox) => {
    const exGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 12);
    exGeo.rotateX(Math.PI / 2);
    const ex = new THREE.Mesh(exGeo, chromeMat);
    ex.position.set(ox, 0.25, length / 2 + 0.04);
    root.add(ex);

    const flameGeo = new THREE.ConeGeometry(0.09, 0.95, 10);
    flameGeo.rotateX(Math.PI / 2);
    flameGeo.translate(0, 0, 0.45);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(ox, 0.25, length / 2 + 0.08);
    flame.visible = false;
    root.add(flame);
    nitroFlames.push(flame);
  });

  // 9. Four Wheels (Front pivots for steering)
  const wheelRadius = 0.36;
  const wheelWidth = 0.28;
  const wx = width * 0.48;
  const wzFront = -length * 0.31;
  const wzRear = length * 0.31;

  const wheels: THREE.Group[] = [];
  const frontWheelPivots: THREE.Group[] = [];

  const wheelPositions: Array<[number, number, boolean]> = [
    [-wx, wzFront, true],
    [wx, wzFront, true],
    [-wx, wzRear, false],
    [wx, wzRear, false],
  ];

  wheelPositions.forEach(([x, z, isFront]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, wheelRadius, z);
    const wMesh = createWheel(wheelRadius, wheelWidth, car.accentColor);
    pivot.add(wMesh);
    root.add(pivot);
    wheels.push(wMesh);
    if (isFront) frontWheelPivots.push(pivot);
  });

  return {
    root,
    bodyMesh,
    paintMat,
    wheels,
    frontWheelPivots,
    taillightMat,
    headlightMat,
    nitroFlames,
  };
}

export function buildTrafficVehicleMesh(
  variant: 'sedan' | 'suv' | 'truck' | 'taxi',
  colorHex: string
): THREE.Group {
  const root = new THREE.Group();
  const isTruck = variant === 'truck';
  const isSuv = variant === 'suv';

  const w = isTruck ? 2.25 : 1.88;
  const l = isTruck ? 6.4 : isSuv ? 4.6 : 4.35;
  const h = isTruck ? 2.65 : isSuv ? 1.65 : 1.38;

  // Contact shadow
  const shadowGeo = new THREE.PlaneGeometry(w * 1.3, l * 1.15);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      map: getShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  shadow.position.y = 0.02;
  root.add(shadow);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: variant === 'taxi' ? '#eab308' : colorHex,
    roughness: 0.35,
    metalness: 0.35,
  });

  if (isTruck) {
    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 1.9, 1.9), bodyMat);
    cab.position.set(0, 1.25, -l / 2 + 1.0);
    cab.castShadow = true;
    root.add(cab);

    // Cargo trailer
    const cargoMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.65,
      metalness: 0.1,
    });
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.45, l - 2.2), cargoMat);
    cargo.position.set(0, (h - 0.45) / 2 + 0.55, 1.0);
    cargo.castShadow = true;
    root.add(cargo);
  } else {
    const lower = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.45, l), bodyMat);
    lower.position.y = h * 0.225 + 0.25;
    lower.castShadow = true;
    root.add(lower);

    const cabinMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.15,
      metalness: 0.3,
    });
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.84, h * 0.38, l * (isSuv ? 0.62 : 0.48)),
      cabinMat
    );
    cabin.position.set(0, h * 0.64 + 0.15, 0.15);
    root.add(cabin);

    if (variant === 'taxi') {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.18, 0.26),
        new THREE.MeshStandardMaterial({
          color: '#fef08a',
          emissive: '#facc15',
          emissiveIntensity: 1.4,
        })
      );
      sign.position.set(0, h + 0.05, 0.1);
      root.add(sign);
    }
  }

  // Taillights (+Z rear) & Headlights (-Z front)
  const tl = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.78, 0.14, 0.08),
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#dc2626',
      emissiveIntensity: 1.4,
    })
  );
  tl.position.set(0, 0.68, l / 2 + 0.02);
  root.add(tl);

  const hl = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.78, 0.14, 0.08),
    new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      emissive: '#fef9c3',
      emissiveIntensity: 1.3,
    })
  );
  hl.position.set(0, 0.62, -l / 2 - 0.02);
  root.add(hl);

  // 4 simple wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.85 });
  [
    [-w * 0.48, -l * 0.31],
    [w * 0.48, -l * 0.31],
    [-w * 0.48, l * 0.31],
    [w * 0.48, l * 0.31],
  ].forEach(([wx, wz]) => {
    const wm = new THREE.Mesh(wheelGeo, wheelMat);
    wm.position.set(wx, 0.38, wz);
    root.add(wm);
  });

  return root;
}

export function buildPoliceCarMesh(): BuiltCarRig {
  const policeConfig: CarConfig = {
    id: 'police_interceptor',
    brand: 'BMW',
    name: 'Police Interceptor',
    tier: 'Super',
    price: 0,
    silhouette: 'gt',
    spoilerStyle: 'lip',
    exhaustCount: 4,
    defaultColor: '#0f172a',
    accentColor: '#ffffff',
    palette: ['#0f172a'],
    baseStats: { topSpeed: 390, acceleration: 90, handling: 88, nitro: 90 },
    dimensions: { width: 1.98, height: 1.32, length: 4.7 },
  };

  const rig = buildSupercarMesh(policeConfig, '#0f172a', true);

  // White police doors/roof contrast panel
  const whiteMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.25,
    metalness: 0.3,
  });
  const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(2.01, 0.44, 1.85), whiteMat);
  doorPanel.position.set(0, 0.46, 0.05);
  rig.root.add(doorPanel);

  // Lightbar on roof
  const barBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.1, 0.28),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.4 })
  );
  barBase.position.set(0, 1.32, 0.12);
  rig.root.add(barBase);

  const redMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
  const blueMat = new THREE.MeshBasicMaterial({ color: '#3b82f6' });

  const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.26), redMat);
  redLight.position.set(-0.29, 1.35, 0.12);
  const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.26), blueMat);
  blueLight.position.set(0.29, 1.35, 0.12);
  rig.root.add(redLight, blueLight);

  rig.policeRedLight = redLight;
  rig.policeBlueLight = blueLight;
  rig.policeRedMat = redMat;
  rig.policeBlueMat = blueMat;

  return rig;
}
