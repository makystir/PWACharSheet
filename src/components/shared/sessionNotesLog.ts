/** Separator between timestamp and note text in each log entry string */
const SEPARATOR = '|';

/** Parse a log entry string into timestamp and text parts */
export function parseLogEntry(entry: string): { timestamp: number; text: string } {
  const sepIndex = entry.indexOf(SEPARATOR);
  if (sepIndex > 0) {
    const tsStr = entry.slice(0, sepIndex);
    const ts = Number(tsStr);
    if (!isNaN(ts) && ts > 0) {
      return { timestamp: ts, text: entry.slice(sepIndex + 1) };
    }
  }
  // Legacy entry without timestamp — treat as epoch 0
  return { timestamp: 0, text: entry };
}

/** Create a log entry string from text and current time */
export function createLogEntry(text: string, now: number = Date.now()): string {
  return `${now}${SEPARATOR}${text}`;
}
