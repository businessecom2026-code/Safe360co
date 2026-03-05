import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/server/routes/auth';
import { authMiddleware, AuthRequest } from './src/server/middleware/auth';
import vaultRoutes from './src/server/routes/vaults';
import folderRoutes from './src/server/routes/folders';
import adminRoutes from './src/server/routes/admin';
import paymentRoutes from './src/server/routes/payments';
import { initMasterAdmin } from './src/server/utils/initMasterAdmin';
import { sanitizeInput } from './src/server/middleware/validate';
import { rateLimiter } from './src/server/middleware/rateLimiter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const railwayEnv = process.env.RAILWAY_ENVIRONMENT || 'local'; // 'production' | 'staging' | 'local'

// ─── Validate critical environment variables ───
function validateEnv() {
  const warnings: string[] = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret') {
    warnings.push('JWT_SECRET not set or using default — authentication is insecure!');
  }
  if (!process.env.RESEND_API_KEY) {
    warnings.push('RESEND_API_KEY not set — emails will not be sent.');
  }
  if (!process.env.APP_URL && isProduction) {
    warnings.push('APP_URL not set — email links will point to localhost!');
  }
  if (!process.env.REVOLUT_SECRET_KEY) {
    warnings.push('REVOLUT_SECRET_KEY not set — payments will fail.');
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Environment Warnings:');
    warnings.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }
}

async function startServer() {
  validateEnv();
  await initMasterAdmin();

  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  // ─── Security Headers ───
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // ─── Compression (gzip) ───
  app.use(compression());

  app.use(cors());

  // ─── Revolut webhook: raw body ONLY for this path (BEFORE bodyParser.json) ───
  // express.raw() here captures the Buffer needed for HMAC-SHA256 signature validation.
  // bodyParser.json() skips re-parsing if req.body is already set (Buffer counts as set).
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(sanitizeInput);
  app.use('/api', rateLimiter(60, 60 * 1000)); // 60 req/min global for API

  // ─── API Routes ───
  app.use('/api/auth', authRoutes);
  app.use('/api/vaults', vaultRoutes);
  app.use('/api/vaults/:vaultId/folders', folderRoutes); // nested route — mergeParams enabled
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);

  app.get('/api/protected', authMiddleware, (req: AuthRequest, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', env: isProduction ? 'production' : 'development', railway: railwayEnv, version: '1.0.0' });
  });

  if (isProduction) {
    // ─── Production: serve Vite-built static files ───
    const distPath = path.join(__dirname, 'dist');

    // Cache static assets aggressively (they have content hashes in filenames)
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true,
    }));

    // Serve other static files with short cache
    app.use(express.static(distPath, {
      maxAge: '1h',
    }));

    // SPA fallback: all non-API routes serve index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  } else {
    // ─── Development: use Vite dev server as middleware ───
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    const dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'NOT SET';
    console.log(`\n🔒 Safe360 v1.0.0 running on port ${PORT}`);
    console.log(`   Environment : ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`   Railway env : ${railwayEnv}`);
    console.log(`   Database    : ${dbUrl}\n`);
  });
}

startServer();
