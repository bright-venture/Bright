/** True if `date` is within the last `minutes` (e.g. is the technician's position still live?). */
export function isRecent(date: Date | string, minutes: number, now = Date.now()) {
  return now - new Date(date).getTime() < minutes * 60_000;
}
