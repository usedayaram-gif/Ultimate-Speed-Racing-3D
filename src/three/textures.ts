import * as THREE from 'three';

export function createRoadTexture(
  roadColor: string,
  shoulderColor: string,
  maxAnisotropy: number,
  isWet = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base asphalt
  ctx.fillStyle = roadColor;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain noise
  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = isWet
      ? 20 + Math.floor(Math.random() * 35)
      : 35 + Math.floor(Math.random() * 35);
    ctx.fillStyle = `rgba(${shade}, ${shade + 4}, ${shade + 10}, 0.25)`;
    ctx.fillRect(x, y, 2, 3);
  }

  // Shoulders / rumble strips on left & right edges
  ctx.fillStyle = shoulderColor;
  ctx.fillRect(0, 0, 34, 512);
  ctx.fillRect(478, 0, 34, 512);

  // Racing red/white apex curbs along edges
  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = (y / 64) % 2 === 0 ? '#ef4444' : '#f8fafc';
    ctx.fillRect(34, y, 10, 64);
    ctx.fillRect(468, y, 10, 64);
  }

  // Outer solid lane edge lines
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(50, 0, 5, 512);
  ctx.fillRect(457, 0, 5, 512);

  // 4-lane road dashed dividers (at x = 152, 256, 360)
  ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
  for (let y = 16; y < 512; y += 96) {
    ctx.fillRect(150, y, 5, 48);
    ctx.fillRect(357, y, 5, 48);
  }

  // Center double amber line
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(250, 0, 4, 512);
  ctx.fillRect(258, 0, 4, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createTerrainTexture(
  baseColor: string,
  accentColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 4;
    ctx.fillRect(x, y, r, r);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(32, 32);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBuildingTexture(
  isNight: boolean,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = isNight ? '#0a0f1c' : '#1e293b';
  ctx.fillRect(0, 0, 256, 512);

  const cols = 8;
  const rows = 16;
  const padX = 8;
  const padY = 8;
  const w = (256 - padX * (cols + 1)) / cols;
  const h = (512 - padY * (rows + 1)) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = isNight ? Math.random() > 0.42 : Math.random() > 0.25;
      if (lit) {
        if (isNight) {
          ctx.fillStyle =
            Math.random() > 0.85
              ? accentHex
              : Math.random() > 0.5
              ? '#fde68a'
              : '#bae6fd';
        } else {
          ctx.fillStyle = Math.random() > 0.5 ? '#64748b' : '#94a3b8';
        }
      } else {
        ctx.fillStyle = isNight ? '#0f172a' : '#334155';
      }
      ctx.fillRect(padX + c * (w + padX), padY + r * (h + padY), w, h);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 128, 256);
  const grad = ctx.createRadialGradient(64, 128, 14, 64, 128, 64);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCheckeredTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const size = 16;
  for (let y = 0; y < 64; y += size) {
    for (let x = 0; x < 256; x += size) {
      ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#ffffff' : '#0f172a';
      ctx.fillRect(x, y, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
