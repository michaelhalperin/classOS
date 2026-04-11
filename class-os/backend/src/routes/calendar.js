import express from "express";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import CalendarEvent from "../models/CalendarEvent.js";
import Classroom from "../models/Classroom.js";
import { requireAuth, requireTeacher } from "../middleware/auth.js";

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Verify teacher owns the class, or student is enrolled. Returns classroom or null. */
async function assertClassAccess(classId, user) {
  if (!mongoose.Types.ObjectId.isValid(classId)) return null;
  const cls = await Classroom.findById(classId);
  if (!cls) return null;
  if (user.role === "teacher") {
    return cls.teacherId.toString() === user._id.toString() ? cls : null;
  }
  const enrolled = cls.studentIds.some(
    (id) => id.toString() === user._id.toString(),
  );
  return enrolled ? cls : null;
}

/** Format a JS Date as iCal UTC string: YYYYMMDDTHHMMSSZ */
function icalDate(d) {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Format a JS Date as iCal all-day date string: YYYYMMDD */
function icalDateOnly(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Escape special iCal characters in text fields */
function icalEscape(str = "") {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Fold long iCal lines at 75 chars (RFC 5545 §3.1) */
function foldLine(line) {
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

/** Build a VEVENT block from a CalendarEvent document */
function buildVEvent(event) {
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
  // X-APPLE-CALENDAR-COLOR / X-MICROSOFT-CDO-BUSYSTATUS not widely reliable —
  // just add a category so apps can colour by type
  lines.push(foldLine(`CATEGORIES:${event.type.toUpperCase()}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /calendar/:classId — all events for a class (auth required)
router.get("/:classId", requireAuth, async (req, res) => {
  try {
    const cls = await assertClassAccess(req.params.classId, req.user);
    if (!cls)
      return res
        .status(403)
        .json({ message: "Class not found or access denied" });

    const events = await CalendarEvent.find({ classId: req.params.classId })
      .sort({ startDate: 1 })
      .lean();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /calendar/:classId — create custom event (teacher only)
router.post("/:classId", requireAuth, requireTeacher, async (req, res) => {
  try {
    const cls = await Classroom.findOne({
      _id: req.params.classId,
      teacherId: req.user._id,
    });
    if (!cls)
      return res
        .status(403)
        .json({ message: "Class not found or access denied" });

    const { title, description, startDate, endDate, allDay, color } = req.body;
    if (!title || !startDate) {
      return res
        .status(400)
        .json({ message: "title and startDate are required" });
    }

    const event = await CalendarEvent.create({
      classId: req.params.classId,
      title,
      description: description || "",
      type: "custom",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      allDay: allDay !== false,
      color: color || "#7c3aed",
      createdBy: req.user._id,
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /calendar/:classId/:eventId — edit custom event (teacher only)
router.put(
  "/:classId/:eventId",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const cls = await Classroom.findOne({
        _id: req.params.classId,
        teacherId: req.user._id,
      });
      if (!cls)
        return res
          .status(403)
          .json({ message: "Class not found or access denied" });

      const existing = await CalendarEvent.findOne({
        _id: req.params.eventId,
        classId: req.params.classId,
      });
      if (!existing)
        return res.status(404).json({ message: "Event not found" });
      if (existing.type !== "custom") {
        return res
          .status(400)
          .json({ message: "Only custom events can be edited directly" });
      }

      const { title, description, startDate, endDate, allDay, color } =
        req.body;
      const update = {};
      if (title !== undefined) update.title = title;
      if (description !== undefined) update.description = description;
      if (startDate !== undefined) update.startDate = new Date(startDate);
      if (endDate !== undefined)
        update.endDate = endDate ? new Date(endDate) : null;
      if (allDay !== undefined) update.allDay = allDay;
      if (color !== undefined) update.color = color;

      const event = await CalendarEvent.findByIdAndUpdate(
        req.params.eventId,
        update,
        { new: true },
      );
      res.json(event);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// DELETE /calendar/:classId/:eventId — delete custom event (teacher only)
router.delete(
  "/:classId/:eventId",
  requireAuth,
  requireTeacher,
  async (req, res) => {
    try {
      const cls = await Classroom.findOne({
        _id: req.params.classId,
        teacherId: req.user._id,
      });
      if (!cls)
        return res
          .status(403)
          .json({ message: "Class not found or access denied" });

      const existing = await CalendarEvent.findOne({
        _id: req.params.eventId,
        classId: req.params.classId,
      });
      if (!existing)
        return res.status(404).json({ message: "Event not found" });
      if (existing.type !== "custom") {
        return res
          .status(400)
          .json({ message: "Only custom events can be deleted directly" });
      }

      await CalendarEvent.findByIdAndDelete(req.params.eventId);
      res.json({ message: "Event deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
);

// GET /calendar/:classId/feed.ics — public iCal feed (no auth required)
// Cache-Control: 1 hour. Subscribe with this URL in Google / Apple Calendar.
router.get("/:classId/feed.ics", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.classId)) {
      return res.status(400).send("Invalid class ID");
    }

    const cls = await Classroom.findById(req.params.classId).select("name");
    if (!cls) return res.status(404).send("Class not found");

    const events = await CalendarEvent.find({ classId: req.params.classId })
      .sort({ startDate: 1 })
      .lean();

    const calName = icalEscape(cls.name || "Class OS Calendar");
    const vevents = events.map(buildVEvent).join("\r\n");

    const ical = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//Class OS//Calendar//EN`,
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      foldLine(`X-WR-CALNAME:${calName}`),
      "X-WR-TIMEZONE:UTC",
      vevents,
      "END:VCALENDAR",
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="classos-${req.params.classId}.ics"`,
    );
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(ical);
  } catch (err) {
    res.status(500).send("Internal server error");
  }
});

export default router;
