import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { User } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

const router = express.Router();

async function readDb(): Promise<{ users: User[], vaults: any[] }> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { users: [], vaults: [] };
    }
    throw error;
  }
}

// Get all clients data for master admin
router.get('/clients', authMiddleware, async (req: AuthRequest, res) => {
  const userRole = req.user?.role;

  if (userRole !== 'master') {
    return res.status(403).json({ message: 'Forbidden: Master Admin access required' });
  }

  try {
    const db = await readDb();
    const users = db.users || [];
    const vaults = db.vaults || [];

    const clientsData = users.map(u => {
      // Calculate storage used (mock logic for now, can be improved)
      const userVaults = vaults.filter(v => v.userId === u.id);
      const vaultCount = userVaults.length;
      const estimatedSizeMB = vaultCount * 5; // Assuming 5MB per vault for demonstration
      
      // Determine plan based on role or other logic (mock logic)
      let plan = 'Free';
      if (u.role === 'admin') plan = 'Pro';
      if (u.role === 'master') plan = 'Scale';

      return {
        id: u.id,
        email: u.email,
        role: u.role,
        plan: plan,
        storageUsed: `${estimatedSizeMB}MB/500MB`,
        adhesionDate: new Date().toISOString().split('T')[0], // Mock date, should ideally come from DB
      };
    });

    res.json(clientsData);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
