/**
 * Local-time range [start, end) for the ISO week that contains `ref`,
 * where the week starts on Monday at 00:00:00 and ends the following Monday (exclusive).
 */
export function localMondayWeekRange(ref = new Date()) {
  const start = new Date(ref);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
