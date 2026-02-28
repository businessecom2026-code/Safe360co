/**
 * ═══════════════════════════════════════════════════════════════
 *  Safe360 — Database Abstraction Layer
 * ═══════════════════════════════════════════════════════════════
 *  ALL database operations live here. When migrating to PostgreSQL
 *  (Railway, Supabase, etc), ONLY this file needs to change.
 *  The rest of the app (routes, middleware) stays the same.
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

// ─── Types ───

export interface Vault {
  id: string;
  name: string;
  userId: string;
  createdAt?: string;
  status?: 'active' | 'pending';
  data: VaultItem[];
}

export interface VaultItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  details?: string;
  ip?: string;
  timestamp: string;
}

interface Database {
  users: User[];
  vaults: Vault[];
  activityLogs: ActivityLogEntry[];
}

// ─── Core Read/Write (private) ───

async function readDb(): Promise<Database> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    return {
      users: db.users || [],
      vaults: db.vaults || [],
      activityLogs: db.activityLogs || [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { users: [], vaults: [], activityLogs: [] };
    }
    throw error;
  }
}

async function writeDb(db: Database): Promise<void> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
}

// ════════════════════════════════════════════════════════════════
//  USERS
// ════════════════════════════════════════════════════════════════

export async function getUsers(): Promise<User[]> {
  const db = await readDb();
  return db.users;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.id === id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.email === email);
}

export async function getUserByResetToken(token: string): Promise<{ user: User; index: number } | undefined> {
  const users = await getUsers();
  const index = users.findIndex(u => u.resetToken === token);
  if (index === -1) return undefined;
  return { user: users[index], index };
}

export async function getUserByInviteToken(token: string): Promise<{ user: User; index: number } | undefined> {
  const users = await getUsers();
  const index = users.findIndex(u => u.inviteToken === token && u.activated === false);
  if (index === -1) return undefined;
  return { user: users[index], index };
}

export async function getGuestsByInviter(inviterId: string): Promise<User[]> {
  const users = await getUsers();
  return users.filter(u => u.invitedBy === inviterId);
}

export async function createUser(user: User): Promise<User> {
  const db = await readDb();
  db.users.push(user);
  await writeDb(db);
  return user;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
  const db = await readDb();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return undefined;
  db.users[index] = { ...db.users[index], ...updates };
  await writeDb(db);
  return db.users[index];
}

export async function updateUserByIndex(index: number, updates: Partial<User>): Promise<void> {
  const db = await readDb();
  if (index < 0 || index >= db.users.length) return;
  db.users[index] = { ...db.users[index], ...updates };
  await writeDb(db);
}

export async function countGuestsByInviter(inviterId: string): Promise<number> {
  const users = await getUsers();
  return users.filter(u => u.invitedBy === inviterId).length;
}

// ════════════════════════════════════════════════════════════════
//  VAULTS
// ════════════════════════════════════════════════════════════════

export async function getVaults(): Promise<Vault[]> {
  const db = await readDb();
  return db.vaults;
}

export async function getVaultsByUser(userId: string): Promise<Vault[]> {
  const vaults = await getVaults();
  return vaults.filter(v => v.userId === userId);
}

export async function getVaultById(vaultId: string): Promise<Vault | undefined> {
  const vaults = await getVaults();
  return vaults.find(v => v.id === vaultId);
}

export async function getVaultsForAdmin(adminId: string): Promise<Vault[]> {
  const db = await readDb();
  const guestIds = db.users.filter(u => u.invitedBy === adminId).map(u => u.id);
  return db.vaults.filter(v => v.userId === adminId || guestIds.includes(v.userId));
}

export async function createVault(vault: Vault): Promise<Vault> {
  const db = await readDb();
  db.vaults.push(vault);
  await writeDb(db);
  return vault;
}

export async function updateVault(vaultId: string, updates: Partial<Vault>): Promise<Vault | undefined> {
  const db = await readDb();
  const index = db.vaults.findIndex(v => v.id === vaultId);
  if (index === -1) return undefined;
  db.vaults[index] = { ...db.vaults[index], ...updates };
  await writeDb(db);
  return db.vaults[index];
}

export async function deleteVault(vaultId: string): Promise<boolean> {
  const db = await readDb();
  const index = db.vaults.findIndex(v => v.id === vaultId);
  if (index === -1) return false;
  db.vaults.splice(index, 1);
  await writeDb(db);
  return true;
}

export async function countVaultsByUser(userId: string): Promise<number> {
  const vaults = await getVaults();
  return vaults.filter(v => v.userId === userId).length;
}

// ─── Vault Items ───

export async function getVaultItems(vaultId: string): Promise<VaultItem[]> {
  const vault = await getVaultById(vaultId);
  return vault?.data || [];
}

export async function addVaultItem(vaultId: string, item: VaultItem): Promise<VaultItem | undefined> {
  const db = await readDb();
  const vault = db.vaults.find(v => v.id === vaultId);
  if (!vault) return undefined;
  if (!vault.data) vault.data = [];
  vault.data.push(item);
  await writeDb(db);
  return item;
}

export async function updateVaultItem(vaultId: string, itemId: string, updates: Partial<VaultItem>): Promise<VaultItem | undefined> {
  const db = await readDb();
  const vault = db.vaults.find(v => v.id === vaultId);
  if (!vault) return undefined;
  const item = vault.data?.find(i => i.id === itemId);
  if (!item) return undefined;
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  await writeDb(db);
  return item;
}

export async function deleteVaultItem(vaultId: string, itemId: string): Promise<boolean> {
  const db = await readDb();
  const vault = db.vaults.find(v => v.id === vaultId);
  if (!vault || !vault.data) return false;
  const index = vault.data.findIndex(i => i.id === itemId);
  if (index === -1) return false;
  vault.data.splice(index, 1);
  await writeDb(db);
  return true;
}

export async function countVaultItems(vaultId: string): Promise<number> {
  const vault = await getVaultById(vaultId);
  return vault?.data?.length || 0;
}

// ════════════════════════════════════════════════════════════════
//  ACTIVITY LOGS
// ════════════════════════════════════════════════════════════════

export async function logActivity(userId: string, action: string, details?: string, ip?: string): Promise<void> {
  try {
    const db = await readDb();
    const entry: ActivityLogEntry = {
      id: `log_${Date.now()}`,
      userId,
      action,
      details,
      ip,
      timestamp: new Date().toISOString(),
    };

    db.activityLogs.push(entry);

    // Keep only last 2000 logs total
    if (db.activityLogs.length > 2000) {
      db.activityLogs = db.activityLogs.slice(-2000);
    }

    await writeDb(db);
  } catch {
    // Logging should never break the main flow
  }
}

export async function getUserActivityLogs(userId: string, limit: number = 50): Promise<ActivityLogEntry[]> {
  try {
    const db = await readDb();
    return db.activityLogs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getAllActivityLogs(limit: number = 100): Promise<ActivityLogEntry[]> {
  try {
    const db = await readDb();
    return db.activityLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
//  COMPOSITE QUERIES (used by admin console, etc)
// ════════════════════════════════════════════════════════════════

export async function getFullDatabase(): Promise<Database> {
  return readDb();
}
