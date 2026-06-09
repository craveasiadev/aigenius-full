/**
 * Interactive animated background.
 *
 * Theme-aware canvas scene that switches its whole personality:
 *   • Dark mode  → night sky. Twinkling parallax stars + occasional
 *     shooting stars. Calm, magical, "look up at the stars" vibe.
 *   • Light mode → sunrise. A glowing sun in the upper corner casts
 *     soft rays, golden dust motes twinkle in the air, drifting clouds
 *     float past, and the occasional bird silhouette glides through.
 *     Mouse-responsive: clouds gently part around the cursor — kids
 *     can wave the mouse around and see immediate cause-and-effect.
 *
 * One canvas, both modes — we just paint different things depending on
 * `theme`. Sits at z=-10, pointer-events-none, never blocks UI.
 */
import { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

type Star = {
  x: number;
  y: number;
  r: number;
  depth: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hue: number;
};

type ShootingStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
};

type Cloud = {
  x: number;
  y: number;
  /** Cluster scale — bigger = puffier cloud. */
  scale: number;
  /** Horizontal drift speed in px/frame. */
  vx: number;
  /** Depth band 0 (far/pale/slow) → 1 (near/opaque/fast). */
  depth: number;
  /** Per-cloud puff offsets so each cloud has a unique silhouette. */
  puffs: Array<{ ox: number; oy: number; r: number }>;
};

type Mote = {
  x: number;
  y: number;
  r: number;
  /** Vertical drift — motes rise slowly like warm air. */
  vy: number;
  vx: number;
  /** Twinkle phase. */
  phase: number;
  speed: number;
};

type Bird = {
  x: number;
  y: number;
  vx: number;
  /** Wing-flap phase (radians). */
  flap: number;
  flapSpeed: number;
  scale: number;
};

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const darkRef = useRef(dark);
  darkRef.current = dark;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx2d = canvasEl.getContext('2d');
    if (!ctx2d) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = ctx2d;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars: Star[] = [];
    let shootingStars: ShootingStar[] = [];
    let clouds: Cloud[] = [];
    let motes: Mote[] = [];
    let birds: Bird[] = [];
    let rafId = 0;
    let lastShootingAt = performance.now();
    let lastBirdAt = performance.now();
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, rawX: -9999, rawY: -9999 };

    const STAR_COLOURS = [
      [255, 255, 255],
      [200, 200, 255],
      [220, 200, 255],
      [180, 210, 255],
      [255, 230, 200],
    ];

    function seedStars() {
      const area = width * height;
      const count = Math.min(360, Math.max(120, Math.floor(area / 6000)));
      stars = new Array(count).fill(0).map(() => {
        const depth = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.4 + depth * 1.4 + Math.random() * 0.4,
          depth,
          twinkleSpeed: 0.6 + Math.random() * 1.8,
          twinklePhase: Math.random() * Math.PI * 2,
          hue: Math.floor(Math.random() * STAR_COLOURS.length),
        };
      });
    }

    function makeCloudPuffs(scale: number) {
      // 4–6 overlapping circles arranged horizontally with random radii
      // — gives each cloud a unique pillowy silhouette.
      const n = 4 + Math.floor(Math.random() * 3);
      const puffs: Array<{ ox: number; oy: number; r: number }> = [];
      const spacing = 24 * scale;
      for (let i = 0; i < n; i++) {
        puffs.push({
          ox: (i - (n - 1) / 2) * spacing * (0.8 + Math.random() * 0.4),
          oy: (Math.random() - 0.5) * 10 * scale,
          r: (18 + Math.random() * 14) * scale,
        });
      }
      return puffs;
    }

    function seedClouds() {
      const area = width * height;
      const count = Math.min(14, Math.max(5, Math.floor(area / 90000)));
      clouds = new Array(count).fill(0).map(() => {
        const depth = Math.random();
        const scale = 0.7 + depth * 1.1 + Math.random() * 0.3;
        return {
          x: Math.random() * width,
          y: 40 + Math.random() * (height * 0.55),
          scale,
          vx: 0.15 + depth * 0.45 + Math.random() * 0.15,
          depth,
          puffs: makeCloudPuffs(scale),
        };
      });
    }

    function seedMotes() {
      const area = width * height;
      const count = Math.min(120, Math.max(50, Math.floor(area / 14000)));
      motes = new Array(count).fill(0).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.9 + Math.random() * 1.7,
        vy: -(0.1 + Math.random() * 0.35),
        vx: (Math.random() - 0.5) * 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 2,
      }));
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
      seedClouds();
      seedMotes();
    }

    function spawnShootingStar() {
      const startX = Math.random() * width * 0.6;
      const startY = -20 - Math.random() * 60;
      const speed = 8 + Math.random() * 6;
      const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
      shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 40,
      });
    }

    function spawnBird() {
      // Birds fly left → right at varying heights in the upper sky.
      const fromLeft = Math.random() > 0.3;
      birds.push({
        x: fromLeft ? -40 : width + 40,
        y: 80 + Math.random() * (height * 0.45),
        vx: (fromLeft ? 1 : -1) * (1.2 + Math.random() * 1.0),
        flap: Math.random() * Math.PI * 2,
        flapSpeed: 7 + Math.random() * 3,
        scale: 0.8 + Math.random() * 0.6,
      });
    }

    function onMouseMove(e: MouseEvent) {
      mouse.tx = (e.clientX / width - 0.5) * 2;
      mouse.ty = (e.clientY / height - 0.5) * 2;
      mouse.rawX = e.clientX;
      mouse.rawY = e.clientY;
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      mouse.tx = (t.clientX / width - 0.5) * 2;
      mouse.ty = (t.clientY / height - 0.5) * 2;
      mouse.rawX = t.clientX;
      mouse.rawY = t.clientY;
    }

    // ─── DARK MODE: starfield + shooting stars ────────────────────
    function drawDark(now: number, dt: number) {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(15, 12, 41, 0.85)');
      grad.addColorStop(0.5, 'rgba(20, 16, 55, 0.75)');
      grad.addColorStop(1, 'rgba(8, 6, 25, 0.9)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      for (const s of stars) {
        s.twinklePhase += s.twinkleSpeed * dt;
        const tw = 0.55 + 0.45 * Math.sin(s.twinklePhase);
        const parallaxX = mouse.x * (1 + s.depth * 14);
        const parallaxY = mouse.y * (1 + s.depth * 14);
        const x = s.x - parallaxX;
        const y = s.y - parallaxY;
        const [r, g, b] = STAR_COLOURS[s.hue];

        const alpha = 0.9 * tw * (0.4 + s.depth * 0.8);
        const glowR = s.r * 4;
        const radial = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        radial.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.9})`);
        radial.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${alpha * 0.25})`);
        radial.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha + 0.2)})`;
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (now - lastShootingAt > 3000 + Math.random() * 4000) {
        spawnShootingStar();
        lastShootingAt = now;
      }

      shootingStars = shootingStars.filter((ss) => {
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life += 1;
        const lifeT = ss.life / ss.maxLife;
        const fade = Math.sin(lifeT * Math.PI);
        if (lifeT >= 1 || ss.x > width + 80 || ss.y > height + 80) return false;

        const tailLen = 120;
        const tx = ss.x - ss.vx * (tailLen / Math.hypot(ss.vx, ss.vy));
        const ty = ss.y - ss.vy * (tailLen / Math.hypot(ss.vx, ss.vy));
        const tailGrad = ctx.createLinearGradient(tx, ty, ss.x, ss.y);
        tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        tailGrad.addColorStop(1, `rgba(220, 220, 255, ${0.9 * fade})`);
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(ss.x, ss.y);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
    }

    // ─── LIGHT MODE: sunrise scene ────────────────────────────────
    // Sun sits in the upper-left at ~22% across. Everything else is
    // composed around it so the colour temperature feels coherent.
    function drawLight(now: number, dt: number) {
      const sunX = width * 0.22;
      const sunY = height * 0.18;
      const sunR = Math.max(60, Math.min(width, height) * 0.09);

      // Sunrise sky — orange near the sun → coral → peach → soft blue
      // at the bottom. Verticals chosen so the strongest warmth sits in
      // the upper third, leaving the bottom calm enough for content.
      const sky = ctx.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, 'rgba(255, 211, 165, 0.95)'); // warm apricot
      sky.addColorStop(0.25, 'rgba(255, 224, 196, 0.95)'); // peach
      sky.addColorStop(0.55, 'rgba(254, 240, 214, 0.9)'); // cream
      sky.addColorStop(0.85, 'rgba(207, 232, 252, 0.85)'); // gentle sky blue
      sky.addColorStop(1, 'rgba(186, 220, 246, 0.9)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);

      // Warm radial glow centred on the sun — paints a halo of warm
      // light across the upper-left quadrant.
      const halo = ctx.createRadialGradient(
        sunX,
        sunY,
        sunR * 0.4,
        sunX,
        sunY,
        Math.max(width, height) * 0.7,
      );
      halo.addColorStop(0, 'rgba(255, 200, 130, 0.55)');
      halo.addColorStop(0.3, 'rgba(255, 180, 130, 0.25)');
      halo.addColorStop(1, 'rgba(255, 200, 150, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);

      // Cool counterweight on the bottom-right so the page doesn't tip
      // entirely warm — adds a hint of blue-pink horizon.
      const cool = ctx.createRadialGradient(
        width * 0.85,
        height * 0.9,
        0,
        width * 0.85,
        height * 0.9,
        Math.max(width, height) * 0.6,
      );
      cool.addColorStop(0, 'rgba(186, 220, 246, 0.5)');
      cool.addColorStop(1, 'rgba(186, 220, 246, 0)');
      ctx.fillStyle = cool;
      ctx.fillRect(0, 0, width, height);

      // ── Sun rays — soft animated rotating beams ────────────────
      const rayCount = 14;
      const rayPulse = 0.5 + 0.5 * Math.sin(now * 0.0008);
      ctx.save();
      ctx.translate(sunX, sunY);
      ctx.rotate(now * 0.00006);
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const len = sunR * (3.5 + rayPulse * 0.6);
        const tipX = Math.cos(angle) * len;
        const tipY = Math.sin(angle) * len;
        const rayGrad = ctx.createLinearGradient(0, 0, tipX, tipY);
        rayGrad.addColorStop(0, 'rgba(255, 220, 160, 0.35)');
        rayGrad.addColorStop(1, 'rgba(255, 220, 160, 0)');
        ctx.strokeStyle = rayGrad;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }
      ctx.restore();

      // ── Sun body ───────────────────────────────────────────────
      // Bright core with a soft outer glow. Tiny pulse on the same
      // sine clock as the rays so the sun "breathes" subtly.
      const sunPulse = 1 + Math.sin(now * 0.0012) * 0.04;
      const sunCoreR = sunR * sunPulse;
      const sunGlow = ctx.createRadialGradient(
        sunX,
        sunY,
        sunCoreR * 0.3,
        sunX,
        sunY,
        sunCoreR * 2.4,
      );
      sunGlow.addColorStop(0, 'rgba(255, 240, 200, 0.95)');
      sunGlow.addColorStop(0.35, 'rgba(255, 200, 120, 0.6)');
      sunGlow.addColorStop(1, 'rgba(255, 180, 120, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunCoreR * 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 248, 220, 0.95)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunCoreR, 0, Math.PI * 2);
      ctx.fill();

      // ── Dust motes — warm twinkling particles in the sun's beam ─
      for (const m of motes) {
        m.phase += m.speed * dt;
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < -10) m.x = width + 10;
        if (m.x > width + 10) m.x = -10;

        const tw = Math.max(0, Math.sin(m.phase));
        if (tw < 0.05) continue;

        // Brighter where closer to the sun — gives the impression that
        // light is catching the dust.
        const dist = Math.hypot(m.x - sunX, m.y - sunY);
        const proximity = Math.max(
          0.25,
          1 - dist / (Math.max(width, height) * 0.7),
        );
        const alpha = tw * 0.55 * proximity;

        const moteR = m.r * (0.6 + tw * 0.9);
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, moteR * 3);
        grad.addColorStop(0, `rgba(255, 220, 160, ${alpha})`);
        grad.addColorStop(1, 'rgba(255, 220, 160, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(m.x, m.y, moteR * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 245, 215, ${Math.min(1, alpha + 0.3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, moteR * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Clouds — drifting puffballs with mouse-repel parting ───
      for (const c of clouds) {
        c.x += c.vx;

        // Mouse repel (same kid-friendly cause-and-effect the bubbles
        // had). Clouds nudge horizontally away from the cursor.
        const dx = c.x - mouse.rawX;
        const dy = c.y - mouse.rawY;
        const dist2 = dx * dx + dy * dy;
        const radius = 180;
        if (dist2 < radius * radius && dist2 > 1) {
          const dist = Math.sqrt(dist2);
          const force = (1 - dist / radius) * 1.6;
          c.x += (dx / dist) * force;
          c.y += (dy / dist) * force * 0.4;
        }

        // Recycle when fully off the right edge.
        const cloudWidth = 200 * c.scale;
        if (c.x - cloudWidth > width) {
          c.x = -cloudWidth;
          c.y = 40 + Math.random() * (height * 0.55);
        }

        const baseAlpha = 0.4 + c.depth * 0.45;

        // Soft underside shadow — peachy tone so it reads as warm
        // morning light hitting the cloud from above.
        for (const p of c.puffs) {
          const px = c.x + p.ox;
          const py = c.y + p.oy;
          const shadow = ctx.createRadialGradient(
            px,
            py + p.r * 0.4,
            0,
            px,
            py + p.r * 0.4,
            p.r * 1.4,
          );
          shadow.addColorStop(0, `rgba(220, 180, 200, ${baseAlpha * 0.25})`);
          shadow.addColorStop(1, 'rgba(220, 180, 200, 0)');
          ctx.fillStyle = shadow;
          ctx.beginPath();
          ctx.arc(px, py + p.r * 0.4, p.r * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main cloud body — paint each puff as a soft white blob.
        for (const p of c.puffs) {
          const px = c.x + p.ox;
          const py = c.y + p.oy;
          const body = ctx.createRadialGradient(
            px - p.r * 0.3,
            py - p.r * 0.4,
            p.r * 0.1,
            px,
            py,
            p.r,
          );
          body.addColorStop(0, `rgba(255, 255, 255, ${baseAlpha + 0.25})`);
          body.addColorStop(0.6, `rgba(255, 250, 240, ${baseAlpha})`);
          body.addColorStop(1, 'rgba(255, 250, 240, 0)');
          ctx.fillStyle = body;
          ctx.beginPath();
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Birds — silhouettes flying across every few seconds ────
      if (now - lastBirdAt > 4500 + Math.random() * 5000) {
        spawnBird();
        lastBirdAt = now;
      }

      birds = birds.filter((b) => {
        b.x += b.vx;
        b.flap += b.flapSpeed * dt;
        if (b.x < -60 || b.x > width + 60) return false;

        const flapY = Math.sin(b.flap) * 4 * b.scale;
        const wingSpan = 14 * b.scale;
        const wingDip = 6 * b.scale;

        ctx.strokeStyle = 'rgba(70, 80, 100, 0.55)';
        ctx.lineWidth = 1.6 * b.scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        // Classic seagull "M" silhouette — two arcs that dip down at the
        // body and curve up at the wingtips. flap modulates the dip.
        ctx.moveTo(b.x - wingSpan, b.y + flapY);
        ctx.quadraticCurveTo(b.x - wingSpan * 0.5, b.y + wingDip + flapY, b.x, b.y + flapY);
        ctx.quadraticCurveTo(b.x + wingSpan * 0.5, b.y + wingDip + flapY, b.x + wingSpan, b.y + flapY);
        ctx.stroke();
        return true;
      });
    }

    let t0 = performance.now();
    function frame(now: number) {
      const dt = Math.min(64, now - t0) / 1000;
      t0 = now;

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      ctx.clearRect(0, 0, width, height);

      if (darkRef.current) {
        drawDark(now, dt);
      } else {
        drawLight(now, dt);
      }

      rafId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
