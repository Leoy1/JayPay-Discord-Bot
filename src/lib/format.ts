export interface HistoryEntry{
  amount: number;
  reason?: string | null;
  timestamp?: number | null;
}

export function formatReasons(
  history: HistoryEntry[],
  opts?: { max?: number }
): string {
  if(!history || history.length === 0) {
    return '  (no history)';
  }

  const max = opts?.max ?? 5;
  const slice = history.slice(0, max);

  const lines = slice.map(h => {
    const isRepay = h.amount < 0;
    const verb = isRepay ? 'Repaid' : 'Lent';
    const amt = Math.abs(h.amount).toFixed(2);
    const why = (h.reason && h.reason.trim().length > 0) ? h.reason : 'No reason';
    const date = h.timestamp ? new Date(h.timestamp).toLocaleDateString() : '';
    const datePart = date ? ` on ${date}` : '';
    return `  - ${verb} $${amt} for "${why}"${datePart}`;
  });

  if(history.length > max) {
    lines.push(`  ...and ${history.length - max} more.`);
  }

  return lines.join('\n');
}

export function roundToTwoDecimals(num: number): number {
  return Math.round(num * 100) / 100;
}