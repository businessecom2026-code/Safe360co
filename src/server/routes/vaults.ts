import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getPlanLimits } from '../utils/planLimits';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

const router = express.Router();

interface VaultItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface Vault {
  id: string;
  name: string;
  userId: string;
  createdAt?: string;
  status?: 'active' | 'pending';
  data: VaultItem[];
}

async function readDb(): Promise<any> {
  const data = await fs.readFile(dbPath, 'utf-8');
  return JSON.parse(data);
}

async function readVaults(): Promise<Vault[]> {
  try {
    const db = await readDb();
    return db.vaults || [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeVaults(vaults: Vault[]): Promise<void> {
  const data = await fs.readFile(dbPath, 'utf-8');
  const db = JSON.parse(data);
  db.vaults = vaults;
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

// Get user's vaults (admins also see their guests' vaults)
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const allVaults = await readVaults();

  if (userRole === 'master') {
    return res.json(allVaults);
  }

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // For admin: show own vaults + guest vaults (pending approval)
  if (userRole === 'admin') {
    const db = await readDb();
    const users = db.users || [];
    const guestIds = users.filter((u: any) => u.invitedBy === userId).map((u: any) => u.id);
    const relevantVaults = allVaults.filter(v => v.userId === userId || guestIds.includes(v.userId));
    return res.json(relevantVaults);
  }

  // Guest: only own vaults
  const userVaults = allVaults.filter(v => v.userId === userId);
  res.json(userVaults);
});

// Create a new vault
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!name) {
    return res.status(400).json({ message: 'Vault name is required' });
  }

  const allVaults = await readVaults();
  const db = await readDb();

  // Enforce plan vault limits
  const currentUser = db.users?.find((u: any) => u.id === userId);
  const limits = getPlanLimits(currentUser?.plan);
  const userVaultCount = allVaults.filter(v => v.userId === userId).length;

  if (userVaultCount >= limits.maxVaults && userRole !== 'master') {
    return res.status(403).json({
      message: `Limite de cofres atingido (${limits.maxVaults}). Faca upgrade do plano para criar mais.`,
      limit: limits.maxVaults,
      current: userVaultCount,
    });
  }

  // Guests create vaults with 'pending' status (needs owner approval)
  const status = userRole === 'guest' ? 'pending' : 'active';

  const newVault: Vault = {
    id: `vault_${Date.now()}`,
    name,
    userId,
    createdAt: new Date().toISOString(),
    status,
    data: [],
  };

  allVaults.push(newVault);
  await writeVaults(allVaults);

  res.status(201).json(newVault);
});

// Approve a pending vault (owner approves guest vault)
router.put('/:vaultId/approve', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { vaultId } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const allVaults = await readVaults();
  const vault = allVaults.find(v => v.id === vaultId);

  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  // Only the owner (admin who invited the guest) or master can approve
  const db = await readDb();
  const vaultOwner = db.users?.find((u: any) => u.id === vault.userId);
  const isOwner = vaultOwner?.invitedBy === userId;
  const isMaster = userRole === 'master';

  if (!isOwner && !isMaster) {
    return res.status(403).json({ message: 'Only the owner can approve this vault' });
  }

  vault.status = 'active';
  await writeVaults(allVaults);

  res.json(vault);
});

// Reject (delete) a pending vault
router.put('/:vaultId/reject', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { vaultId } = req.params;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const allVaults = await readVaults();
  const vaultIndex = allVaults.findIndex(v => v.id === vaultId);

  if (vaultIndex === -1) return res.status(404).json({ message: 'Vault not found' });

  const vault = allVaults[vaultIndex];
  const db = await readDb();
  const vaultOwner = db.users?.find((u: any) => u.id === vault.userId);
  const isOwner = vaultOwner?.invitedBy === userId;
  const isMaster = userRole === 'master';

  if (!isOwner && !isMaster) {
    return res.status(403).json({ message: 'Only the owner can reject this vault' });
  }

  allVaults.splice(vaultIndex, 1);
  await writeVaults(allVaults);

  res.json({ message: 'Vault rejected and deleted' });
});

// Delete a vault (requires PIN verification - PIN sent in body)
router.delete('/:vaultId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { vaultId } = req.params;
  const { pin } = req.body;

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!pin || pin.length < 4) return res.status(400).json({ message: 'PIN is required for deletion' });

  const allVaults = await readVaults();
  const vaultIndex = allVaults.findIndex(v => v.id === vaultId);

  if (vaultIndex === -1) return res.status(404).json({ message: 'Vault not found' });

  const vault = allVaults[vaultIndex];

  // Only vault owner or master can delete
  if (vault.userId !== userId && userRole !== 'master') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  allVaults.splice(vaultIndex, 1);
  await writeVaults(allVaults);

  res.json({ message: 'Vault deleted successfully' });
});

// --- Vault Items CRUD ---

// Get items in a vault
router.get('/:vaultId/items', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { vaultId } = req.params;

  const allVaults = await readVaults();
  const vault = allVaults.find(v => v.id === vaultId);

  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  // Check access
  if (vault.userId !== userId && userRole !== 'master') {
    // Check if user is admin and vault belongs to their guest
    const db = await readDb();
    const vaultUser = db.users?.find((u: any) => u.id === vault.userId);
    if (!(userRole === 'admin' && vaultUser?.invitedBy === userId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  res.json(vault.data || []);
});

// Add item to vault
router.post('/:vaultId/items', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { vaultId } = req.params;
  const { title, description } = req.body;

  if (!title) return res.status(400).json({ message: 'Title is required' });

  const allVaults = await readVaults();
  const vault = allVaults.find(v => v.id === vaultId);

  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  if (vault.userId !== userId && userRole !== 'master') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // Enforce item limits per plan
  const db = await readDb();
  const currentUser = db.users?.find((u: any) => u.id === userId);
  const limits = getPlanLimits(currentUser?.plan);
  const itemCount = vault.data?.length || 0;

  if (itemCount >= limits.maxItemsPerVault && userRole !== 'master') {
    return res.status(403).json({
      message: `Limite de itens por cofre atingido (${limits.maxItemsPerVault}). Faca upgrade do plano.`,
      limit: limits.maxItemsPerVault,
      current: itemCount,
    });
  }

  const newItem: VaultItem = {
    id: `item_${Date.now()}`,
    title,
    description: description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!vault.data) vault.data = [];
  vault.data.push(newItem);
  await writeVaults(allVaults);

  res.status(201).json(newItem);
});

// Update item in vault
router.put('/:vaultId/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { vaultId, itemId } = req.params;
  const { title, description } = req.body;

  const allVaults = await readVaults();
  const vault = allVaults.find(v => v.id === vaultId);

  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  if (vault.userId !== userId && userRole !== 'master') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const item = vault.data?.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });

  if (title !== undefined) item.title = title;
  if (description !== undefined) item.description = description;
  item.updatedAt = new Date().toISOString();

  await writeVaults(allVaults);
  res.json(item);
});

// Delete item from vault
router.delete('/:vaultId/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { vaultId, itemId } = req.params;

  const allVaults = await readVaults();
  const vault = allVaults.find(v => v.id === vaultId);

  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  if (vault.userId !== userId && userRole !== 'master') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const itemIndex = vault.data?.findIndex(i => i.id === itemId) ?? -1;
  if (itemIndex === -1) return res.status(404).json({ message: 'Item not found' });

  vault.data.splice(itemIndex, 1);
  await writeVaults(allVaults);

  res.json({ message: 'Item deleted' });
});

export default router;
