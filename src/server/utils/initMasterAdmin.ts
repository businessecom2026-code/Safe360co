import bcrypt from 'bcryptjs';
import { User } from '../../types';
import { getUserByEmail, createUser } from '../database/db';

export async function initMasterAdmin() {
  const MASTER_ADMIN_EMAIL = process.env.MASTER_EMAIL;
  const MASTER_ADMIN_PASSWORD = process.env.MASTER_PASSWORD;

  if (!MASTER_ADMIN_EMAIL || !MASTER_ADMIN_PASSWORD) {
    console.warn('[Safe360] MASTER_EMAIL or MASTER_PASSWORD not set — skipping master admin creation.');
    return;
  }

  const existingMasterAdmin = await getUserByEmail(MASTER_ADMIN_EMAIL);

  if (!existingMasterAdmin) {
    const hashedPassword = await bcrypt.hash(MASTER_ADMIN_PASSWORD, 10);

    const newMasterAdmin: User = {
      id: `user_${Date.now()}`,
      email: MASTER_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'master',
      plan: 'Scale',
      createdAt: new Date().toISOString(),
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await createUser(newMasterAdmin);
    console.log('[Safe360] Master Admin created.');
  }
}
