import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getUsers, getVaults, updateUser } from '../database/db';

const router = express.Router();

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
    const users = await getUsers();
    const vaults = await getVaults();

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
  } catch {
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
    const updates: Record<string, string> = { plan };
    if (planExpiresAt) updates.planExpiresAt = planExpiresAt;

    const updated = await updateUser(id, updates);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Plan updated successfully',
      user: { id, plan, planExpiresAt: updated.planExpiresAt },
    });
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
