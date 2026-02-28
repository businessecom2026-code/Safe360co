/**
 * Re-export from centralized database layer.
 * This file exists only for backwards compatibility.
 * Import directly from '../database/db' in new code.
 */
export { logActivity, getUserActivityLogs, getAllActivityLogs, type ActivityLogEntry } from '../database/db';
