import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function createDatabase(databasePath = process.env.DATABASE_PATH ?? "./data/evidencehub.sqlite"): Database.Database {
  mkdirSync(dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sku TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS evidence_requirements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      required INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS evidence_documents (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      requirement_id TEXT REFERENCES evidence_requirements(id) ON DELETE SET NULL,
      file_name TEXT NOT NULL,
      document_type TEXT NOT NULL,
      storage_key TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      status TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS evidence_audit_events (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES evidence_documents(id) ON DELETE CASCADE,
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      action TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL
    );
  `);
  const columns = database.prepare("PRAGMA table_info(evidence_documents)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));
  if (!columnNames.has("storage_key")) database.exec("ALTER TABLE evidence_documents ADD COLUMN storage_key TEXT NOT NULL DEFAULT ''");
  if (!columnNames.has("mime_type")) database.exec("ALTER TABLE evidence_documents ADD COLUMN mime_type TEXT NOT NULL DEFAULT 'application/octet-stream'");
  if (!columnNames.has("size_bytes")) database.exec("ALTER TABLE evidence_documents ADD COLUMN size_bytes INTEGER NOT NULL DEFAULT 0");
  return database;
}
