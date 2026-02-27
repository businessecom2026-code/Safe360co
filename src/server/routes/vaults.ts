import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

const router = express.Router();

interface Vault {
  id: string;
  name: string;
  userId: string;
  data: any[];
}

async function readVaults(): Promise<Vault[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
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

// Get user's vaults
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

  const userVaults = allVaults.filter(v => v.userId === userId);
  res.json(userVaults);
});

// Create a new vault
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!name) {
    return res.status(400).json({ message: 'Vault name is required' });
  }

  const allVaults = await readVaults();
  const newVault: Vault = {
    id: `vault_${Date.now()}`,
    name,
    userId,
    data: [],
  };

  allVaults.push(newVault);
  await writeVaults(allVaults);

  res.status(201).json(newVault);
});

export default router;
