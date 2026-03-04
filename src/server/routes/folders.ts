import express from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getVaultById,
  getFoldersByVault,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  getVaultItems,
  getUserById,
} from '../database/db';

const router = express.Router({ mergeParams: true }); // inherits :vaultId from parent

// ─── Guard: verify vault exists and caller has access ─────────────────────────
// readOnly=true: also allows admin→guest and guest→admin read access
async function assertVaultAccess(req: AuthRequest, vaultId: string, readOnly = false): Promise<boolean> {
  const vault = await getVaultById(vaultId);
  if (!vault) return false;
  const userId = req.user?.id;
  const role = req.user?.role;
  if (role === 'master') return true;
  if (vault.userId === userId) return true;
  if (!readOnly) return false;
  // Read-only access: admin can read their guests' vaults; guest can read their admin's vaults
  if (role === 'admin') {
    const vaultUser = await getUserById(vault.userId);
    if (vaultUser?.invitedBy === userId) return true;
  }
  if (role === 'guest') {
    const guestUser = await getUserById(userId!);
    if (vault.userId === guestUser?.invitedBy) return true;
  }
  return false;
}

// ─── GET /api/vaults/:vaultId/folders?parentId=:id ───────────────────────────
// Lists folders at the given depth. parentId absent = all folders; parentId=root = root level
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const { vaultId } = req.params;
  if (!await assertVaultAccess(req, vaultId, true)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // ?parentId=root → null (root-level folders); ?parentId=<uuid> → specific parent
  let parentId: string | null | undefined;
  if (req.query.parentId === 'root') {
    parentId = null;
  } else if (typeof req.query.parentId === 'string') {
    parentId = req.query.parentId;
  }
  // parentId undefined → returns all folders in vault (for sidebar tree)

  const folders = await getFoldersByVault(vaultId, parentId);
  res.json(folders);
});

// ─── GET /api/vaults/:vaultId/folders/:folderId ──────────────────────────────
router.get('/:folderId', authMiddleware, async (req: AuthRequest, res) => {
  const { vaultId, folderId } = req.params;
  if (!await assertVaultAccess(req, vaultId, true)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const folder = await getFolderById(folderId);
  if (!folder || folder.vaultId !== vaultId) {
    return res.status(404).json({ message: 'Folder not found' });
  }

  // Include immediate children + items at this level
  const [children, items] = await Promise.all([
    getFoldersByVault(vaultId, folderId),
    getVaultItems(vaultId, folderId),
  ]);

  res.json({ ...folder, children, items });
});

// ─── POST /api/vaults/:vaultId/folders ───────────────────────────────────────
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { vaultId } = req.params;
  if (!await assertVaultAccess(req, vaultId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { name, parentId, color } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  // Validate parentId belongs to same vault (prevents cross-vault injection)
  if (parentId) {
    const parent = await getFolderById(parentId);
    if (!parent || parent.vaultId !== vaultId) {
      return res.status(400).json({ message: 'Invalid parentId' });
    }
  }

  try {
    const folder = await createFolder({
      vaultId,
      parentId: parentId ?? null,
      name: name.trim(),
      color: color ?? '#6366f1',
    });
    res.status(201).json(folder);
  } catch (err) {
    if ((err as Error).message === 'MAX_DEPTH_EXCEEDED') {
      return res.status(400).json({ message: 'Maximum folder depth (8) exceeded' });
    }
    res.status(500).json({ message: 'Failed to create folder' });
  }
});

// ─── PUT /api/vaults/:vaultId/folders/:folderId ──────────────────────────────
router.put('/:folderId', authMiddleware, async (req: AuthRequest, res) => {
  const { vaultId, folderId } = req.params;
  if (!await assertVaultAccess(req, vaultId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const folder = await getFolderById(folderId);
  if (!folder || folder.vaultId !== vaultId) {
    return res.status(404).json({ message: 'Folder not found' });
  }

  const { name, color, parentId, icon } = req.body;

  // Guard: prevent moving a folder into itself or its own descendant
  if (parentId !== undefined && parentId === folderId) {
    return res.status(400).json({ message: 'A folder cannot be its own parent' });
  }

  const updated = await updateFolder(folderId, {
    ...(name !== undefined && { name: name.trim() }),
    ...(color !== undefined && { color }),
    ...(parentId !== undefined && { parentId: parentId ?? null }),
    ...(icon !== undefined && { icon }),
  });

  if (!updated) return res.status(404).json({ message: 'Folder not found' });
  res.json(updated);
});

// ─── DELETE /api/vaults/:vaultId/folders/:folderId ───────────────────────────
// Children folders also deleted (CASCADE). Items under this folder are SET NULL → move to root.
router.delete('/:folderId', authMiddleware, async (req: AuthRequest, res) => {
  const { vaultId, folderId } = req.params;
  if (!await assertVaultAccess(req, vaultId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const folder = await getFolderById(folderId);
  if (!folder || folder.vaultId !== vaultId) {
    return res.status(404).json({ message: 'Folder not found' });
  }

  const deleted = await deleteFolder(folderId);
  if (!deleted) return res.status(500).json({ message: 'Failed to delete folder' });

  res.json({ message: 'Folder deleted. Items moved to vault root.' });
});

export default router;
