/**
 * iCal / RFC 5545 string helpers for calendar feed generation.
 */

/** Format a JS Date as iCal UTC string: YYYYMMDDTHHMMSSZ */
export function icalDate(d) {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Format a JS Date as iCal all-day date string: YYYYMMDD */
export function icalDateOnly(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Escape special iCal characters in text fields */
export function icalEscape(str = "") {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Fold long iCal lines at 75 chars (RFC 5545 §3.1) */
export function foldLine(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

/** Build a VEVENT block from a CalendarEvent document or lean object */
export function buildVEventBlock(event) {
  const uid = `${event._id.toString()}@classos.local`;
  const dtstamp = icalDate(event.createdAt || new Date());
  const lines = [
    "BEGIN:VEVENT",
    foldLine(`UID:${uid}`),
    foldLine(`DTSTAMP:${dtstamp}`),
  ];

  if (event.allDay) {
    lines.push(foldLine(`DTSTART;VALUE=DATE:${icalDateOnly(event.startDate)}`));
    if (event.endDate) {
      lines.push(foldLine(`DTEND;VALUE=DATE:${icalDateOnly(event.endDate)}`));
    }
  } else {
    lines.push(foldLine(`DTSTART:${icalDate(event.startDate)}`));
    if (event.endDate) {
      lines.push(foldLine(`DTEND:${icalDate(event.endDate)}`));
    }
  }

  lines.push(foldLine(`SUMMARY:${icalEscape(event.title)}`));
  if (event.description) {
    lines.push(foldLine(`DESCRIPTION:${icalEscape(event.description)}`));
  }
  lines.push(foldLine(`CATEGORIES:${event.type.toUpperCase()}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}
