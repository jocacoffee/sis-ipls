import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiRouter } from './src/server/api';
import { storage } from './src/server/storage';
import { authMiddleware, createAuthRouter } from './src/server/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Cabeçalhos de segurança (a CSP só em produção: o Vite de desenvolvimento usa scripts inline e WebSocket)
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (isProd) {
      res.setHeader(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob:",
          "connect-src 'self'",
          "worker-src 'self' blob:",
          "frame-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'"
        ].join('; ')
      );
      if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Carrega a base (PostgreSQL se DATABASE_URL estiver definida; senão data/database.json)
  await storage.init();

  // Health check endpoint for Docker / Kubernetes liveness & readiness probes
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ipls-sjrr',
      storage: storage.backend,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Sessão do usuário (visitantes navegam sem login; escrita exige login no AD)
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  app.use('/api', authMiddleware);
  app.use('/api', createAuthRouter());

  // Mount API router
  app.use('/api', createApiRouter());

  if (!isProd) {
    // Development mode with Vite dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`[SISPLS Inteligente] Servidor ativo em http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar servidor SISPLS:', err);
  process.exit(1);
});
