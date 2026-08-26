import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function serveProjetosMiddleware(): Plugin {
  return {
    name: 'serve-projetos-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || '';
        const cleanUrl = rawUrl.split('?')[0];
        const decodedUrl = decodeURIComponent(cleanUrl);

        if (decodedUrl.startsWith('/projetos/') || decodedUrl.startsWith('projetos/')) {
          const relativePath = decodedUrl.replace(/^\/?projetos\//, '');
          const filePath = path.join(__dirname, 'projetos', relativePath);

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.wav': 'audio/wav',
              '.mp3': 'audio/mpeg',
              '.ogg': 'audio/ogg',
              '.m4a': 'audio/mp4',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.webp': 'image/webp',
              '.json': 'application/json',
            };

            const stat = fs.statSync(filePath);
            const totalSize = stat.size;
            const range = req.headers.range;

            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Access-Control-Allow-Origin', '*');

            if (range) {
              const parts = range.replace(/bytes=/, '').split('-');
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
              const chunkSize = end - start + 1;

              res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                'Content-Length': chunkSize,
              });
              fs.createReadStream(filePath, { start, end }).pipe(res);
            } else {
              res.setHeader('Content-Length', totalSize);
              fs.createReadStream(filePath).pipe(res);
            }
            return;
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production' || process.env.GITHUB_ACTIONS === 'true';
  return {
    base: isProd ? '/DubCraft/' : './',
    plugins: [react(), tailwindcss(), serveProjetosMiddleware()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: true as const,
      fs: {
        allow: ['.', './projetos', '../Projetos'],
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
