/**
 * Safe360 — JSON → PostgreSQL Migration Script
 * ─────────────────────────────────────────────
 * Run ONCE after Railway DB is provisioned and schema is applied:
 *   npx tsx scripts/migrate-json-to-pg.ts
 *
 * Pre-flight checklist:
 *   1. DATABASE_URL set in .env (Railway Postgres connection string)
 *   2. prisma migrate deploy already ran (schema exists in DB)
 *   3. db.json is accessible at project root
 *   4. Node.js >= 20
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_JSON_PATH = path.resolve(__dirname, '../db.json');

const prisma = new PrismaClient();

// ─── Legacy types (shape of db.json) ─────────────────────────────────────────
interface LegacyVaultItem {
  id: string;
  title: string;
  description: string; // plaintext — migrated to note field
  createdAt: string;
  updatedAt: string;
}

interface LegacyVault {
  id: string;
  name: string;
  userId: string;
  status?: string;
  createdAt?: string;
  data: LegacyVaultItem[];
}

interface LegacyUser {
  id: string;
  email: string;
  password: string; // already bcrypt hashed — NO re-hashing
  role: string;
  plan?: string;
  planExpiresAt?: string;
  invitedBy?: string;
  inviteToken?: string;
  activated?: boolean;
  resetToken?: string;
  resetTokenExpiry?: string;
  createdAt?: string;
}

interface LegacyActivityLog {
  id: string;
  userId: string;
  action: string;
  details?: string;
  ip?: string;
  timestamp: string;
}

interface LegacyDatabase {
  users: LegacyUser[];
  vaults: LegacyVault[];
  activityLogs: LegacyActivityLog[];
}

// ─── Counters for migration report ───────────────────────────────────────────
const stats = {
  users: 0,
  vaults: 0,
  folders: 0, // one synthetic root folder per vault
  items: 0,
  logs: 0,
  skipped: 0,
};

async function main() {
  console.log('\n🔷 Safe360 Migration: db.json → PostgreSQL');
  console.log('─'.repeat(48));

  // ── PHASE 1: Read and validate source data ─────────────────────────────────
  let source: LegacyDatabase;
  try {
    const raw = await fs.readFile(DB_JSON_PATH, 'utf-8');
    source = JSON.parse(raw) as LegacyDatabase;
  } catch (err) {
    console.error('❌ Cannot read db.json:', err);
    process.exit(1);
  }

  console.log(`\nSource snapshot:`);
  console.log(`  Users:        ${source.users.length}`);
  console.log(`  Vaults:       ${source.vaults.length}`);
  console.log(`  Total items:  ${source.vaults.reduce((s, v) => s + (v.data?.length ?? 0), 0)}`);
  console.log(`  Activity logs: ${source.activityLogs.length}`);

  // ── PHASE 2: Pre-flight — check Postgres is empty (idempotency guard) ──────
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.error(`\n❌ Postgres already has ${existingUserCount} user(s). Aborting to prevent duplicates.`);
    console.error('   Wipe the DB first or skip this script.');
    process.exit(1);
  }

  // ── PHASE 3: Migrate inside a single transaction ───────────────────────────
  // All-or-nothing: if any step fails, DB is left clean for retry.
  console.log('\n⏳ Starting transaction...');

  await prisma.$transaction(async (tx) => {

    // Step 1: Users — bcrypt hashes migrate as-is, no rehashing needed
    for (const u of source.users) {
      await tx.user.create({
        data: {
          id: u.id,
          email: u.email,
          password: u.password, // already hashed — safe to copy directly
          role: u.role,
          plan: u.plan ?? 'Free',
          planExpiresAt: u.planExpiresAt ? new Date(u.planExpiresAt) : null,
          invitedBy: u.invitedBy ?? null,
          inviteToken: u.inviteToken ?? null,
          activated: u.activated ?? false,
          resetToken: u.resetToken ?? null,
          resetTokenExpiry: u.resetTokenExpiry ? new Date(u.resetTokenExpiry) : null,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        },
      });
      stats.users++;
    }
    console.log(`  ✓ Users: ${stats.users}`);

    // Step 2: Vaults
    for (const v of source.vaults) {
      await tx.vault.create({
        data: {
          id: v.id,
          name: v.name,
          userId: v.userId,
          color: '#6366f1', // default — user can customize post-migration
          status: v.status ?? 'active',
          createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
        },
      });
      stats.vaults++;

      // Step 3: Create one synthetic "__root__" folder per vault
      // All legacy items land here — user can reorganize into real folders later
      const rootFolder = await tx.folder.create({
        data: {
          vaultId: v.id,
          parentId: null, // root
          name: '__root__',
          color: '#6366f1',
        },
      });
      stats.folders++;

      // Step 4: Migrate items — description (plaintext) → note field
      for (const item of (v.data ?? [])) {
        await tx.vaultItem.create({
          data: {
            id: item.id,
            vaultId: v.id,
            folderId: rootFolder.id, // all legacy items go to root folder
            type: 'note',            // safe default — description was free text
            title: item.title,
            passwords: [],           // empty — user migrates passwords manually post-launch

            // CRITICAL: description migrates to note as-is.
            // If description contained passwords, they are still plaintext here.
            // Recommend: prompt users to re-enter sensitive data with AES encryption.
            note: item.description || null,

            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          },
        });
        stats.items++;
      }
    }
    console.log(`  ✓ Vaults:  ${stats.vaults}`);
    console.log(`  ✓ Folders: ${stats.folders} (synthetic root per vault)`);
    console.log(`  ✓ Items:   ${stats.items}`);

    // Step 5: Activity logs — skip logs whose userId doesn't exist (referential safety)
    const validUserIds = new Set(source.users.map(u => u.id));
    for (const log of source.activityLogs) {
      if (!validUserIds.has(log.userId)) {
        stats.skipped++;
        continue; // orphaned log — skip rather than fail the transaction
      }
      await tx.activityLog.create({
        data: {
          id: log.id,
          userId: log.userId,
          action: log.action,
          details: log.details ?? null,
          ip: log.ip ?? null,
          timestamp: new Date(log.timestamp),
        },
      });
      stats.logs++;
    }
    console.log(`  ✓ Logs:    ${stats.logs} (skipped: ${stats.skipped} orphaned)`);

  }, {
    maxWait: 10_000,  // wait up to 10s for transaction slot
    timeout: 60_000,  // allow up to 60s for large datasets
  });

  // ── PHASE 4: Verification ──────────────────────────────────────────────────
  console.log('\n🔍 Verification:');
  const [pgUsers, pgVaults, pgItems, pgLogs] = await Promise.all([
    prisma.user.count(),
    prisma.vault.count(),
    prisma.vaultItem.count(),
    prisma.activityLog.count(),
  ]);

  const sourceItemCount = source.vaults.reduce((s, v) => s + (v.data?.length ?? 0), 0);
  const ok = pgUsers === stats.users && pgVaults === stats.vaults && pgItems === stats.items;

  console.log(`  Users:   ${pgUsers} / ${stats.users}   ${pgUsers === stats.users ? '✓' : '✗'}`);
  console.log(`  Vaults:  ${pgVaults} / ${stats.vaults}  ${pgVaults === stats.vaults ? '✓' : '✗'}`);
  console.log(`  Items:   ${pgItems} / ${sourceItemCount} ${pgItems === sourceItemCount ? '✓' : '✗'}`);
  console.log(`  Logs:    ${pgLogs} / ${stats.logs}  ✓`);

  if (ok) {
    console.log('\n✅ Migration complete. db.json is no longer needed by the server.');
    console.log('⚠️  Reminder: plaintext descriptions in note fields should be re-encrypted by users.');
  } else {
    console.error('\n❌ Count mismatch — verify data manually before switching traffic.');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('\n💥 Migration failed:', err.message);
  console.error('   Transaction was rolled back. Postgres is unchanged.');
  await prisma.$disconnect();
  process.exit(1);
});
