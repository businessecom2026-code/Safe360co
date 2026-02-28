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

async function writeDb(db: { users: User[], vaults: any[] }): Promise<void> {
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

const STORAGE_LIMITS: Record<string, number> = {
  Free: 200,
  Pro: 500,
  Scale: 2048,
};

// Get all clients data for master admin (hierarchical: admins with their guests)
router.get('/clients', authMiddleware, async (req: AuthRequest, res) => {
  const userRole = req.user?.role;

  if (userRole !== 'master') {
    return res.status(403).json({ message: 'Forbidden: Master Admin access required' });
  }

  try {
    const db = await readDb();
    const users = db.users || [];
    const vaults = db.vaults || [];

    const admins = users.filter(u => u.role === 'admin' || u.role === 'master');
    const guests = users.filter(u => u.role === 'guest');

    const clientsData = admins.map(admin => {
      const adminVaults = vaults.filter(v => v.userId === admin.id);
      const adminStorageMB = adminVaults.length * 5;
      const plan = admin.plan || (admin.role === 'master' ? 'Scale' : 'Free');
      const maxStorage = STORAGE_LIMITS[plan] || 200;

      const adminGuests = guests
        .filter(g => g.invitedBy === admin.id)
        .map(g => {
          const guestVaults = vaults.filter(v => v.userId === g.id);
          const guestStorageMB = guestVaults.length * 5;
          return {
            id: g.id,
            email: g.email,
            role: g.role,
            storageMB: guestStorageMB,
            createdAt: g.createdAt || null,
          };
        });

      return {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        plan,
        storageMB: adminStorageMB,
        maxStorageMB: maxStorage,
        createdAt: admin.createdAt || null,
        planExpiresAt: admin.planExpiresAt || null,
        guests: adminGuests,
      };
    });

    res.json(clientsData);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update plan for a specific user
router.put('/clients/:id/plan', authMiddleware, async (req: AuthRequest, res) => {
  const userRole = req.user?.role;

  if (userRole !== 'master') {
    return res.status(403).json({ message: 'Forbidden: Master Admin access required' });
  }

  const { id } = req.params;
  const { plan, planExpiresAt } = req.body;

  if (!plan || !['Free', 'Pro', 'Scale'].includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan. Must be Free, Pro, or Scale.' });
  }

  try {
    const db = await readDb();
    const userIndex = db.users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }

    db.users[userIndex].plan = plan;
    if (planExpiresAt) {
      db.users[userIndex].planExpiresAt = planExpiresAt;
    }

    await writeDb(db);

    res.json({
      message: 'Plan updated successfully',
      user: {
        id,
        plan,
        planExpiresAt: db.users[userIndex].planExpiresAt,
      },
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
