import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Anything starting with /api goes to the Express server, so the
    // browser only ever talks to one origin and CORS never comes up in dev.
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
        // Without this an unreachable backend just returns an empty 502,
        // which says nothing about the actual cause.
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            const hint =
              err.code === 'ECONNREFUSED'
                ? 'Express is not running on port 5050. Start it with: npm run server (or npm run dev to run both).'
                : err.message;

            console.error(`\n[proxy] ${req.method} ${req.url} failed -> ${hint}\n`);

            if (!res.headersSent && res.writeHead) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
            }
            if (res.end) res.end(JSON.stringify({ error: hint }));
          });
        },
      },
    },
  },
});
