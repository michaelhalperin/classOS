/** Short weekday labels (Sunday-first), for calendar headers. */
export const WEEKDAY_LABELS_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/** Full month names (January–December). */
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function addWeeks(d, n) {
  return addDays(d, n * 7);
}

/** Local calendar date at 00:00 (ignore time-of-day). */
export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Last millisecond of the local calendar day for `d`. */
export function endOfDay(d) {
  const s = startOfDay(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate(), 23, 59, 59, 999);
}

export function startOfWeek(d) {
  const sod = startOfDay(d);
  return addDays(sod, -sod.getDay());
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isToday(d) {
  return isSameDay(d, new Date());
}

export function fmtDate(d) {
  return `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
}

export function fmtDateTime(d) {
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmtDate(d)} at ${t}`;
}

export function toLocalDatetimeInput(d) {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

/** Build the 6-week grid for a month view */
export function buildMonthGrid(currentDate) {
  const first = startOfMonth(currentDate);
  const last = endOfMonth(currentDate);
  const start = startOfWeek(first);
  const days = [];
  let cur = start;
  while (cur <= last || days.length % 7 !== 0 || days.length < 35) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
    if (days.length > 42) break;
  }
  return days;
}

/** Get events that overlap a local calendar day (matches month + week columns). */
export function eventsOnDay(events, day) {
  if (!Array.isArray(events)) return [];
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return events.filter((e) => {
    const start = new Date(e.startDate);
    const end = e.endDate ? new Date(e.endDate) : start;
    return start <= dayEnd && end >= dayStart;
  });
}
