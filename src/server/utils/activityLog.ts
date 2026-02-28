import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../db.json');

export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  details?: string;
  ip?: string;
  timestamp: string;
}

export async function logActivity(userId: string, action: string, details?: string, ip?: string): Promise<void> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);

    if (!db.activityLogs) {
      db.activityLogs = [];
    }

    const entry: ActivityLogEntry = {
      id: `log_${Date.now()}`,
      userId,
      action,
      details,
      ip,
      timestamp: new Date().toISOString(),
    };

    db.activityLogs.push(entry);

    // Keep only last 500 logs per user, 2000 total
    if (db.activityLogs.length > 2000) {
      db.activityLogs = db.activityLogs.slice(-2000);
    }

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging should never break the main flow
  }
}

export async function getUserActivityLogs(userId: string, limit: number = 50): Promise<ActivityLogEntry[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    const logs: ActivityLogEntry[] = db.activityLogs || [];
    return logs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getAllActivityLogs(limit: number = 100): Promise<ActivityLogEntry[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    const logs: ActivityLogEntry[] = db.activityLogs || [];
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch {
    return [];
  }
}
