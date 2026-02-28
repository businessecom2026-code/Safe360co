import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getPlanLimits } from '../utils/planLimits';
import {
  getVaults, getVaultsByUser, getVaultById, getVaultsForAdmin,
  createVault, updateVault, deleteVault,
  addVaultItem, updateVaultItem, deleteVaultItem, countVaultItems,
  getUserById, countVaultsByUser,
  type Vault, type VaultItem,
} from '../database/db';

const router = express.Router();

// Get user's vaults
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  if (userRole === 'master') return res.json(await getVaults());
  if (userRole === 'admin') return res.json(await getVaultsForAdmin(userId));
  res.json(await getVaultsByUser(userId));
});

// Create a new vault
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!name) return res.status(400).json({ message: 'Vault name is required' });

  const currentUser = await getUserById(userId);
  const limits = getPlanLimits(currentUser?.plan);
  const userVaultCount = await countVaultsByUser(userId);

  if (userVaultCount >= limits.maxVaults && userRole !== 'master') {
    return res.status(403).json({ message: `Limite de cofres atingido (${limits.maxVaults}). Faca upgrade do plano para criar mais.`, limit: limits.maxVaults, current: userVaultCount });
  }

  const newVault: Vault = { id: `vault_${Date.now()}`, name, userId, createdAt: new Date().toISOString(), status: userRole === 'guest' ? 'pending' : 'active', data: [] };
  await createVault(newVault);
  res.status(201).json(newVault);
});

// Approve a pending vault
router.put('/:vaultId/approve', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const vault = await getVaultById(req.params.vaultId);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  const vaultOwner = await getUserById(vault.userId);
  if (vaultOwner?.invitedBy !== userId && userRole !== 'master') return res.status(403).json({ message: 'Only the owner can approve this vault' });

  const updated = await updateVault(req.params.vaultId, { status: 'active' });
  res.json(updated);
});

// Reject (delete) a pending vault
router.put('/:vaultId/reject', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const vault = await getVaultById(req.params.vaultId);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  const vaultOwner = await getUserById(vault.userId);
  if (vaultOwner?.invitedBy !== userId && userRole !== 'master') return res.status(403).json({ message: 'Only the owner can reject this vault' });

  await deleteVault(req.params.vaultId);
  res.json({ message: 'Vault rejected and deleted' });
});

// Delete a vault (requires PIN)
router.delete('/:vaultId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { pin } = req.body;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!pin || pin.length < 4) return res.status(400).json({ message: 'PIN is required for deletion' });

  const vault = await getVaultById(req.params.vaultId);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });
  if (vault.userId !== userId && userRole !== 'master') return res.status(403).json({ message: 'Forbidden' });

  await deleteVault(req.params.vaultId);
  res.json({ message: 'Vault deleted successfully' });
});

// --- Vault Items CRUD ---

router.get('/:vaultId/items', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const vault = await getVaultById(req.params.vaultId);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });

  if (vault.userId !== userId && userRole !== 'master') {
    const vaultUser = await getUserById(vault.userId);
    if (!(userRole === 'admin' && vaultUser?.invitedBy === userId)) return res.status(403).json({ message: 'Forbidden' });
  }
  res.json(vault.data || []);
});

router.post('/:vaultId/items', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });

  const vault = await getVaultById(req.params.vaultId);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });
  if (vault.userId !== userId && userRole !== 'master') return res.status(403).json({ message: 'Forbidden' });

  const currentUser = await getUserById(userId!);
  const limits = getPlanLimits(currentUser?.plan);
  const itemCount = await countVaultItems(req.params.vaultId);

  if (itemCount >= limits.maxItemsPerVault && userRole !== 'master') {
    return res.status(403).json({ message: `Limite de itens por cofre atingido (${limits.maxItemsPerVault}). Faca upgrade do plano.`, limit: limits.maxItemsPerVault, current: itemCount });
  }

  const newItem: VaultItem = { id: `item_${Date.now()}`, title, description: description || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const item = await addVaultItem(req.params.vaultId, newItem);
  res.status(201).json(item);
});

router.put('/:vaultId/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { title, description } = req.body;

  const vault = await getVaultById(req.params.vaultId);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });
  if (vault.userId !== userId && userRole !== 'master') return res.status(403).json({ message: 'Forbidden' });

  const updates: Partial<VaultItem> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;

  const item = await updateVaultItem(req.params.vaultId, req.params.itemId, updates);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  res.json(item);
});

router.delete('/:vaultId/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;

  const vault = await getVaultById(req.params.vaultId);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });
  if (vault.userId !== userId && userRole !== 'master') return res.status(403).json({ message: 'Forbidden' });

  const deleted = await deleteVaultItem(req.params.vaultId, req.params.itemId);
  if (!deleted) return res.status(404).json({ message: 'Item not found' });
  res.json({ message: 'Item deleted' });
});

export default router;
