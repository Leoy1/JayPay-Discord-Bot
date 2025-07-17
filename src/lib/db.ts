import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(__dirname, '..', '..', 'data', 'jaypay.db')
const db = new Database(dbPath)

db.exec(`
    CREATE TABLE IF NOT EXISTS credit_scores (
        guild_id TEXT,
        user_id TEXT,
        score INTEGER DEFAULT 600,
        PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        lender_id TEXT NOT NULL,
        lender_name TEXT,
        borrower_id TEXT NOT NULL,
        borrower_name TEXT,
        amount REAL NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS debt_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debt_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        reason TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE
    );
`)

export default db