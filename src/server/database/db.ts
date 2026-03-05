/**
 * ═══════════════════════════════════════════════════════════════
 *  Safe360 — Database Abstraction Layer (Auto-Switch)
 * ═══════════════════════════════════════════════════════════════
 *  Automatically selects the PostgreSQL backend when DATABASE_URL
 *  is present (Railway / production), otherwise falls back to the
 *  JSON-file backend (local development).
 *
 *  All exported function signatures are identical between both
 *  backends — routes and middleware never need to change.
 * ═══════════════════════════════════════════════════════════════
 */

// Type-only import for compile-time type inference (zero runtime cost).
export type {
  PasswordField,
  VaultItemAttachment,
  VaultItem,
  Vault,
  Folder,
  ActivityLogEntry,
} from './db-json';

// Runtime: load the correct implementation.
// Top-level await is valid in ESM modules (Node.js 20+, "type": "module").
// Prisma's PrismaClient constructor does NOT connect at instantiation —
// it only fails on the first query, so importing db-postgres is safe.
type DbModule = typeof import('./db-json');

const m = (await (
  process.env.DATABASE_URL ? import('./db-postgres') : import('./db-json')
)) as unknown as DbModule;

export const createUser           = m.createUser;
export const getUserById          = m.getUserById;
export const getUserByEmail       = m.getUserByEmail;
export const getUserByResetToken  = m.getUserByResetToken;
export const getUserByInviteToken = m.getUserByInviteToken;
export const getGuestsByInviter   = m.getGuestsByInviter;
export const updateUser           = m.updateUser;
export const updateUserByIndex    = m.updateUserByIndex;
export const countGuestsByInviter = m.countGuestsByInviter;
export const deleteUser           = m.deleteUser;
export const getUsers             = m.getUsers;

export const getVaults         = m.getVaults;
export const getVaultsByUser   = m.getVaultsByUser;
export const getVaultById      = m.getVaultById;
export const getVaultsForAdmin = m.getVaultsForAdmin;
export const getVaultsForGuest = m.getVaultsForGuest;
export const createVault       = m.createVault;
export const updateVault       = m.updateVault;
export const deleteVault       = m.deleteVault;
export const countVaultsByUser = m.countVaultsByUser;

export const getVaultItems   = m.getVaultItems;
export const addVaultItem    = m.addVaultItem;
export const updateVaultItem = m.updateVaultItem;
export const deleteVaultItem = m.deleteVaultItem;
export const countVaultItems = m.countVaultItems;

export const getFoldersByVault = m.getFoldersByVault;
export const getFolderById     = m.getFolderById;
export const createFolder      = m.createFolder;
export const updateFolder      = m.updateFolder;
export const deleteFolder      = m.deleteFolder;

export const logActivity         = m.logActivity;
export const getUserActivityLogs = m.getUserActivityLogs;
export const getAllActivityLogs   = m.getAllActivityLogs;
export const getFullDatabase     = m.getFullDatabase;
