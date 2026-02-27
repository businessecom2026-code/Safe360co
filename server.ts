import express from 'express';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './src/server/routes/auth';
import { authMiddleware, AuthRequest } from './src/server/middleware/auth';
import vaultRoutes from './src/server/routes/vaults';
import adminRoutes from './src/server/routes/admin';
import { initMasterAdmin } from './src/server/utils/initMasterAdmin';

async function startServer() {
  await initMasterAdmin();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // API routes will go here
  app.use('/api/auth', authRoutes);
  app.use('/api/vaults', vaultRoutes);
  app.use('/api/admin', adminRoutes);

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
