import Database from 'better-sqlite3';
// Trigger nodemon restart after copying local database
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import dotenv from 'dotenv';

// 确保在读取环境变量前加载了 .env 文件
dotenv.config();

const envDbPath = process.env.DB_PATH;
const dbPath = envDbPath 
  ? (path.isAbsolute(envDbPath) ? envDbPath : path.join(process.cwd(), envDbPath))
  : path.join(process.cwd(), 'data', 'skincare.db');

console.log('[DB] Connecting to database at:', dbPath);
const sqlite = new Database(dbPath);

// 开启 WAL 模式，提高并发性能。若在 Windows NTFS 挂载卷下运行遇到共享内存限制报错，自动退回到 DELETE 模式。
try {
  sqlite.pragma('journal_mode = WAL');
} catch (e: any) {
  console.warn('[DB] 开启 WAL 模式失败，已自动退回到 DELETE 模式 (由于挂载文件系统限制):', e.message);
  try {
    sqlite.pragma('journal_mode = DELETE');
  } catch (err: any) {
    console.error('[DB] 设置 journal_mode = DELETE 失败:', err.message);
  }
}
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };
