export function formatReasons(history: { amount: number; reason: string; timestamp: number }[]): string {
  return history
    .map(entry => {const date = new Date(entry.timestamp).toLocaleDateString();return `  - $${entry.amount} for "${entry.reason}" on ${date}`;})
    .join('\n');
}

export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}