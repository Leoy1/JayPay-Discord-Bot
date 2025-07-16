import fs from 'fs'
import path from 'path'

const filePath = path.join(__dirname, '..', 'credits.json')

export function readCreditScores(): Record<string, { score: number }> {
    if(!fs.existsSync(filePath)) return {}
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

export function writeCreditScores(data: Record<string, { score: number }>) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export function updateCreditScore(userId: string, delta: number){
    const scores = readCreditScores()

    if(!scores[userId]){
        scores[userId] = {score: 600}
    }

    scores[userId].score = Math.max(300, Math.min(850, scores[userId].score + delta))
    writeCreditScores(scores)
}