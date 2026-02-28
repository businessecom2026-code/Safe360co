import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './src/server/routes/auth';
import { authMiddleware, AuthRequest } from './src/server/middleware/auth';
import vaultRoutes from './src/server/routes/vaults';
import adminRoutes from './src/server/routes/admin';
import paymentRoutes from './src/server/routes/payments';
import { initMasterAdmin } from './src/server/utils/initMasterAdmin';
import { sanitizeInput } from './src/server/middleware/validate';
import { rateLimiter } from './src/server/middleware/rateLimiter';

async function startServer() {
  await initMasterAdmin();
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(sanitizeInput);
  app.use('/api', rateLimiter(60, 60 * 1000)); // 60 req/min global for API

  // API routes will go here
  app.use('/api/auth', authRoutes);
  app.use('/api/vaults', vaultRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes);

  app.get('/api/protected', authMiddleware, (req: AuthRequest, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
