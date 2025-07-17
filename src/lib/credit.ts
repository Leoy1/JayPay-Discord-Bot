import db from './db'

type CreditScoreRow = { score: number }

export function getCreditScore(guildId: string, userId: string): number { const row = db.prepare(`SELECT score FROM credit_scores WHERE guild_id = ? and user_id = ?`).get(guildId, userId) as CreditScoreRow | undefined
    return row?.score ?? 600
}

export function updateCreditScore(guildId: string, userId: string, delta: number): void{
    const currentScore = getCreditScore(guildId, userId)

    const newScore = Math.min(850, Math.max(300, currentScore + delta))

    const stmt = db.prepare(`
        INSERT INTO credit_scores (guild_id, user_id, score)
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET score=excluded.score
    `)

    stmt.run(guildId, userId, newScore)
}