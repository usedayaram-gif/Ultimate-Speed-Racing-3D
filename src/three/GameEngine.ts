import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/SoundEngine';
import { CARS_CATALOG } from '../data/cars';
import { MAPS_CATALOG, MODES_CATALOG } from '../data/tracksAndModes';
import {
  CameraAngle,
  CarConfig,
  CarUpgrades,
  GraphicsQuality,
  Language,
  RaceHUDState,
  RaceLaunchConfig,
  RaceResult,
  TimeOfDay,
  WeatherType,
} from '../types/game';
import { getEffectiveStats } from '../utils/storage';
import {
  BuiltCarRig,
  buildPoliceCarMesh,
  buildSupercarMesh,
  buildTrafficVehicleMesh,
} from './carBuilder';
import {
  buildRaceTrackWorld,
  createWeatherParticles,
  getTimeLightingColors,
  ROAD_WIDTH,
  TrackWorld,
  WeatherParticles,
} from './environmentBuilder';

export interface ControlInputs {
  steer: number; // -1 (left) to +1 (right)
  throttle: boolean;
  brake: boolean;
  nitro: boolean;
}

interface RivalActor {
  rig: BuiltCarRig;
  dist: number;
  laneX: number;
  targetLaneX: number;
  speedMs: number;
  basePace: number;
  laneTimer: number;
}

interface TrafficActor {
  mesh: THREE.Group;
  dist: number;
  laneX: number;
  speedMs: number;
  halfLen: number;
  nearMissed: boolean;
}

const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _color = new THREE.Color();

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private lastTime = 0;

  // Lighting
  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  // Showroom state
  private mode: 'showroom' | 'race' = 'showroom';
  private showroomGroup: THREE.Group | null = null;
  private showroomCarRig: BuiltCarRig | null = null;
  private showroomAngle = 0.6;

  // Race state
  private raceConfig: RaceLaunchConfig | null = null;
  private playerCarConfig: CarConfig = CARS_CATALOG[0];
  private playerUpgrades: CarUpgrades = { engine: 0, turbo: 0, tires: 0, nitro: 0 };
  private playerColor = '#2563eb';
  private language: Language = 'en';
  private quality: GraphicsQuality = 'high';
  private cameraAngle: CameraAngle = 'chase';

  private trackWorld: TrackWorld | null = null;
  private weatherParticles: WeatherParticles | null = null;
  private playerRig: BuiltCarRig | null = null;
  private rivals: RivalActor[] = [];
  private traffic: TrafficActor[] = [];
  private policeRig: BuiltCarRig | null = null;
  private raceDynamicGroup: THREE.Group | null = null;

  // Physics & telemetry
  private phase: RaceHUDState['phase'] = 'countdown';
  private countdownTimer = 3.2;
  private lastCountdownInt = 4;
  private playerDist = 0;
  private playerLaneX = 0;
  private lateralVel = 0;
  private speedMs = 0;
  private nitro = 100;
  private health = 100;
  private elapsedTime = 0;
  private score = 0;
  private nearMissCount = 0;
  private nearMissCombo = 0;
  private comboTimer = 0;
  private topSpeedKmh = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private eventBanner: string | null = null;
  private eventBannerTimer = 0;

  // Police state
  private policeActive = false;
  private policeDist = -40;
  private policeLaneX = -2;
  private policeSpeedMs = 0;
  private bustProgress = 0;
  private evadeProgress = 0;
  private policeEvadedCount = 0;
  private policeCooldown = 0;

  // Dynamic time/weather state
  private activeTime: Exclude<TimeOfDay, 'dynamic'> = 'day';
  private activeWeather: Exclude<WeatherType, 'dynamic'> = 'clear';
  private envCycleTimer = 0;

  // Inputs & callbacks
  public inputs: ControlInputs = {
    steer: 0,
    throttle: false,
    brake: false,
    nitro: false,
  };
  private onHudUpdate: (hud: RaceHUDState) => void;
  private onRaceFinish: (result: RaceResult) => void;
  private hudEmitAccum = 0;

  constructor(
    container: HTMLElement,
    quality: GraphicsQuality,
    onHudUpdate: (hud: RaceHUDState) => void,
    onRaceFinish: (result: RaceResult) => void
  ) {
    this.container = container;
    this.quality = quality;
    this.onHudUpdate = onHudUpdate;
    this.onRaceFinish = onRaceFinish;

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
      antialias: !this.isSoftwareGl && quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.applyQualityPixelRatio();
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#090b10');
    this.scene.fog = new THREE.FogExp2('#090b10', 0.008);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(58, w / h, 0.25, 420);
    this.camera.position.set(4.5, 2.2, 6.2);

    // 3-point lighting rig
    this.hemiLight = new THREE.HemisphereLight('#93c5fd', '#1e293b', 0.85);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight('#fffbeb', 1.8);
    this.keyLight.position.set(16, 28, 18);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = quality === 'high' ? 1024 : 512;
    this.keyLight.shadow.mapSize.height = quality === 'high' ? 1024 : 512;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 90;
    const d = 24;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight('#38bdf8', 0.65);
    this.rimLight.position.set(-14, 10, -20);
    this.scene.add(this.rimLight);

    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    this.lastTime = performance.now();
    this.scheduleNextFrame();
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private applyQualityPixelRatio(): void {
    const cap =
      this.isSoftwareGl
        ? 1
        : this.quality === 'low'
        ? 1
        : this.quality === 'medium'
        ? Math.min(window.devicePixelRatio, 1.5)
        : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(cap);
  }

  public setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.applyQualityPixelRatio();
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && quality !== 'low';
  }

  public setCameraAngle(angle: CameraAngle): void {
    this.cameraAngle = angle;
  }

  public setLanguage(lang: Language): void {
    this.language = lang;
  }

  private handleResize = () => {
    if (!this.container || this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public enterShowroom(car: CarConfig, colorHex: string): void {
    this.clearRaceScene();
    this.mode = 'showroom';
    this.playerCarConfig = car;
    this.playerColor = colorHex;

    this.scene.background = new THREE.Color('#090b10');
    this.scene.fog = new THREE.FogExp2('#090b10', 0.022);
    this.hemiLight.color.set('#38bdf8');
    this.hemiLight.groundColor.set('#0f172a');
    this.hemiLight.intensity = 0.7;
    this.keyLight.color.set('#fffbeb');
    this.keyLight.intensity = 1.9;
    this.keyLight.position.set(8, 12, 8);
    this.keyLight.target.position.set(0, 0, 0);

    if (!this.showroomGroup) {
      this.showroomGroup = new THREE.Group();

      // Polished dark turntable floor
      const floorGeo = new THREE.CircleGeometry(28, 48);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({
        color: '#0f131c',
        roughness: 0.25,
        metalness: 0.65,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.receiveShadow = true;
      this.showroomGroup.add(floor);

      // Sleek turntable plinth
      const plinthGeo = new THREE.CylinderGeometry(3.4, 3.65, 0.16, 48);
      const plinthMat = new THREE.MeshStandardMaterial({
        color: '#181e29',
        roughness: 0.3,
        metalness: 0.8,
      });
      const plinth = new THREE.Mesh(plinthGeo, plinthMat);
      plinth.position.y = 0.08;
      plinth.receiveShadow = true;
      this.showroomGroup.add(plinth);

      // Glowing amber perimeter ring
      const ringGeo = new THREE.TorusGeometry(3.52, 0.035, 12, 64);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#f59e0b' });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.16;
      this.showroomGroup.add(ring);

      this.scene.add(this.showroomGroup);
    }

    if (this.showroomCarRig) {
      this.showroomGroup.remove(this.showroomCarRig.root);
      this.showroomCarRig = null;
    }

    this.showroomCarRig = buildSupercarMesh(car, colorHex, true);
    this.showroomCarRig.root.position.set(0, 0.16, 0);
    this.showroomGroup.add(this.showroomCarRig.root);
    this.camera.fov = 46;
    this.camera.updateProjectionMatrix();
  }

  public updateShowroomCar(car: CarConfig, colorHex: string): void {
    if (this.mode !== 'showroom') return;
    if (this.playerCarConfig.id === car.id && this.showroomCarRig) {
      this.playerColor = colorHex;
      this.showroomCarRig.paintMat.color.set(colorHex);
      return;
    }
    this.enterShowroom(car, colorHex);
  }

  private clearShowroom(): void {
    if (this.showroomGroup) {
      this.scene.remove(this.showroomGroup);
      this.showroomGroup = null;
      this.showroomCarRig = null;
    }
  }

  private clearRaceScene(): void {
    soundEngine.stopRaceAudio();
    if (this.trackWorld) {
      this.scene.remove(this.trackWorld.group);
      this.trackWorld.dispose();
      this.trackWorld = null;
    }
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles.points);
      this.weatherParticles.dispose();
      this.weatherParticles = null;
    }
    if (this.raceDynamicGroup) {
      this.scene.remove(this.raceDynamicGroup);
      this.raceDynamicGroup = null;
    }
    this.playerRig = null;
    this.policeRig = null;
    this.rivals = [];
    this.traffic = [];
  }

  public startRace(
    config: RaceLaunchConfig,
    car: CarConfig,
    upgrades: CarUpgrades,
    colorHex: string,
    language: Language
  ): void {
    this.clearShowroom();
    this.clearRaceScene();

    this.mode = 'race';
    this.raceConfig = config;
    this.playerCarConfig = car;
    this.playerUpgrades = upgrades;
    this.playerColor = colorHex;
    this.language = language;

    const mapCfg = MAPS_CATALOG.find((m) => m.id === config.map) ?? MAPS_CATALOG[0];
    const modeCfg = MODES_CATALOG.find((m) => m.id === config.mode) ?? MODES_CATALOG[0];

    this.activeTime =
      config.timeOfDay === 'dynamic' ? mapCfg.defaultTime : config.timeOfDay;
    this.activeWeather =
      config.weather === 'dynamic' ? mapCfg.defaultWeather : config.weather;

    const isNight = this.activeTime === 'night' || mapCfg.id === 'night_city';
    const isWet = this.activeWeather === 'rain';

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.trackWorld = buildRaceTrackWorld(
      mapCfg,
      isNight,
      isWet,
      config.distanceMeters,
      maxAniso,
      this.quality
    );
    this.scene.add(this.trackWorld.group);

    const pCount = this.quality === 'low' ? 180 : this.quality === 'medium' ? 350 : 600;
    this.weatherParticles = createWeatherParticles(pCount);
    this.scene.add(this.weatherParticles.points);

    this.raceDynamicGroup = new THREE.Group();
    this.scene.add(this.raceDynamicGroup);

    // Build Player Car
    this.playerRig = buildSupercarMesh(car, colorHex, true);
    this.raceDynamicGroup.add(this.playerRig.root);

    // Reset physics
    this.phase = 'countdown';
    this.countdownTimer = 3.2;
    this.lastCountdownInt = 4;
    this.playerDist = 0;
    this.playerLaneX = 0;
    this.lateralVel = 0;
    this.speedMs = 0;
    this.nitro = 100;
    this.health = 100;
    this.elapsedTime = 0;
    this.score = 0;
    this.nearMissCount = 0;
    this.nearMissCombo = 0;
    this.comboTimer = 0;
    this.topSpeedKmh = 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.eventBanner = null;
    this.eventBannerTimer = 0;
    this.envCycleTimer = 0;

    // Rivals
    const rivalCount = modeCfg.hasRivals ? modeCfg.rivalCount : 0;
    const playerEff = getEffectiveStats(car, upgrades);
    const playerBaseTopMs = (playerEff.topSpeed / 3.6);
    const lanes = [-5.4, -1.8, 1.8, 5.4];

    for (let i = 0; i < rivalCount; i++) {
      const rCar =
        CARS_CATALOG[(CARS_CATALOG.indexOf(car) + i * 3 + 2) % CARS_CATALOG.length];
      const rColor = rCar.palette[i % rCar.palette.length];
      const rig = buildSupercarMesh(rCar, rColor, isNight);
      const startDist = 8 + i * 7;
      const laneX = lanes[i % lanes.length];
      this.raceDynamicGroup.add(rig.root);
      this.rivals.push({
        rig,
        dist: startDist,
        laneX,
        targetLaneX: laneX,
        speedMs: 0,
        basePace: playerBaseTopMs * (0.86 + (i / Math.max(1, rivalCount)) * 0.14),
        laneTimer: 1.5 + i * 0.7,
      });
    }

    // Traffic
    if (modeCfg.hasTraffic) {
      const trafficColors = ['#cbd5e1', '#3b82f6', '#ef4444', '#10b981', '#64748b', '#eab308'];
      const variants: Array<'sedan' | 'suv' | 'truck' | 'taxi'> = [
        'sedan',
        'suv',
        'taxi',
        'truck',
      ];
      const tCount = config.mode === 'traffic' ? 18 : 12;
      for (let i = 0; i < tCount; i++) {
        const variant = variants[i % variants.length];
        const mesh = buildTrafficVehicleMesh(variant, trafficColors[i % trafficColors.length]);
        const laneX = lanes[i % lanes.length];
        const dist = 55 + i * 36 + Math.random() * 14;
        this.raceDynamicGroup.add(mesh);
        this.traffic.push({
          mesh,
          dist,
          laneX,
          speedMs: variant === 'truck' ? 20 : 25 + (i % 4) * 3.5,
          halfLen: variant === 'truck' ? 3.2 : 2.2,
          nearMissed: false,
        });
      }
    }

    // Police Chase Setup
    this.policeActive = config.policeEnabled;
    this.policeDist = -32;
    this.policeLaneX = -2.2;
    this.policeSpeedMs = 0;
    this.bustProgress = 0;
    this.evadeProgress = 0;
    this.policeEvadedCount = 0;
    this.policeCooldown = 0;

    if (config.policeEnabled || modeCfg.supportsPolice) {
      this.policeRig = buildPoliceCarMesh();
      this.policeRig.root.visible = this.policeActive;
      this.raceDynamicGroup.add(this.policeRig.root);
    }

    this.applyAtmosphere();
    this.syncActorTransforms(0);
    this.camera.fov = 62;
    this.camera.updateProjectionMatrix();
    soundEngine.startRaceAudio();
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    if (this.mode !== 'race' || this.phase === 'finished') return;
    if (paused && this.phase === 'racing') {
      this.phase = 'paused';
      soundEngine.updateRaceAudio(0, false, false, 0, false, 0, 0);
      this.emitHud();
    } else if (!paused && this.phase === 'paused') {
      this.phase = 'racing';
      this.lastTime = performance.now();
      this.emitHud();
    }
  }

  public restartRace(): void {
    if (!this.raceConfig) return;
    this.startRace(
      this.raceConfig,
      this.playerCarConfig,
      this.playerUpgrades,
      this.playerColor,
      this.language
    );
  }

  private applyAtmosphere(): void {
    if (!this.raceConfig) return;
    const mapCfg = MAPS_CATALOG.find((m) => m.id === this.raceConfig!.map) ?? MAPS_CATALOG[0];
    const lit = getTimeLightingColors(this.activeTime, mapCfg);

    (this.scene.background as THREE.Color).set(lit.sky);
    const fogDensity =
      this.activeWeather === 'fog'
        ? 0.017
        : this.activeWeather === 'rain' || this.activeWeather === 'snow'
        ? 0.01
        : 0.0055;
    this.scene.fog = new THREE.FogExp2(lit.fog, fogDensity);

    this.keyLight.color.set(lit.sunColor);
    this.keyLight.intensity = lit.sunIntensity;
    this.hemiLight.color.set(lit.hemiSky);
    this.hemiLight.groundColor.set(lit.hemiGround);
    this.hemiLight.intensity = lit.hemiIntensity;

    if (this.playerRig) {
      this.playerRig.headlightMat.emissiveIntensity = lit.headlights ? 2.6 : 0.7;
    }
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        this.tick();
      });
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
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

  private tick(): void {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    if (this.mode === 'showroom') {
      this.updateShowroom(dt);
    } else if (this.mode === 'race') {
      this.updateRace(dt, now / 1000);
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  private updateShowroom(dt: number): void {
    this.showroomAngle += dt * 0.34;
    const radius = 5.9;
    const camX = Math.sin(this.showroomAngle) * radius;
    const camZ = Math.cos(this.showroomAngle) * radius;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 4, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 1.85, 4, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 4, dt);
    this.camera.lookAt(0, 0.65, 0);
  }

  private updateRace(dt: number, nowSec: number): void {
    if (!this.raceConfig || !this.trackWorld || !this.playerRig) return;

    if (this.phase === 'paused' || this.phase === 'finished') {
      return;
    }

    // Countdown handling
    if (this.phase === 'countdown') {
      this.countdownTimer -= dt;
      const step = Math.max(0, Math.ceil(this.countdownTimer));
      if (step < this.lastCountdownInt) {
        this.lastCountdownInt = step;
        soundEngine.playCountdownStep(step, this.language);
      }
      if (this.countdownTimer <= 0) {
        this.phase = 'racing';
        soundEngine.playCountdownStep(0, this.language);
      }
      this.updateRaceCamera(dt, false);
      this.emitHud();
      return;
    }

    // Hitstop on heavy collision
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateRaceCamera(dt, false);
      return;
    }

    this.elapsedTime += dt;

    // Dynamic Weather & Time Cycling
    if (this.raceConfig.timeOfDay === 'dynamic' || this.raceConfig.weather === 'dynamic') {
      this.envCycleTimer += dt;
      if (this.envCycleTimer > 14) {
        this.envCycleTimer = 0;
        if (this.raceConfig.timeOfDay === 'dynamic') {
          const order: Array<Exclude<TimeOfDay, 'dynamic'>> = ['day', 'sunset', 'night', 'dawn'];
          this.activeTime = order[(order.indexOf(this.activeTime) + 1) % order.length];
        }
        if (this.raceConfig.weather === 'dynamic') {
          const wOrder: Array<Exclude<WeatherType, 'dynamic'>> = ['clear', 'rain', 'fog', 'clear'];
          this.activeWeather = wOrder[(wOrder.indexOf(this.activeWeather) + 1) % wOrder.length];
        }
        this.applyAtmosphere();
      }
    }

    if (this.eventBannerTimer > 0) {
      this.eventBannerTimer -= dt;
      if (this.eventBannerTimer <= 0) this.eventBanner = null;
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.nearMissCombo = 0;
    }

    // Player Car Physics
    const stats = getEffectiveStats(this.playerCarConfig, this.playerUpgrades);
    const isNitro = this.inputs.nitro && this.nitro > 2 && this.speedMs > 8;
    const weatherGrip =
      this.activeWeather === 'rain' ? 0.86 : this.activeWeather === 'snow' ? 0.8 : 1.0;

    const maxSpeedMs = (stats.topSpeed / 3.6) * (isNitro ? 1.24 : 1.0);
    const accelRate = (14 + stats.acceleration * 0.28) * (isNitro ? 1.55 : 1.0) * weatherGrip;

    if (this.inputs.throttle || isNitro) {
      const ratio = Math.max(0.15, 1 - (this.speedMs / maxSpeedMs) * 0.72);
      this.speedMs = Math.min(maxSpeedMs, this.speedMs + accelRate * ratio * dt);
    } else if (this.inputs.brake) {
      this.speedMs = Math.max(0, this.speedMs - 48 * dt);
    } else {
      // Natural aerodynamic drag
      this.speedMs = Math.max(0, this.speedMs - (6.5 + this.speedMs * 0.08) * dt);
    }

    // Nitro consumption / regen
    if (isNitro) {
      const drainRate = 24 - (stats.nitro - 70) * 0.18;
      this.nitro = Math.max(0, this.nitro - Math.max(10, drainRate) * dt);
    } else {
      this.nitro = Math.min(100, this.nitro + (3.2 + (this.speedMs / maxSpeedMs) * 3.5) * dt);
    }

    // Lateral steering
    const steerInput = THREE.MathUtils.clamp(this.inputs.steer, -1, 1);
    const speedFactor = THREE.MathUtils.clamp(this.speedMs / 18, 0.15, 1.0);
    const steerPower = (11.5 + stats.handling * 0.11) * weatherGrip;
    const targetLatVel = steerInput * steerPower * speedFactor;
    this.lateralVel = THREE.MathUtils.damp(this.lateralVel, targetLatVel, 9, dt);
    this.playerLaneX += this.lateralVel * dt;

    // Guardrail boundaries
    const maxLaneX = ROAD_WIDTH / 2 - 1.25;
    if (Math.abs(this.playerLaneX) > maxLaneX) {
      this.playerLaneX = Math.sign(this.playerLaneX) * maxLaneX;
      if (Math.abs(this.lateralVel) > 2.5) {
        this.speedMs *= 0.92;
        this.shakeIntensity = Math.max(this.shakeIntensity, 0.25);
        soundEngine.playCollision(0.35);
      }
      this.lateralVel *= -0.3;
    }

    this.playerDist += this.speedMs * dt;
    const speedKmh = this.speedMs * 3.6;
    if (speedKmh > this.topSpeedKmh) this.topSpeedKmh = speedKmh;
    this.score += Math.round(this.speedMs * dt * 1.4);

    // Update Track Chunks
    this.trackWorld.updateChunks(this.playerDist);

    // Update Rivals
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      // Subtle rubber banding so races stay exciting
      const distDelta = r.dist - this.playerDist;
      const rubberBand = THREE.MathUtils.clamp(-distDelta * 0.14, -7, 9);
      const targetSpd = Math.max(22, r.basePace + rubberBand);
      r.speedMs = THREE.MathUtils.damp(r.speedMs, targetSpd, 2.2, dt);
      r.dist += r.speedMs * dt;

      r.laneTimer -= dt;
      if (r.laneTimer <= 0) {
        r.laneTimer = 1.6 + Math.random() * 2.2;
        const lanes = [-5.4, -1.8, 1.8, 5.4];
        r.targetLaneX = lanes[Math.floor(Math.random() * lanes.length)];
      }
      r.laneX = THREE.MathUtils.damp(r.laneX, r.targetLaneX, 3.2, dt);
    }

    // Update Traffic & Near Miss / Collision detection
    for (let i = 0; i < this.traffic.length; i++) {
      const t = this.traffic[i];
      t.dist += t.speedMs * dt;

      // Recycle traffic far behind player to ahead
      if (t.dist < this.playerDist - 35) {
        t.dist = this.playerDist + 240 + Math.random() * 190;
        const lanes = [-5.4, -1.8, 1.8, 5.4];
        t.laneX = lanes[Math.floor(Math.random() * lanes.length)];
        t.nearMissed = false;
      }

      const dz = Math.abs(t.dist - this.playerDist);
      const dx = Math.abs(t.laneX - this.playerLaneX);

      // Collision check
      if (dz < t.halfLen + 2.1 && dx < 1.85) {
        // Bounce traffic forward & knock player speed
        t.dist += 6.5;
        this.speedMs = Math.max(12, this.speedMs * 0.45);
        this.hitstopTimer = 0.045;
        this.shakeIntensity = 0.7;
        this.nearMissCombo = 0;
        soundEngine.playCollision(0.9);
        if (this.raceConfig.mode === 'traffic') {
          this.health = Math.max(0, this.health - 34);
          if (this.health <= 0) {
            this.finishRace(false, false, true);
            return;
          }
        }
      } else if (!t.nearMissed && dz < t.halfLen + 2.8 && dx >= 1.85 && dx < 3.4 && speedKmh > 110) {
        // Near miss!
        t.nearMissed = true;
        this.nearMissCount += 1;
        this.nearMissCombo += 1;
        this.comboTimer = 4.0;
        this.score += 150 * this.nearMissCombo;
        this.nitro = Math.min(100, this.nitro + 12);
        this.eventBanner = `${this.language === 'hi' ? 'नज़दीकी पास' : 'NEAR MISS'} x${this.nearMissCombo}`;
        this.eventBannerTimer = 1.4;
        soundEngine.playNearMiss();
      }
    }

    // Police Chase Logic
    if (this.raceConfig.policeEnabled) {
      if (!this.policeActive) {
        this.policeCooldown -= dt;
        if (this.policeCooldown <= 0 && this.playerDist > 120) {
          this.policeActive = true;
          this.policeDist = this.playerDist - 28;
          this.policeLaneX = this.playerLaneX;
          this.policeSpeedMs = this.speedMs * 0.9;
          this.bustProgress = 0;
          this.evadeProgress = 0;
          if (this.policeRig) this.policeRig.root.visible = true;
        }
      } else if (this.policeRig) {
        const targetPoliceSpd = Math.min(
          115,
          Math.max(45, this.speedMs * 1.06 + (this.playerDist - this.policeDist) * 0.45)
        );
        this.policeSpeedMs = THREE.MathUtils.damp(this.policeSpeedMs, targetPoliceSpd, 2.5, dt);
        this.policeDist += this.policeSpeedMs * dt;
        this.policeLaneX = THREE.MathUtils.damp(this.policeLaneX, this.playerLaneX, 3.4, dt);

        const gap = Math.abs(this.playerDist - this.policeDist);
        const latGap = Math.abs(this.playerLaneX - this.policeLaneX);

        // Ram / contact check
        if (gap < 4.2 && latGap < 1.9) {
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.35);
          this.speedMs = Math.max(10, this.speedMs * 0.88);
          this.policeDist -= 2.2;
          soundEngine.playCollision(0.5);
        }

        // Bust risk if close and slow
        if (gap < 15 && speedKmh < 120) {
          this.bustProgress = Math.min(100, this.bustProgress + 28 * dt);
          this.evadeProgress = Math.max(0, this.evadeProgress - 20 * dt);
          if (this.bustProgress >= 100) {
            this.finishRace(false, true, false);
            return;
          }
        } else {
          this.bustProgress = Math.max(0, this.bustProgress - 18 * dt);
        }

        // Evading if outrunning > 48m ahead
        if (this.playerDist - this.policeDist > 48) {
          this.evadeProgress = Math.min(100, this.evadeProgress + 28 * dt);
          if (this.evadeProgress >= 100) {
            this.policeEvadedCount += 1;
            this.policeActive = false;
            this.policeCooldown = 14;
            this.policeRig.root.visible = false;
            this.score += 1000;
            this.eventBanner =
              this.language === 'hi'
                ? 'पुलिस से बच निकले +500 सिक्के'
                : 'POLICE EVADED +500 COINS';
            this.eventBannerTimer = 2.4;
            soundEngine.playCoin();
          }
        } else {
          this.evadeProgress = Math.max(0, this.evadeProgress - 15 * dt);
        }

        // Flash police lightbar
        const flashRed = Math.floor(nowSec * 10) % 2 === 0;
        if (this.policeRig.policeRedMat && this.policeRig.policeBlueMat) {
          this.policeRig.policeRedMat.color.set(flashRed ? '#ff1e1e' : '#450a0a');
          this.policeRig.policeBlueMat.color.set(flashRed ? '#172554' : '#3b82f6');
        }
      }
    }

    // Visual sync & animations
    this.syncActorTransforms(dt, isNitro, steerInput);

    // Weather particles around player
    if (this.weatherParticles) {
      this.weatherParticles.update(dt, this.playerRig.root.position, this.activeWeather);
    }

    // Update audio engine
    const gearFloat = (speedKmh / stats.topSpeed) * 6.5;
    const gearFrac = gearFloat - Math.floor(gearFloat);
    const rpmRatio = THREE.MathUtils.clamp(0.25 + gearFrac * 0.72, 0.2, 1.0);
    const policeProx = this.policeActive
      ? THREE.MathUtils.clamp(1 - Math.abs(this.playerDist - this.policeDist) / 60, 0, 1)
      : 0;
    soundEngine.updateRaceAudio(
      rpmRatio,
      this.inputs.throttle || isNitro,
      isNitro,
      Math.abs(steerInput) * (speedKmh / 240),
      this.policeActive,
      policeProx,
      nowSec
    );

    // Camera update
    this.updateRaceCamera(dt, isNitro);

    // Finish line check
    if (
      this.raceConfig.distanceMeters > 0 &&
      this.playerDist >= this.raceConfig.distanceMeters
    ) {
      const pos = this.computePlayerPosition();
      const victory = pos <= (this.raceConfig.mode === 'time_trial' ? 1 : 3);
      this.finishRace(victory, false, false);
      return;
    }

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private syncActorTransforms(dt: number, isNitro = false, steerInput = 0): void {
    if (!this.trackWorld || !this.playerRig) return;
    const sampler = this.trackWorld.sampler;

    // Player
    const px = sampler.getX(this.playerDist) + this.playerLaneX;
    const py = sampler.getY(this.playerDist);
    const slope = sampler.getSlopeY(this.playerDist);
    const tangent = sampler.getTangentX(this.playerDist);

    this.playerRig.root.position.set(px, py, -this.playerDist);
    this.playerRig.root.rotation.y = Math.atan(-tangent) - steerInput * 0.08;
    this.playerRig.root.rotation.x = Math.atan(slope);
    this.playerRig.root.rotation.z = -steerInput * 0.045 * Math.min(1, this.speedMs / 35);

    // Wheel spin + front steer + brake glow + nitro flames
    const wheelSpin = this.speedMs * dt * 2.8;
    this.playerRig.wheels.forEach((w) => {
      w.rotation.x -= wheelSpin;
    });
    this.playerRig.frontWheelPivots.forEach((p) => {
      p.rotation.y = -steerInput * 0.32;
    });
    this.playerRig.taillightMat.emissiveIntensity = this.inputs.brake ? 3.5 : 1.4;
    this.playerRig.nitroFlames.forEach((f) => {
      f.visible = isNitro;
      if (isNitro) {
        f.scale.z = 0.8 + Math.random() * 0.6;
      }
    });

    // Rivals
    for (let i = 0; i < this.rivals.length; i++) {
      const r = this.rivals[i];
      const rx = sampler.getX(r.dist) + r.laneX;
      const ry = sampler.getY(r.dist);
      r.rig.root.position.set(rx, ry, -r.dist);
      r.rig.root.rotation.y = Math.atan(-sampler.getTangentX(r.dist));
      r.rig.root.rotation.x = Math.atan(sampler.getSlopeY(r.dist));
      r.rig.wheels.forEach((w) => {
        w.rotation.x -= r.speedMs * dt * 2.8;
      });
    }

    // Traffic
    for (let i = 0; i < this.traffic.length; i++) {
      const t = this.traffic[i];
      const tx = sampler.getX(t.dist) + t.laneX;
      const ty = sampler.getY(t.dist);
      t.mesh.position.set(tx, ty, -t.dist);
      t.mesh.rotation.y = Math.atan(-sampler.getTangentX(t.dist));
      t.mesh.rotation.x = Math.atan(sampler.getSlopeY(t.dist));
    }

    // Police
    if (this.policeRig && this.policeActive) {
      const polX = sampler.getX(this.policeDist) + this.policeLaneX;
      const polY = sampler.getY(this.policeDist);
      this.policeRig.root.position.set(polX, polY, -this.policeDist);
      this.policeRig.root.rotation.y = Math.atan(-sampler.getTangentX(this.policeDist));
      this.policeRig.root.rotation.x = Math.atan(sampler.getSlopeY(this.policeDist));
    }

    // Keep Directional Shadow Frustum centered on player
    this.keyLight.position.set(px + 18, py + 32, -this.playerDist + 14);
    this.keyLight.target.position.set(px, py, -this.playerDist - 12);
    this.keyLight.target.updateMatrixWorld();
  }

  private updateRaceCamera(dt: number, isNitro: boolean): void {
    if (!this.playerRig || !this.trackWorld) return;
    const pos = this.playerRig.root.position;
    const tangent = this.trackWorld.sampler.getTangentX(this.playerDist);

    let offsetY = 2.65;
    let offsetBack = 6.8;
    let lookAhead = 14;
    let baseFov = 62;

    if (this.cameraAngle === 'hood') {
      offsetY = 1.25;
      offsetBack = 0.4;
      lookAhead = 22;
      baseFov = 68;
      this.playerRig.root.visible = true;
    } else if (this.cameraAngle === 'bumper') {
      offsetY = 0.72;
      offsetBack = -1.9;
      lookAhead = 25;
      baseFov = 74;
    } else if (this.cameraAngle === 'cinematic') {
      offsetY = 4.1;
      offsetBack = 10.5;
      lookAhead = 16;
      baseFov = 58;
    }

    const targetFov = baseFov + (isNitro ? 14 : (this.speedMs / 110) * 6);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    // Camera shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0.01) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 8, dt);
    }

    _vec3.set(
      pos.x - tangent * offsetBack + shakeX,
      pos.y + offsetY + shakeY,
      pos.z + offsetBack
    );
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _vec3.x, 10, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _vec3.y, 10, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _vec3.z, 18, dt);

    const aheadDist = this.playerDist + lookAhead;
    _vec3B.set(
      this.trackWorld.sampler.getX(aheadDist) + this.playerLaneX * 0.55,
      this.trackWorld.sampler.getY(aheadDist) + 1.0,
      -aheadDist
    );
    this.camera.lookAt(_vec3B);
  }

  private computePlayerPosition(): number {
    let pos = 1;
    for (let i = 0; i < this.rivals.length; i++) {
      if (this.rivals[i].dist > this.playerDist) pos++;
    }
    return pos;
  }

  private emitHud(): void {
    if (!this.raceConfig) return;
    const stats = getEffectiveStats(this.playerCarConfig, this.playerUpgrades);
    const speedKmh = Math.round(this.speedMs * 3.6);
    const gear = Math.min(7, Math.max(1, Math.ceil((speedKmh / stats.topSpeed) * 7)));
    const gearSpan = stats.topSpeed / 7;
    const rpmRatio =
      speedKmh < 5
        ? 0.18
        : THREE.MathUtils.clamp(((speedKmh % gearSpan) / gearSpan) * 0.7 + 0.25, 0.2, 1);

    const targetDist = this.raceConfig.distanceMeters;
    const progress = targetDist > 0 ? Math.min(1, this.playerDist / targetDist) : 0;

    this.onHudUpdate({
      phase: this.phase,
      countdownValue: Math.max(0, Math.ceil(this.countdownTimer)),
      speedKmh,
      rpmRatio,
      gear,
      nitro: Math.round(this.nitro),
      isNitroActive: this.inputs.nitro && this.nitro > 2 && this.speedMs > 8,
      position: this.computePlayerPosition(),
      totalRacers: this.rivals.length + 1,
      progress,
      distanceMeters: Math.round(this.playerDist),
      targetDistanceMeters: targetDist,
      elapsedTime: this.elapsedTime,
      score: this.score,
      nearMissCount: this.nearMissCount,
      nearMissCombo: this.nearMissCombo,
      topSpeedKmh: Math.round(this.topSpeedKmh),
      policeActive: this.policeActive,
      policeDistanceMeters: Math.round(Math.abs(this.playerDist - this.policeDist)),
      bustProgress: Math.round(this.bustProgress),
      evadeProgress: Math.round(this.evadeProgress),
      health: Math.round(this.health),
      activeTimeOfDay: this.activeTime,
      activeWeather: this.activeWeather,
      cameraAngle: this.cameraAngle,
      eventBanner: this.eventBanner,
    });
  }

  private finishRace(victory: boolean, busted: boolean, crashed: boolean): void {
    if (!this.raceConfig) return;
    this.phase = 'finished';
    soundEngine.stopRaceAudio();
    if (victory && !busted && !crashed) {
      soundEngine.playCoin();
    }

    const modeCfg =
      MODES_CATALOG.find((m) => m.id === this.raceConfig!.mode) ?? MODES_CATALOG[0];
    const pos = this.computePlayerPosition();
    const totalRacers = this.rivals.length + 1;

    const base = busted || crashed ? Math.round(modeCfg.baseRewardCoins * 0.25) : modeCfg.baseRewardCoins;
    const placement =
      busted || crashed || totalRacers <= 1
        ? 0
        : pos === 1
        ? 1200
        : pos === 2
        ? 700
        : pos === 3
        ? 400
        : 100;
    const nearMissCoins = this.nearMissCount * 45;
    const policeCoins = this.policeEvadedCount * 500;
    const speedBonus = this.topSpeedKmh >= 300 ? Math.round((this.topSpeedKmh - 260) * 4) : 0;
    const total = base + placement + nearMissCoins + policeCoins + speedBonus;

    this.emitHud();
    this.onRaceFinish({
      victory: victory && !busted && !crashed,
      busted,
      crashed,
      position: pos,
      totalRacers,
      elapsedTime: this.elapsedTime,
      topSpeedKmh: Math.round(this.topSpeedKmh),
      nearMissCount: this.nearMissCount,
      policeEvaded: this.policeEvadedCount,
      distanceKm: Number((this.playerDist / 1000).toFixed(2)),
      score: this.score,
      coinsEarned: {
        base,
        placement,
        nearMiss: nearMissCoins,
        police: policeCoins,
        speedBonus,
        total,
      },
      config: this.raceConfig,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.clearRaceScene();
    this.clearShowroom();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    void _color;
  }
}
