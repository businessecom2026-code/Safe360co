/**
 * ═══════════════════════════════════════════════════════════════
 *  Safe360 — Database Abstraction Layer (PostgreSQL / Prisma)
 * ═══════════════════════════════════════════════════════════════
 *  All database operations live here. Swap DATABASE_URL in .env
 *  to switch between Replit/Neon (prod) and JSON file (dev).
 *  Routes and middleware import ONLY from db.ts — zero coupling.
 * ═══════════════════════════════════════════════════════════════
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { User } from '../../types';

// ─── Singleton Prisma Client ──────────────────────────────────────────────────
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ─── Types (public contract — identical to db.ts JSON layer) ─────────────────

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
  status?: 'active' | 'pending'; // guest submissions start as 'pending'
  title: string;
  description: string; // legacy compat — maps to note field
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
  data: VaultItem[]; // always [] — items fetched separately via getVaultItems()
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

// ─── Internal mappers ─────────────────────────────────────────────────────────

function mapUser(u: Prisma.UserGetPayload<object>): User {
  return {
    id: u.id,
    email: u.email,
    password: u.password,
    role: u.role as User['role'],
    plan: (u.plan ?? undefined) as User['plan'],
    planExpiresAt: u.planExpiresAt?.toISOString(),
    invitedBy: u.invitedBy ?? undefined,
    inviteToken: u.inviteToken ?? undefined,
    activated: u.activated,
    resetToken: u.resetToken ?? undefined,
    resetTokenExpiry: u.resetTokenExpiry?.toISOString(),
    createdAt: u.createdAt.toISOString(),
  };
}

function mapVault(v: Prisma.VaultGetPayload<object>): Vault {
  return {
    id: v.id,
    name: v.name,
    userId: v.userId,
    color: v.color,
    createdAt: v.createdAt.toISOString(),
    status: v.status as 'active' | 'pending',
    data: [], // items always fetched via getVaultItems — never embedded
  };
}

function mapItem(i: Prisma.VaultItemGetPayload<object>): VaultItem {
  const passwords = Array.isArray(i.passwords) ? (i.passwords as unknown) as PasswordField[] : [];
  const attachment = i.attachment ? (i.attachment as unknown) as VaultItemAttachment : null;
  return {
    id: i.id,
    vaultId: i.vaultId,
    folderId: i.folderId,
    type: i.type as VaultItem['type'],
    status: (i.status ?? 'active') as 'active' | 'pending',
    title: i.title,
    description: i.note ?? '', // legacy compat for existing routes
    passwords,
    note: i.note,
    attachment,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

function mapFolder(f: Prisma.FolderGetPayload<object>): Folder {
  return {
    id: f.id,
    vaultId: f.vaultId,
    parentId: f.parentId,
    name: f.name,
    color: f.color,
    icon: f.icon ?? 'Folder',
    createdAt: f.createdAt.toISOString(),
  };
}

function mapLog(l: Prisma.ActivityLogGetPayload<object>): ActivityLogEntry {
  return {
    id: l.id,
    userId: l.userId,
    action: l.action,
    details: l.details ?? undefined,
    ip: l.ip ?? undefined,
    timestamp: l.timestamp.toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════
//  USERS
// ════════════════════════════════════════════════════════════════

export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return users.map(mapUser);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? mapUser(u) : undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const u = await prisma.user.findUnique({ where: { email } });
  return u ? mapUser(u) : undefined;
}

export async function getUserByResetToken(token: string): Promise<{ user: User; index: number } | undefined> {
  const u = await prisma.user.findUnique({ where: { resetToken: token } });
  if (!u) return undefined;
  return { user: mapUser(u), index: 0 };
}

export async function getUserByInviteToken(token: string): Promise<{ user: User; index: number } | undefined> {
  const u = await prisma.user.findFirst({
    where: { inviteToken: token, activated: false },
  });
  if (!u) return undefined;
  return { user: mapUser(u), index: 0 };
}

export async function getGuestsByInviter(inviterId: string): Promise<User[]> {
  const users = await prisma.user.findMany({ where: { invitedBy: inviterId } });
  return users.map(mapUser);
}

export async function createUser(user: User): Promise<User> {
  const created = await prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      password: user.password,
      role: user.role,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt ? new Date(user.planExpiresAt) : null,
      invitedBy: user.invitedBy ?? null,
      inviteToken: user.inviteToken ?? null,
      activated: user.activated ?? true, // guests set activated:false explicitly; regular users default to true
    },
  });
  return mapUser(created);
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
  try {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(updates.email !== undefined && { email: updates.email }),
        ...(updates.password !== undefined && { password: updates.password }),
        ...(updates.role !== undefined && { role: updates.role }),
        ...(updates.plan !== undefined && { plan: updates.plan }),
        ...(updates.planExpiresAt !== undefined && { planExpiresAt: updates.planExpiresAt ? new Date(updates.planExpiresAt) : null }),
        ...(updates.inviteToken !== undefined && { inviteToken: updates.inviteToken ?? null }),
        ...(updates.activated !== undefined && { activated: updates.activated }),
        ...(updates.resetToken !== undefined && { resetToken: updates.resetToken ?? null }),
        ...(updates.resetTokenExpiry !== undefined && { resetTokenExpiry: updates.resetTokenExpiry ? new Date(updates.resetTokenExpiry) : null }),
      },
    });
    return mapUser(updated);
  } catch {
    return undefined;
  }
}

// Legacy: index-based updates — no-op in Postgres (callers use updateUser by id)
export async function updateUserByIndex(index: number, updates: Partial<User>): Promise<void> {
  void index; void updates;
}

export async function countGuestsByInviter(inviterId: string): Promise<number> {
  return prisma.user.count({ where: { invitedBy: inviterId } });
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
//  VAULTS
// ════════════════════════════════════════════════════════════════

export async function getVaults(): Promise<Vault[]> {
  const vaults = await prisma.vault.findMany({ orderBy: { createdAt: 'asc' } });
  return vaults.map(mapVault);
}

export async function getVaultsByUser(userId: string): Promise<Vault[]> {
  const vaults = await prisma.vault.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return vaults.map(mapVault);
}

export async function getVaultById(vaultId: string): Promise<Vault | undefined> {
  const v = await prisma.vault.findUnique({ where: { id: vaultId } });
  return v ? mapVault(v) : undefined;
}

export async function getVaultsForAdmin(adminId: string): Promise<Vault[]> {
  const guestIds = await prisma.user.findMany({
    where: { invitedBy: adminId },
    select: { id: true },
  });
  const ids = [adminId, ...guestIds.map(g => g.id)];
  const vaults = await prisma.vault.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: 'asc' },
  });
  return vaults.map(mapVault);
}

export async function getVaultsForGuest(guestId: string): Promise<Vault[]> {
  // Guest sees their own vaults + their inviter's vaults
  const guest = await prisma.user.findUnique({ where: { id: guestId }, select: { invitedBy: true } });
  const ids = [guestId];
  if (guest?.invitedBy) ids.push(guest.invitedBy);
  const vaults = await prisma.vault.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: 'asc' },
  });
  return vaults.map(mapVault);
}

export async function createVault(vault: Vault): Promise<Vault> {
  const created = await prisma.vault.create({
    data: {
      id: vault.id,
      name: vault.name,
      userId: vault.userId,
      color: vault.color ?? '#6366f1',
      status: vault.status ?? 'active',
      createdAt: vault.createdAt ? new Date(vault.createdAt) : new Date(),
    },
  });
  return mapVault(created);
}

export async function updateVault(vaultId: string, updates: Partial<Vault>): Promise<Vault | undefined> {
  try {
    const updated = await prisma.vault.update({
      where: { id: vaultId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.color !== undefined && { color: updates.color }),
      },
    });
    return mapVault(updated);
  } catch {
    return undefined;
  }
}

export async function deleteVault(vaultId: string): Promise<boolean> {
  try {
    await prisma.vault.delete({ where: { id: vaultId } });
    return true;
  } catch {
    return false;
  }
}

export async function countVaultsByUser(userId: string): Promise<number> {
  return prisma.vault.count({ where: { userId } });
}

// ─── Vault Items ─────────────────────────────────────────────────────────────

export async function getVaultItems(vaultId: string, folderId?: string | null): Promise<VaultItem[]> {
  const where: Prisma.VaultItemWhereInput = { vaultId };
  if (folderId !== undefined) where.folderId = folderId;
  const items = await prisma.vaultItem.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
  return items.map(mapItem);
}

export async function addVaultItem(vaultId: string, item: VaultItem): Promise<VaultItem | undefined> {
  try {
    const created = await prisma.vaultItem.create({
      data: {
        id: item.id,
        vaultId,
        folderId: item.folderId ?? null,
        type: item.type ?? 'note',
        status: item.status ?? 'active',
        title: item.title,
        passwords: ((item.passwords ?? []) as unknown) as Prisma.InputJsonValue,
        note: item.description || item.note || null,
        attachment: item.attachment ? (item.attachment as unknown as Prisma.InputJsonValue) : null,
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      },
    });
    return mapItem(created);
  } catch {
    return undefined;
  }
}

export async function updateVaultItem(vaultId: string, itemId: string, updates: Partial<VaultItem>): Promise<VaultItem | undefined> {
  try {
    const updated = await prisma.vaultItem.update({
      where: { id: itemId, vaultId },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { note: updates.description }),
        ...(updates.note !== undefined && { note: updates.note }),
        ...(updates.passwords !== undefined && { passwords: (updates.passwords as unknown) as Prisma.InputJsonValue }),
        ...(updates.folderId !== undefined && { folderId: updates.folderId }),
        ...(updates.type !== undefined && { type: updates.type }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.attachment !== undefined && {
          attachment: updates.attachment
            ? (updates.attachment as unknown as Prisma.InputJsonValue)
            : null,
        }),
        updatedAt: new Date(),
      },
    });
    return mapItem(updated);
  } catch {
    return undefined;
  }
}

export async function deleteVaultItem(vaultId: string, itemId: string): Promise<boolean> {
  try {
    await prisma.vaultItem.delete({ where: { id: itemId, vaultId } });
    return true;
  } catch {
    return false;
  }
}

export async function countVaultItems(vaultId: string): Promise<number> {
  return prisma.vaultItem.count({ where: { vaultId } });
}

// ════════════════════════════════════════════════════════════════
//  FOLDERS
// ════════════════════════════════════════════════════════════════

export async function getFoldersByVault(vaultId: string, parentId?: string | null): Promise<Folder[]> {
  const where: Prisma.FolderWhereInput = { vaultId };
  if (parentId !== undefined) where.parentId = parentId;
  const folders = await prisma.folder.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
  return folders.map(mapFolder);
}

export async function getFolderById(folderId: string): Promise<Folder | undefined> {
  const f = await prisma.folder.findUnique({ where: { id: folderId } });
  return f ? mapFolder(f) : undefined;
}

export async function createFolder(folder: Omit<Folder, 'id' | 'createdAt'>): Promise<Folder> {
  if (folder.parentId) {
    const depth = await getFolderDepth(folder.parentId);
    if (depth >= 8) throw new Error('MAX_DEPTH_EXCEEDED');
  }
  const created = await prisma.folder.create({
    data: {
      vaultId: folder.vaultId,
      parentId: folder.parentId,
      name: folder.name,
      color: folder.color ?? '#6366f1',
      icon: folder.icon ?? 'Folder',
    },
  });
  return mapFolder(created);
}

export async function updateFolder(folderId: string, updates: Partial<Pick<Folder, 'name' | 'color' | 'parentId' | 'icon'>>): Promise<Folder | undefined> {
  try {
    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.color !== undefined && { color: updates.color }),
        ...(updates.parentId !== undefined && { parentId: updates.parentId }),
        ...(updates.icon !== undefined && { icon: updates.icon }),
      },
    });
    return mapFolder(updated);
  } catch {
    return undefined;
  }
}

export async function deleteFolder(folderId: string): Promise<boolean> {
  try {
    await prisma.folder.delete({ where: { id: folderId } });
    return true;
  } catch {
    return false;
  }
}

async function getFolderDepth(folderId: string, current = 0): Promise<number> {
  if (current > 8) return current;
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { parentId: true },
  });
  if (!folder?.parentId) return current;
  return getFolderDepth(folder.parentId, current + 1);
}

// ════════════════════════════════════════════════════════════════
//  ACTIVITY LOGS
// ════════════════════════════════════════════════════════════════

export async function logActivity(userId: string, action: string, details?: string, ip?: string): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, details, ip },
    });
    // Prune: keep only last 2000 logs per user
    const oldLogs = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      skip: 2000,
      select: { id: true },
    });
    if (oldLogs.length > 0) {
      await prisma.activityLog.deleteMany({
        where: { id: { in: oldLogs.map(l => l.id) } },
      });
    }
  } catch {
    // Logging must never throw
  }
}

export async function getUserActivityLogs(userId: string, limit = 50): Promise<ActivityLogEntry[]> {
  const logs = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  return logs.map(mapLog);
}

export async function getAllActivityLogs(limit = 100): Promise<ActivityLogEntry[]> {
  const logs = await prisma.activityLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: limit,
  });
  return logs.map(mapLog);
}

// ════════════════════════════════════════════════════════════════
//  COMPOSITE / ADMIN
// ════════════════════════════════════════════════════════════════

export async function getFullDatabase() {
  const [users, vaults, activityLogs] = await prisma.$transaction([
    prisma.user.findMany(),
    prisma.vault.findMany({ include: { items: true } }),
    prisma.activityLog.findMany({ orderBy: { timestamp: 'desc' }, take: 2000 }),
  ]);
  return {
    users: users.map(mapUser),
    vaults: vaults.map(v => ({
      ...mapVault(v),
      data: v.items.map(mapItem),
    })),
    activityLogs: activityLogs.map(mapLog),
  };
}
