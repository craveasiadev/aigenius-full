import * as THREE from 'three';

const wallCache = new Map<string, THREE.CanvasTexture>();
const floorCache = new Map<string, THREE.CanvasTexture>();
let officeWallTexture: THREE.CanvasTexture | null = null;

function makeWallTexture(baseColor: string, styleId?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const S = 512;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, S, S);

  switch (styleId) {
    case 'iwall_white': {
      ctx.strokeStyle = 'rgba(200,195,188,0.25)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= S; x += S / 4) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke(); }
      for (let y = 0; y <= S; y += S / 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
      break;
    }
    case 'iwall_cream': {
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = '#c8a880';
        ctx.lineWidth = 10 + i * 3;
        ctx.beginPath();
        ctx.moveTo(0, 30 + i * 60);
        ctx.quadraticCurveTo(S / 2, 20 + i * 60 + (i % 2 ? 20 : -20), S, 30 + i * 60);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'iwall_pink': {
      const drawFlower = (cx: number, cy: number, r: number) => {
        ctx.globalAlpha = 0.22;
        for (let a = 0; a < 5; a++) {
          const angle = (a / 5) * Math.PI * 2;
          ctx.fillStyle = '#e890a8';
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(angle) * r * 1.3, cy + Math.sin(angle) * r * 1.3, r, r * 0.6, angle, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f0a0b8';
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      };
      [[80, 80], [300, 60], [160, 240], [400, 200], [60, 400], [320, 360], [480, 440], [200, 480],
       [450, 100], [120, 150], [380, 320], [50, 280]].forEach(([x, y]) => drawFlower(x, y, 18));
      break;
    }
    case 'iwall_mint': {
      const drawLeaf = (cx: number, cy: number, s: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#6ec490';
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.8, -s * 0.3, 0, s);
        ctx.quadraticCurveTo(-s * 0.8, -s * 0.3, 0, -s);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      };
      [[100, 100, 24, 0.3], [320, 80, 20, -0.5], [200, 260, 28, 0.8], [440, 220, 18, -0.2],
       [80, 420, 22, 0.6], [360, 400, 26, -0.7], [240, 480, 16, 0.1], [480, 340, 20, 0.4],
       [160, 360, 22, -0.3], [400, 480, 18, 0.9]].forEach(([x, y, s, r]) => drawLeaf(x, y, s, r));
      break;
    }
    case 'iwall_sky': {
      const drawCloud = (cx: number, cy: number, w: number) => {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(cx, cy, w, w * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + w * 0.6, cy - w * 0.1, w * 0.7, w * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx - w * 0.5, cy + w * 0.05, w * 0.6, w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      };
      drawCloud(120, 100, 60); drawCloud(380, 90, 50); drawCloud(200, 300, 55); drawCloud(440, 350, 42);
      drawCloud(80, 450, 48); drawCloud(350, 470, 38);
      break;
    }
    case 'iwall_lavender': {
      ctx.strokeStyle = '#b090e0'; ctx.lineWidth = 2.5;
      const drawStar = (cx: number, cy: number, r: number) => {
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 4;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        ctx.stroke();
        ctx.fillStyle = '#c0a0ee';
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      };
      [[80, 60], [280, 100], [460, 50], [140, 240], [360, 220], [100, 400], [300, 380],
       [480, 340], [200, 480], [420, 480], [50, 170], [450, 160]].forEach(([x, y]) => drawStar(x, y, 20));
      break;
    }
    case 'iwall_charcoal': {
      const ts = S / 8;
      for (let gx = 0; gx < 8; gx++) for (let gy = 0; gy < 8; gy++) {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? '#3d4a5c' : '#313d4e';
        ctx.fillRect(gx * ts + 1, gy * ts + 1, ts - 2, ts - 2);
      }
      break;
    }
    case 'iwall_sunset': {
      const g = ctx.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, '#fdba74'); g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 30 + i * 48);
        ctx.quadraticCurveTo(S / 3, 20 + i * 48 + (i % 2 ? 15 : -15), S * 2 / 3, 30 + i * 48);
        ctx.quadraticCurveTo(S, 40 + i * 48 + (i % 2 ? -12 : 12), S, 30 + i * 48);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    default: {
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 200; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
        const x = (i * 97 + 31) % S, y = (i * 53 + 17) % S;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 0.02;
      ctx.strokeStyle = '#000000'; ctx.lineWidth = 0.5;
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i * 137 + 23) % S);
        ctx.lineTo(S, (i * 89 + 47) % S);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1);
  texture.generateMipmaps = true;
  texture.anisotropy = 1;
  return texture;
}

function makeFloorTexture(baseColor: string, styleId?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const S = 512;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, S, S);

  switch (styleId) {
    case 'ifloor_wood': {
      const plankH = S / 8;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#c4a882' : '#b89870';
        ctx.fillRect(0, i * plankH, S, plankH);
        ctx.strokeStyle = '#a08060'; ctx.lineWidth = 1.5;
        ctx.strokeRect(0, i * plankH, S, plankH);
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#8a6e50'; ctx.lineWidth = 0.8;
        for (let g = 0; g < 4; g++) {
          ctx.beginPath();
          ctx.moveTo(0, i * plankH + 6 + g * 14);
          ctx.quadraticCurveTo(S / 2, i * plankH + 4 + g * 14 + (g % 2 ? 6 : -4), S, i * plankH + 6 + g * 14);
          ctx.stroke();
        }
        if (i % 3 === 0) {
          ctx.fillStyle = '#8a6e50';
          ctx.beginPath(); ctx.ellipse(160 + i * 40, i * plankH + plankH / 2, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ifloor_dark': {
      const pH = S / 8;
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#5c3a1e' : '#4e3018';
        ctx.fillRect(0, i * pH, S, pH);
        ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 1.5;
        ctx.strokeRect(0, i * pH, S, pH);
        ctx.globalAlpha = 0.2; ctx.strokeStyle = '#2e1a0c'; ctx.lineWidth = 0.6;
        for (let g = 0; g < 4; g++) {
          ctx.beginPath();
          ctx.moveTo(0, i * pH + 5 + g * 14);
          ctx.quadraticCurveTo(S / 2, i * pH + 3 + g * 14 + (g % 2 ? 8 : -5), S, i * pH + 5 + g * 14);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'ifloor_marble': {
      ctx.strokeStyle = '#c8c0b4'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.4;
      const vein = (x0: number, y0: number, x1: number, y1: number, cx: number, cy: number) => {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
      };
      vein(40, 0, 80, S, 160, S / 2);
      vein(200, 0, 160, S, 100, S / 3);
      vein(360, 0, 400, S, 460, S / 2);
      ctx.lineWidth = 1.5; ctx.globalAlpha = 0.25;
      vein(120, 0, 60, S, 20, S * 0.6);
      vein(300, 0, 340, S, 380, S * 0.4);
      vein(440, 0, 480, S / 2, 500, S * 0.3);
      ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.08;
      for (let i = 0; i < 60; i++) {
        const sx = (i * 97 + 13) % S, sy = (i * 149 + 29) % S;
        ctx.fillStyle = '#a0988c';
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'ifloor_tile': {
      const ts = S / 6;
      for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 6; gy++) {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? '#5b9cf0' : '#6bb0ff';
        ctx.fillRect(gx * ts + 2, gy * ts + 2, ts - 4, ts - 4);
        ctx.strokeStyle = '#4a8ae0'; ctx.lineWidth = 2;
        ctx.strokeRect(gx * ts + 2, gy * ts + 2, ts - 4, ts - 4);
      }
      break;
    }
    case 'ifloor_concrete': {
      ctx.globalAlpha = 0.15;
      const pts = [[20, 30], [100, 60], [180, 20], [260, 90], [340, 40], [420, 110], [480, 70],
        [60, 140], [140, 180], [220, 150], [300, 200], [380, 160], [460, 210], [50, 260],
        [120, 300], [200, 280], [280, 320], [360, 290], [440, 340], [70, 400],
        [160, 420], [240, 390], [320, 440], [400, 410], [480, 460],
        [40, 480], [130, 500], [250, 470], [370, 500], [470, 490]];
      pts.forEach(([x, y], i) => {
        ctx.fillStyle = i % 2 === 0 ? '#8890a0' : '#a8b0bc';
        ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2); ctx.fill();
      });
      ctx.strokeStyle = '#8890a0'; ctx.lineWidth = 1; ctx.globalAlpha = 0.1;
      ctx.beginPath(); ctx.moveTo(40, 160); ctx.lineTo(200, 190); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(300, 320); ctx.lineTo(460, 350); ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case 'ifloor_pink': {
      ctx.globalAlpha = 0.22;
      [[60, 80], [200, 50], [360, 100], [120, 220], [280, 200], [440, 160],
       [80, 360], [240, 340], [400, 320], [160, 460], [340, 480], [480, 420],
       [40, 500], [300, 500], [450, 280]].forEach(([x, y], i) => {
        ctx.fillStyle = '#f080b0';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(i * 0.7);
        ctx.beginPath(); ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      break;
    }
    case 'ifloor_green': {
      ctx.globalAlpha = 0.25;
      [[60, 80], [200, 40], [360, 100], [120, 240], [280, 180], [440, 140],
       [80, 380], [240, 360], [400, 340], [160, 480], [320, 460], [480, 400],
       [40, 160], [300, 300], [460, 260]].forEach(([x, y]) => {
        ctx.fillStyle = '#1e8040';
        ctx.beginPath();
        ctx.moveTo(x, y - 22); ctx.lineTo(x - 14, y + 10); ctx.lineTo(x + 14, y + 10); ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#145028'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x, y - 22); ctx.lineTo(x, y + 10); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      break;
    }
    case 'ifloor_galaxy': {
      const grd = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.7);
      grd.addColorStop(0, '#3b2d8e'); grd.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#7050c0';
      ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(-0.3);
      ctx.beginPath(); ctx.ellipse(0, 0, S * 0.6, S * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      const stars = [[40, 40], [120, 80], [260, 30], [400, 70], [480, 20],
        [60, 160], [180, 200], [320, 140], [440, 180], [80, 280],
        [220, 260], [360, 300], [480, 240], [40, 380], [160, 420],
        [300, 360], [420, 400], [100, 500], [260, 460], [400, 500],
        [30, 240], [340, 220], [460, 340], [200, 100], [120, 340],
        [500, 100], [70, 460], [250, 180], [380, 480], [150, 60]];
      stars.forEach(([x, y], i) => {
        const r = i % 5 === 0 ? 3.5 : i % 3 === 0 ? 2.5 : 1.5;
        ctx.fillStyle = i % 4 === 0 ? '#e0d0ff' : i % 3 === 0 ? '#a0c0ff' : '#ffffff';
        ctx.globalAlpha = 0.4 + (i % 3) * 0.2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      break;
    }
    default: {
      const tileSize = 128;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= S; x += tileSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
      }
      for (let y = 0; y <= S; y += tileSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
      }
      ctx.globalAlpha = 0.05;
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#000000';
          ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
        }
      }
      ctx.globalAlpha = 1;
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  const useSmallRepeat = styleId === 'ifloor_wood' || styleId === 'ifloor_dark' || styleId === 'ifloor_marble';
  texture.repeat.set(useSmallRepeat ? 3 : 4, useSmallRepeat ? 3 : 4);
  texture.generateMipmaps = true;
  texture.anisotropy = 1;
  return texture;
}

function makeOfficeWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const S = 512;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2a1f14';
  ctx.fillRect(0, 0, S, S);

  const plankW = S / 6;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#3d2b1f' : '#342418';
    ctx.fillRect(i * plankW, 0, plankW, S);
    ctx.strokeStyle = '#1a1008';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(i * plankW, 0, plankW, S);
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 0.8;
    for (let g = 0; g < 6; g++) {
      ctx.beginPath();
      ctx.moveTo(i * plankW + 4 + g * 12, 0);
      ctx.quadraticCurveTo(i * plankW + 6 + g * 12 + (g % 2 ? 5 : -3), S / 2, i * plankW + 4 + g * 12, S);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = '#c9a84c';
  ctx.fillRect(0, S - 20, S, 4);
  ctx.fillStyle = '#a08530';
  ctx.fillRect(0, S - 16, S, 2);
  ctx.fillStyle = '#c9a84c';
  ctx.fillRect(0, 0, S, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

export function getWallTexture(baseColor: string, styleId?: string): THREE.CanvasTexture {
  const key = `${baseColor}|${styleId ?? ''}`;
  let tex = wallCache.get(key);
  if (!tex) {
    tex = makeWallTexture(baseColor, styleId);
    wallCache.set(key, tex);
  }
  return tex;
}

export function getFloorTexture(baseColor: string, styleId?: string): THREE.CanvasTexture {
  const key = `${baseColor}|${styleId ?? ''}`;
  let tex = floorCache.get(key);
  if (!tex) {
    tex = makeFloorTexture(baseColor, styleId);
    floorCache.set(key, tex);
  }
  return tex;
}

export function getOfficeWallTexture(): THREE.CanvasTexture {
  if (!officeWallTexture) officeWallTexture = makeOfficeWallTexture();
  return officeWallTexture;
}

export function clearTextureCache(): void {
  wallCache.forEach((t) => t.dispose());
  floorCache.forEach((t) => t.dispose());
  officeWallTexture?.dispose();
  wallCache.clear();
  floorCache.clear();
  officeWallTexture = null;
}
