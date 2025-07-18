import db from './db'

type CreditScoreRow = { score: number }
type PenaltyConfigRow = { per_day: number; max_penalty: number}

const DEFAULT_PER_DAY = 5
const DEFAULT_MAX_PENALTY = 100

export function getCreditScore(guildId: string, userId: string): number { const row = db.prepare(`SELECT score FROM credit_scores WHERE guild_id = ? and user_id = ?`).get(guildId, userId) as CreditScoreRow | undefined
    if(!row){
        const defaultScore = 600
        db.prepare(`INSERT INTO credit_scores (guild_id, user_id, score) VALUES (?, ?, ?)`).run(guildId, userId, defaultScore)
        return defaultScore
    }

    return row.score
}

export function updateCreditScore(guildId: string, userId: string, delta: number): void{
    const currentScore = getCreditScore(guildId, userId)
    const newScore = Math.min(850, Math.max(300, currentScore + delta))

    const stmt = db.prepare(`INSERT INTO credit_scores (guild_id, user_id, score) VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET score = excluded.score`)

    stmt.run(guildId, userId, newScore)
}

export function getPenaltyConfig(guildId: string): { perDay: number; maxPenalty: number }{
    const row = db.prepare(`SELECT per_day, max_penalty FROM penalty_config WHERE guild_id = ?`).get(guildId) as PenaltyConfigRow | undefined
    return{perDay: row?.per_day ?? DEFAULT_PER_DAY, maxPenalty: row?.max_penalty ?? DEFAULT_MAX_PENALTY,}
}

export function setPenaltyConfig(guildId: string, perDay: number, maxPenalty: number): void{
    const stmt = db.prepare(`INSERT INTO penalty_config (guild_id, per_day, max_penalty) VALUES (?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET per_day = excluded.per_day, max_penalty = excluded.max_penalty`)
    stmt.run(guildId, perDay, maxPenalty)
}

export function calculatePenalty(guildId: string, daysLate: number): number{
    if(daysLate <= 0) return 0
    const { perDay, maxPenalty } = getPenaltyConfig(guildId)
    return Math.min(perDay * daysLate, maxPenalty)
}

export function applyPenaltiesForUser(guildId: string, userId: string): void{
    const now = Date.now()

    const overdueDebts = db.prepare(`SELECT id, due_date, amount FROM debts WHERE guild_id = ? AND borrower_id = ? AND due_date IS NOT NULL AND due_date < ? AND amount > 0`).all(guildId, userId, now) as Array<{ id: number; due_date: number; amount: number }>

    const insertHistoryStmt = db.prepare('INSERT INTO debt_history (debt_id, amount, reason, timestamp) VALUES (?, ?, ?, ?)')

    for(const debt of overdueDebts){
        const alreadyPenalized = db.prepare(`SELECT 1 FROM debt_history WHERE debt_id = ? AND reason LIKE 'Penalty%' LIMIT 1`).get(debt.id)
        
        if(alreadyPenalized) continue

        const daysLate = Math.floor((now - debt.due_date) / (1000 * 60 * 60 * 24))
        if(daysLate > 0){
            const penalty = calculatePenalty(guildId, daysLate)
            if(penalty > 0){
                updateCreditScore(guildId, userId, -penalty)

                insertHistoryStmt.run(debt.id, 0, `Penalty for being ${daysLate} day(s) late (-${penalty} points)`, now)
            }
        }
    }
}