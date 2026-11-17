import * as THREE from 'three';
import {
  GraphicsQuality,
  MapConfig,
  TimeOfDay,
  WeatherType,
} from '../types/game';
import {
  createBuildingTexture,
  createCheckeredTexture,
  createRoadTexture,
  createTerrainTexture,
} from './textures';

export const TRACK_LOOP_LENGTH = 2400;
export const CHUNK_LENGTH = 100;
export const CHUNK_COUNT = TRACK_LOOP_LENGTH / CHUNK_LENGTH; // 24 chunks
export const ROAD_WIDTH = 16.4;

export interface TrackSampler {
  getX: (dist: number) => number;
  getY: (dist: number) => number;
  getTangentX: (dist: number) => number;
  getSlopeY: (dist: number) => number;
}

export function createTrackSampler(map: MapConfig): TrackSampler {
  const k1 = (Math.PI * 2 * 3) / TRACK_LOOP_LENGTH;
  const k2 = (Math.PI * 2 * 1) / TRACK_LOOP_LENGTH;
  const h1 = (Math.PI * 2 * 4) / TRACK_LOOP_LENGTH;
  const h2 = (Math.PI * 2 * 2) / TRACK_LOOP_LENGTH;

  const ampX1 = 28 * map.curviness;
  const ampX2 = 18 * map.curviness;
  const ampY1 = 5.2 * map.hilliness;
  const ampY2 = 3.4 * map.hilliness;

  const getX = (dist: number) =>
    Math.sin(dist * k1) * ampX1 + Math.sin(dist * k2) * ampX2;

  const getY = (dist: number) =>
    Math.sin(dist * h1) * ampY1 + (1 - Math.cos(dist * h2)) * ampY2;

  const getTangentX = (dist: number) =>
    Math.cos(dist * k1) * ampX1 * k1 + Math.cos(dist * k2) * ampX2 * k2;

  const getSlopeY = (dist: number) =>
    Math.cos(dist * h1) * ampY1 * h1 + Math.sin(dist * h2) * ampY2 * h2;

  return { getX, getY, getTangentX, getSlopeY };
}

export interface TrackWorld {
  group: THREE.Group;
  chunks: Array<{ group: THREE.Group; baseDist: number }>;
  sampler: TrackSampler;
  finishGantry: THREE.Group | null;
  updateChunks: (playerDist: number) => void;
  dispose: () => void;
}

export function buildRaceTrackWorld(
  map: MapConfig,
  isNight: boolean,
  isWet: boolean,
  targetDistanceMeters: number,
  maxAnisotropy: number,
  quality: GraphicsQuality
): TrackWorld {
  const group = new THREE.Group();
  const sampler = createTrackSampler(map);
  const disposables: Array<{ dispose: () => void }> = [];

  const roadTex = createRoadTexture(map.roadColor, map.shoulderColor, maxAnisotropy, isWet);
  disposables.push(roadTex);

  const terrainTex = createTerrainTexture(map.terrainColor, map.shoulderColor, maxAnisotropy);
  disposables.push(terrainTex);

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: isWet ? 0.22 : 0.78,
    metalness: isWet ? 0.25 : 0.05,
  });
  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainTex,
    roughness: 0.92,
    metalness: 0.02,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: map.id === 'green_forest' ? '#78350f' : '#94a3b8',
    roughness: 0.5,
    metalness: map.id === 'green_forest' ? 0.05 : 0.65,
  });
  disposables.push(roadMat, terrainMat, railMat);

  // Shared prop materials per map
  const bldgTex = createBuildingTexture(isNight || map.id === 'night_city', map.accentHex);
  disposables.push(bldgTex);
  const bldgMat = new THREE.MeshStandardMaterial({
    map: bldgTex,
    roughness: 0.35,
    metalness: 0.4,
    emissive: isNight || map.id === 'night_city' ? new THREE.Color('#1e293b') : new THREE.Color('#000000'),
    emissiveMap: isNight || map.id === 'night_city' ? bldgTex : null,
    emissiveIntensity: isNight || map.id === 'night_city' ? 0.95 : 0,
  });
  const treeFoliageMat = new THREE.MeshStandardMaterial({
    color:
      map.id === 'snow_roads'
        ? '#e2e8f0'
        : map.id === 'desert_highway'
        ? '#4d7c0f'
        : '#15803d',
    roughness: 0.85,
  });
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
  const rockMat = new THREE.MeshStandardMaterial({
    color:
      map.id === 'desert_highway'
        ? '#b45309'
        : map.id === 'snow_roads'
        ? '#cbd5e1'
        : '#475569',
    roughness: 0.88,
  });
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.35 });
  const lampGlowMat = new THREE.MeshBasicMaterial({
    color: map.id === 'night_city' ? '#38bdf8' : '#fef08a',
  });
  disposables.push(bldgMat, treeFoliageMat, trunkMat, rockMat, lampPoleMat, lampGlowMat);

  // Shared prop geometries
  const bldgGeo = new THREE.BoxGeometry(1, 1, 1);
  const coneFoliageGeo = new THREE.ConeGeometry(2.2, 6.2, 7);
  const trunkGeo = new THREE.CylinderGeometry(0.32, 0.42, 2.2, 6);
  const cactusGeo = new THREE.CylinderGeometry(0.42, 0.48, 4.5, 7);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.2, 6);
  const bulbGeo = new THREE.BoxGeometry(1.4, 0.18, 0.4);
  disposables.push(bldgGeo, coneFoliageGeo, trunkGeo, cactusGeo, rockGeo, poleGeo, bulbGeo);

  const segsPerChunk = quality === 'low' ? 5 : 10;
  const segLen = CHUNK_LENGTH / segsPerChunk;
  const halfW = ROAD_WIDTH / 2;
  const terrainSpan = 135;

  const chunks: Array<{ group: THREE.Group; baseDist: number }> = [];

  for (let c = 0; c < CHUNK_COUNT; c++) {
    const chunkGroup = new THREE.Group();
    const baseDist = c * CHUNK_LENGTH;

    // 1. Road ribbon geometry for this 100m chunk
    const roadVerts: number[] = [];
    const roadUvs: number[] = [];
    const roadIndices: number[] = [];

    const terrVerts: number[] = [];
    const terrUvs: number[] = [];
    const terrIndices: number[] = [];

    const railLeftVerts: number[] = [];
    const railRightVerts: number[] = [];
    const railIndices: number[] = [];

    for (let s = 0; s <= segsPerChunk; s++) {
      const d = baseDist + s * segLen;
      const z = -d;
      const cx = sampler.getX(d);
      const cy = sampler.getY(d);

      // Road left/right vertices
      roadVerts.push(cx - halfW, cy, z, cx + halfW, cy, z);
      const vCoord = d / 24;
      roadUvs.push(0, vCoord, 1, vCoord);

      // Terrain skirt (far left, road left, road right, far right) - offset -0.06 below road
      const bankH = map.id === 'mountain_roads' || map.id === 'snow_roads' ? 14 : 2.5;
      terrVerts.push(
        cx - halfW - terrainSpan, cy + bankH, z,
        cx - halfW - 0.3, cy - 0.06, z,
        cx + halfW + 0.3, cy - 0.06, z,
        cx + halfW + terrainSpan, cy + bankH * 0.7, z
      );
      terrUvs.push(0, vCoord, 1, vCoord, 2, vCoord, 3, vCoord);

      // Guardrails
      railLeftVerts.push(cx - halfW - 0.2, cy + 0.15, z, cx - halfW - 0.2, cy + 0.85, z);
      railRightVerts.push(cx + halfW + 0.2, cy + 0.15, z, cx + halfW + 0.2, cy + 0.85, z);

      if (s < segsPerChunk) {
        const i2 = s * 2;
        roadIndices.push(i2, i2 + 1, i2 + 2, i2 + 1, i2 + 3, i2 + 2);

        const i4 = s * 4;
        // Left terrain
        terrIndices.push(i4, i4 + 1, i4 + 4, i4 + 1, i4 + 5, i4 + 4);
        // Under road bed
        terrIndices.push(i4 + 1, i4 + 2, i4 + 5, i4 + 2, i4 + 6, i4 + 5);
        // Right terrain
        terrIndices.push(i4 + 2, i4 + 3, i4 + 6, i4 + 3, i4 + 7, i4 + 6);

        railIndices.push(i2, i2 + 2, i2 + 1, i2 + 1, i2 + 2, i2 + 3);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    chunkGroup.add(roadMesh);
    disposables.push(roadGeo);

    const terrGeo = new THREE.BufferGeometry();
    terrGeo.setAttribute('position', new THREE.Float32BufferAttribute(terrVerts, 3));
    terrGeo.setAttribute('uv', new THREE.Float32BufferAttribute(terrUvs, 2));
    terrGeo.setIndex(terrIndices);
    terrGeo.computeVertexNormals();
    const terrMesh = new THREE.Mesh(terrGeo, terrainMat);
    terrMesh.receiveShadow = true;
    chunkGroup.add(terrMesh);
    disposables.push(terrGeo);

    const railLGeo = new THREE.BufferGeometry();
    railLGeo.setAttribute('position', new THREE.Float32BufferAttribute(railLeftVerts, 3));
    railLGeo.setIndex(railIndices);
    railLGeo.computeVertexNormals();
    const railRGeo = new THREE.BufferGeometry();
    railRGeo.setAttribute('position', new THREE.Float32BufferAttribute(railRightVerts, 3));
    railRGeo.setIndex(railIndices);
    railRGeo.computeVertexNormals();
    const railL = new THREE.Mesh(railLGeo, railMat);
    const railR = new THREE.Mesh(railRGeo, railMat);
    chunkGroup.add(railL, railR);
    disposables.push(railLGeo, railRGeo);

    // 2. Roadside props for this chunk
    const propStep = quality === 'low' ? 34 : 25;
    for (let offset = 10; offset < CHUNK_LENGTH; offset += propStep) {
      const d = baseDist + offset;
      const cx = sampler.getX(d);
      const cy = sampler.getY(d);
      const z = -d;

      // Streetlamps in cities
      if (map.id === 'modern_city' || map.id === 'night_city') {
        [-1, 1].forEach((side) => {
          const lx = cx + side * (halfW + 1.2);
          const pole = new THREE.Mesh(poleGeo, lampPoleMat);
          pole.position.set(lx, cy + 3.1, z);
          const bulb = new THREE.Mesh(bulbGeo, lampGlowMat);
          bulb.position.set(lx - side * 0.7, cy + 6.1, z);
          chunkGroup.add(pole, bulb);
        });

        // Skyscrapers on both sides
        [-1, 1].forEach((side) => {
          const w = 10 + ((d * 7 + (side > 0 ? 3 : 1)) % 10);
          const h = 18 + ((d * 13 + (side > 0 ? 9 : 4)) % 38);
          const bx = cx + side * (halfW + 10 + w * 0.5 + ((d * 3) % 8));
          const bldg = new THREE.Mesh(bldgGeo, bldgMat);
          bldg.scale.set(w, h, 14);
          bldg.position.set(bx, cy + h / 2 - 0.5, z);
          chunkGroup.add(bldg);
        });
      } else if (map.id === 'desert_highway') {
        [-1, 1].forEach((side) => {
          if ((Math.floor(d) + side) % 2 === 0) {
            const rx = cx + side * (halfW + 16 + ((d * 5) % 24));
            const mesa = new THREE.Mesh(rockGeo, rockMat);
            const sScale = 6 + ((d * 3) % 10);
            mesa.scale.set(sScale * 1.4, sScale * 1.6, sScale);
            mesa.position.set(rx, cy + sScale * 0.6, z);
            chunkGroup.add(mesa);
          } else {
            const cax = cx + side * (halfW + 5 + ((d * 7) % 14));
            const cactus = new THREE.Mesh(cactusGeo, treeFoliageMat);
            cactus.position.set(cax, cy + 2.2, z);
            chunkGroup.add(cactus);
          }
        });
      } else {
        // Mountain, Snow, Forest
        [-1, 1].forEach((side) => {
          const tx = cx + side * (halfW + 5.5 + ((d * 5) % 16));
          const scale = 0.85 + ((d * 3) % 7) * 0.14;
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.scale.setScalar(scale);
          trunk.position.set(tx, cy + 1.0 * scale, z);
          const crown = new THREE.Mesh(coneFoliageGeo, treeFoliageMat);
          crown.scale.setScalar(scale);
          crown.position.set(tx, cy + 4.4 * scale, z);
          chunkGroup.add(trunk, crown);

          if (map.id === 'mountain_roads' || map.id === 'snow_roads') {
            const rx = cx + side * (halfW + 22 + ((d * 11) % 26));
            const peak = new THREE.Mesh(rockGeo, rockMat);
            const ps = 8 + ((d * 7) % 14);
            peak.scale.set(ps, ps * 1.5, ps);
            peak.position.set(rx, cy + ps * 0.5, z);
            chunkGroup.add(peak);
          }
        });
      }
    }

    group.add(chunkGroup);
    chunks.push({ group: chunkGroup, baseDist });
  }

  // Finish Line Gantry (if distance-based race)
  let finishGantry: THREE.Group | null = null;
  if (targetDistanceMeters > 0) {
    finishGantry = new THREE.Group();
    const fx = sampler.getX(targetDistanceMeters);
    const fy = sampler.getY(targetDistanceMeters);
    const checkTex = createCheckeredTexture();
    disposables.push(checkTex);

    const pillarGeo = new THREE.BoxGeometry(0.8, 7.5, 0.8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.6, roughness: 0.3 });
    const pL = new THREE.Mesh(pillarGeo, pillarMat);
    pL.position.set(-halfW - 0.3, 3.75, 0);
    const pR = new THREE.Mesh(pillarGeo, pillarMat);
    pR.position.set(halfW + 0.3, 3.75, 0);

    const bannerGeo = new THREE.BoxGeometry(ROAD_WIDTH + 1.4, 1.8, 0.6);
    const bannerMat = new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.4 });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 6.8, 0);

    const stripGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 2.2);
    stripGeo.rotateX(-Math.PI / 2);
    const stripMat = new THREE.MeshBasicMaterial({ map: checkTex });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, 0.05, 0);

    finishGantry.add(pL, pR, banner, strip);
    finishGantry.position.set(fx, fy, -targetDistanceMeters);
    group.add(finishGantry);
    disposables.push(pillarGeo, pillarMat, bannerGeo, bannerMat, stripGeo, stripMat);
  }

  const updateChunks = (playerDist: number) => {
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      const worldStartDist = ch.baseDist - ch.group.position.z;
      const worldEndDist = worldStartDist + CHUNK_LENGTH;
      // If chunk is more than 120m behind player, shift it forward by TRACK_LOOP_LENGTH
      if (worldEndDist < playerDist - 120) {
        ch.group.position.z -= TRACK_LOOP_LENGTH;
      } else if (worldStartDist > playerDist + TRACK_LOOP_LENGTH - 120) {
        ch.group.position.z += TRACK_LOOP_LENGTH;
      }
    }
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return {
    group,
    chunks,
    sampler,
    finishGantry,
    updateChunks,
    dispose,
  };
}

export interface WeatherParticles {
  points: THREE.Points;
  update: (dt: number, centerPos: THREE.Vector3, mode: WeatherType) => void;
  dispose: () => void;
}

export function createWeatherParticles(count: number): WeatherParticles {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 44;
    positions[i * 3 + 1] = Math.random() * 22;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 65;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: '#e0f2fe',
    size: 0.22,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  const update = (dt: number, centerPos: THREE.Vector3, mode: WeatherType) => {
    if (mode !== 'rain' && mode !== 'snow') {
      points.visible = false;
      return;
    }
    points.visible = true;
    const isRain = mode === 'rain';
    mat.size = isRain ? 0.16 : 0.28;
    mat.color.set(isRain ? '#93c5fd' : '#ffffff');
    mat.opacity = isRain ? 0.58 : 0.85;

    const fallSpeed = isRain ? 34 : 6.5;
    const driftX = isRain ? -3 : Math.sin(performance.now() * 0.002) * 2.2;
    const attr = geo.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] += driftX * dt;
      arr[idx + 1] -= fallSpeed * dt;

      if (arr[idx + 1] < 0) {
        arr[idx] = centerPos.x + (Math.random() - 0.5) * 42;
        arr[idx + 1] = centerPos.y + 18 + Math.random() * 6;
        arr[idx + 2] = centerPos.z - 18 + (Math.random() - 0.5) * 58;
      }
    }
    attr.needsUpdate = true;
  };

  const dispose = () => {
    geo.dispose();
    mat.dispose();
  };

  return { points, update, dispose };
}

export function getTimeLightingColors(
  time: Exclude<TimeOfDay, 'dynamic'>,
  map: MapConfig
): {
  sky: string;
  fog: string;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  headlights: boolean;
} {
  if (map.id === 'night_city' || time === 'night') {
    return {
      sky: '#060913',
      fog: '#090d1c',
      sunColor: '#93c5fd',
      sunIntensity: 0.75,
      hemiSky: '#1e293b',
      hemiGround: '#090b10',
      hemiIntensity: 0.65,
      headlights: true,
    };
  }
  if (time === 'sunset') {
    return {
      sky: '#c2410c',
      fog: '#ea580c',
      sunColor: '#fdba74',
      sunIntensity: 1.65,
      hemiSky: '#fb923c',
      hemiGround: '#451a03',
      hemiIntensity: 0.8,
      headlights: true,
    };
  }
  if (time === 'dawn') {
    return {
      sky: '#475569',
      fog: '#94a3b8',
      sunColor: '#fde68a',
      sunIntensity: 1.25,
      hemiSky: '#cbd5e1',
      hemiGround: '#334155',
      hemiIntensity: 0.75,
      headlights: true,
    };
  }
  return {
    sky: map.skyHorizon,
    fog: map.fogColor,
    sunColor: '#fffbeb',
    sunIntensity: 1.85,
    hemiSky: map.skyTop,
    hemiGround: map.terrainColor,
    hemiIntensity: 0.85,
    headlights: false,
  };
}
