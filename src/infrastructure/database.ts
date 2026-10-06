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
      expires_at TEXT,
      status TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `);
  return database;
}
