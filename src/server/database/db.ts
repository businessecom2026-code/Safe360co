/**
 * ═══════════════════════════════════════════════════════════════
 *  Safe360 — Database Abstraction Layer
 * ═══════════════════════════════════════════════════════════════
 *  CURRENT MODE: JSON file (development / Replit)
 *
 *  When DATABASE_URL is set (Railway), replace this file with:
 *    cp src/server/database/db-postgres.ts src/server/database/db.ts
 *  Then run: npx prisma migrate deploy
 *
 *  All exported function signatures are identical between this
 *  file and db-postgres.ts — routes never need to change.
 * ═══════════════════════════════════════════════════════════════
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PasswordField {
  label: string;
  value: string; // AES-GCM encrypted — never store plaintext
}

export interface VaultItemAttachment {
  name: string;
  size: number;
  mimeType: string;
  data: string; // base64 encoded
}

export interface VaultItem {
  id: string;
  vaultId?: string;
  folderId?: string | null;
  type?: 'password' | 'note' | 'media';
  status?: 'active' | 'pending';
  title: string;
  description: string; // legacy field — maps to note in Postgres
  passwords?: PasswordField[];
  note?: string | null;
  attachment?: VaultItemAttachment | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vault {
  id: string;
  name: string;
  userId: string;
  color?: string;
  createdAt?: string;
  status?: 'active' | 'pending';
  data: VaultItem[];
}

export interface Folder {
  id: string;
  vaultId: string;
  parentId: string | null;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
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
  folders: Folder[]; // new — nested folder support
  activityLogs: ActivityLogEntry[];
}

// ─── Core Read/Write (private) ───────────────────────────────────────────────

async function readDb(): Promise<Database> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    return {
      users: db.users || [],
      vaults: db.vaults || [],
      folders: db.folders || [],
      activityLogs: db.activityLogs || [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { users: [], vaults: [], folders: [], activityLogs: [] };
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

export async function getVaultsForGuest(guestId: string): Promise<Vault[]> {
  const db = await readDb();
  const guest = db.users.find(u => u.id === guestId);
  // Include guest's own vaults + their inviting admin's active vaults
  if (!guest?.invitedBy) return db.vaults.filter(v => v.userId === guestId);
  return db.vaults.filter(v =>
    v.userId === guestId || (v.userId === guest.invitedBy && v.status !== 'pending')
  );
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
  // Cascade: remove folders and items belonging to this vault
  db.folders = db.folders.filter(f => f.vaultId !== vaultId);
  await writeDb(db);
  return true;
}

export async function countVaultsByUser(userId: string): Promise<number> {
  const vaults = await getVaults();
  return vaults.filter(v => v.userId === userId).length;
}

// ─── Vault Items ─────────────────────────────────────────────────────────────

export async function getVaultItems(vaultId: string, folderId?: string | null): Promise<VaultItem[]> {
  const vault = await getVaultById(vaultId);
  const items = vault?.data || [];
  // undefined = all items; null = root items; string = specific folder
  if (folderId === undefined) return items;
  return items.filter(i => (i.folderId ?? null) === folderId);
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
//  FOLDERS (JSON implementation — mirrors db-postgres.ts API)
// ════════════════════════════════════════════════════════════════

export async function getFoldersByVault(vaultId: string, parentId?: string | null): Promise<Folder[]> {
  const db = await readDb();
  const folders = db.folders.filter(f => f.vaultId === vaultId);
  if (parentId === undefined) return folders;
  return folders.filter(f => f.parentId === parentId);
}

export async function getFolderById(folderId: string): Promise<Folder | undefined> {
  const db = await readDb();
  return db.folders.find(f => f.id === folderId);
}

export async function createFolder(folder: Omit<Folder, 'id' | 'createdAt'>): Promise<Folder> {
  // Guard: max depth 8
  if (folder.parentId) {
    const depth = await getFolderDepth(folder.parentId);
    if (depth >= 8) throw new Error('MAX_DEPTH_EXCEEDED');
  }
  const newFolder: Folder = {
    id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    ...folder,
  };
  const db = await readDb();
  db.folders.push(newFolder);
  await writeDb(db);
  return newFolder;
}

export async function updateFolder(folderId: string, updates: Partial<Pick<Folder, 'name' | 'color' | 'parentId' | 'icon'>>): Promise<Folder | undefined> {
  const db = await readDb();
  const index = db.folders.findIndex(f => f.id === folderId);
  if (index === -1) return undefined;
  db.folders[index] = { ...db.folders[index], ...updates };
  await writeDb(db);
  return db.folders[index];
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  const db = await readDb();
  const index = db.folders.findIndex(f => f.id === folderId);
  if (index === -1) return false;
  // Cascade children folders
  const toDelete = collectDescendants(folderId, db.folders);
  db.folders = db.folders.filter(f => !toDelete.has(f.id));
  // SET NULL: items under deleted folders move to vault root
  db.vaults.forEach(vault => {
    vault.data?.forEach(item => {
      if (item.folderId && toDelete.has(item.folderId)) {
        item.folderId = null;
      }
    });
  });
  await writeDb(db);
  return true;
}

function collectDescendants(folderId: string, allFolders: Folder[]): Set<string> {
  const result = new Set<string>([folderId]);
  const queue = [folderId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    allFolders
      .filter(f => f.parentId === current)
      .forEach(child => { result.add(child.id); queue.push(child.id); });
  }
  return result;
}

async function getFolderDepth(folderId: string, current = 0): Promise<number> {
  if (current > 8) return current;
  const folder = await getFolderById(folderId);
  if (!folder?.parentId) return current;
  return getFolderDepth(folder.parentId, current + 1);
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
    if (db.activityLogs.length > 2000) {
      db.activityLogs = db.activityLogs.slice(-2000);
    }
    await writeDb(db);
  } catch {
    // Logging must never throw
  }
}

export async function getUserActivityLogs(userId: string, limit = 50): Promise<ActivityLogEntry[]> {
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

export async function getAllActivityLogs(limit = 100): Promise<ActivityLogEntry[]> {
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
//  COMPOSITE (admin)
// ════════════════════════════════════════════════════════════════

export async function getFullDatabase(): Promise<Database> {
  return readDb();
}
