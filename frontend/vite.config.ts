import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env.VITE_BASE?.trim() || '/';

  // When the dev server is served through an HTTPS tunnel (ngrok,
  // Cloudflare, etc.), the page loads over https://<host> but Vite's
  // in-page HMR client defaults to ws://localhost:<port> — which the
  // tunnel can't route, so live-reload dies with
  // "[vite] failed to connect to websocket".
  //
  // Set VITE_HMR_HOST to your public tunnel host (no protocol), e.g.
  //   VITE_HMR_HOST=3dc73e447d09.ngrok-free.app
  // and the HMR client connects over wss on port 443 through the tunnel.
  // Left empty → normal localhost HMR for plain local dev.
  const hmrHost = env.VITE_HMR_HOST?.trim();

  return {
    plugins: [react()],
    // Base path - use VITE_BASE for production hosting path (default '/')
    base,
    build: {
      // Output to dist folder
      outDir: 'dist',
      // Generate source maps for debugging
      sourcemap: false,
      // Increase warning threshold; three.js + r3f chunks are intentionally large.
      chunkSizeWarningLimit: 1200,
      // Rollup options
      rollupOptions: {
        output: {
          // Manual chunk splitting so the 3D engine is its own cacheable chunk,
          // separate from the React app shell. The shell stays tiny so the
          // initial paint is fast; the 3D world is downloaded lazily when the
          // route mounts.
          manualChunks(id) {
            // Normalize path separators so the same matcher works on Windows + POSIX.
            const p = id.replace(/\\/g, '/');
            if (!p.includes('node_modules')) return;
            if (p.includes('/@react-three/rapier/') || p.includes('/@dimforge/')) return 'rapier';
            if (p.includes('/@react-three/drei/')) return 'drei';
            if (p.includes('/@react-three/fiber/')) return 'r3f';
            if (p.includes('/ecctrl/')) return 'ecctrl';
            if (p.includes('/three-stdlib/')) return 'three';
            if (p.includes('/three/')) return 'three';
            if (p.includes('/phaser/')) return 'phaser';
            if (p.includes('/react-router')) return 'router';
            if (p.includes('/framer-motion/')) return 'motion';
            if (p.includes('/lucide-react/')) return 'icons';
            if (p.includes('/canvas-confetti/')) return 'fx';
            if (p.includes('/react-dom/') || p.includes('/react/') || p.includes('/scheduler/')) return 'vendor';
          },
        },
      },
    },
    server: {
      // Bind to all interfaces so a tunnel can reach the dev server.
      host: true,
      // Allow any Host header so HTTPS dev tunnels (ngrok, Cloudflare,
      // etc.) aren't rejected by Vite's host check. The previous
      // hard-coded ngrok id broke every time the tunnel was restarted.
      allowedHosts: true,
      // Route the HMR websocket over the tunnel (wss:443) when
      // VITE_HMR_HOST is set; otherwise leave Vite's localhost default.
      ...(hmrHost
        ? { hmr: { protocol: 'wss' as const, host: hmrHost, clientPort: 443 } }
        : {}),
      proxy: {
        '/api': {
          target: 'https://artventure.test',
          changeOrigin: true,
          secure: false, // Allow self-signed certs
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/aipreneur': {
          target: 'https://artventure.test',
          changeOrigin: true,
          secure: false,
        },
        '/aigenius/': {
          target: 'https://artventure.test',
          changeOrigin: true,
          secure: false,
        },
        '/reward-images': {
          target: 'https://artventure.test',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    // Preview server config (for npm run preview after build)
    preview: {
      port: 4173,
      strictPort: true,
    },
    optimizeDeps: {
      include: ['lucide-react'],
    },
  };
});
