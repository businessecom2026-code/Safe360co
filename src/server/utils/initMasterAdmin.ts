import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { User } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

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

export async function initMasterAdmin() {
  const MASTER_ADMIN_EMAIL = 'admin@ecom360.co';
  const MASTER_ADMIN_PASSWORD = 'Admin2026*';

  let db = await readDb();
  let users = db.users || [];

  const existingMasterAdmin = users.find(u => u.email === MASTER_ADMIN_EMAIL);

  if (!existingMasterAdmin) {
    const hashedPassword = await bcrypt.hash(MASTER_ADMIN_PASSWORD, 10);
    const userId = `user_${Date.now()}`;

    const newMasterAdmin: User = {
      id: userId,
      email: MASTER_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'master',
    };

    users.push(newMasterAdmin);
    db.users = users;
    await writeDb(db);
    console.log('Master Admin account created successfully.');
  } else {
    console.log('Master Admin account already exists.');
  }
}
