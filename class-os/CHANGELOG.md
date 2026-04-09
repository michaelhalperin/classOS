# Class OS — Changelog & Progress Tracker

This file is updated after every task. It serves as a handoff doc — so any future session can quickly understand what's been done, how, and where to continue.

---

## Session: April 9, 2026

### 🔍 Full Codebase Audit
**Status:** Complete  
**What was done:**
Read and analyzed every file in the project — all backend routes, models, middleware, services, and all frontend pages, components, contexts, hooks, and API files.

**Key findings documented:**

**✅ What's good:**
- Clean separation: routes / models / contexts / hooks / api files
- All routes verify classroom ownership or enrollment before touching data
- TanStack Query used everywhere (no raw useEffect fetching)
- React Hook Form on all forms
- sessionStorage (not localStorage) allows teacher + student open simultaneously in different tabs
- Legacy localStorage → API migration in `useLessonProgress.js`
- AI service (`aiService.js`) is well-structured with safe JSON parsing and token truncation
- Cascade deletes work correctly when deleting a class
- Quiz answer stripping (`safeQuiz()`) correctly hides answers from students

**🔴 Critical issues found:**
- Real OpenAI API key exposed in `.env` — rotate if using git
- `JWT_SECRET` is still the default placeholder string
- `cors()` is wide open with no origin whitelist

**🟡 Bugs found:**
- Quiz allows infinite retakes — no check for existing attempt before creating new `QuizAttempt`
- Deleting a student does NOT clean up `QuizAttempt` or `LessonVisit` records (orphaned data)
- Comment in `axios.js` says "localStorage" but code uses `sessionStorage`

**🟠 Duplicate code found:**
- `lessonIdsForClass()` duplicated in `assignments.js` and `submissions.js`
- `assertLessonAccess()` duplicated in `questions.js` and `ai.js`
- `fileIcon()` and `formatBytes()` duplicated in `LessonEditor.jsx` and `LessonView.jsx`

**🔵 Missing / improvements:**
- No rate limiting on `/code/run` or `/ai/*` endpoints
- Lesson `orderIndex` is manual (no drag-and-drop reorder)
- No way for student to retract a submission
- `Assignment` model has no `classId` — multi-hop chain queries (Assignment → Lesson → Classroom)

---

---

## Session: April 9, 2026 — Bug Fixes & Deduplication

### Bug Fixes
**Status:** Complete  
**Files changed:**
- `backend/src/routes/quizzes.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/classes.js`
- `frontend/src/api/axios.js`

**What was done:**

1. **Quiz infinite retakes** — `POST /quizzes/:id/attempt` now checks for an existing `QuizAttempt` before creating a new one. Returns `409` if the student already has an attempt. One attempt per student per quiz.

2. **Orphaned records on student delete** — Both `DELETE /auth/students/:id` and `DELETE /classes/:id/students/:studentId/account` now also delete `LessonVisit` and `QuizAttempt` records for that student. Previously only `Submission` and `LessonNote` were cleaned up.

3. **Misleading comment in axios.js** — Changed comment from "localStorage" to "sessionStorage" to match what the code actually does.

---

### Code Quality / Deduplication
**Status:** Complete  
**New files created:**
- `backend/src/utils/classHelpers.js` — shared backend helpers
- `frontend/src/utils/fileHelpers.js` — shared frontend helpers

**Files updated:**
- `backend/src/routes/assignments.js` — removed local `lessonIdsForClass()`, now imports from `classHelpers.js`
- `backend/src/routes/submissions.js` — same as above
- `backend/src/routes/questions.js` — removed local `assertLessonAccess()`, now imports from `classHelpers.js`; also removed unused `Classroom` import
- `backend/src/routes/ai.js` — same `assertLessonAccess()` removal
- `frontend/src/pages/teacher/LessonEditor.jsx` — removed local `fileIcon()` and `formatBytes()`, now imports from `fileHelpers.js`
- `frontend/src/pages/student/LessonView.jsx` — removed local `lessonFileIcon()` and `lessonFormatBytes()`, renamed call sites to match shared `fileIcon()` / `formatBytes()`

**How:** Extracted each duplicated function into a single shared module. All callers import from that module. No logic was changed — purely structural refactor.

---

---

## Session: April 9, 2026 — Improvements #11, 12, 13, 15

### 11 — Rate Limiting on `/code/run` and `/ai/*`
**Status:** Complete  
**New file:** `backend/src/middleware/rateLimit.js`  
**Files changed:** `backend/src/server.js`

**What was done:** Created a zero-dependency in-memory rate limiter middleware. Tracks requests per authenticated user (falls back to IP). Sets standard `X-RateLimit-*` headers. Returns `429` with a `Retry-After` header when exceeded.

**Limits applied:**
- `/code` — 15 requests per minute (code execution is expensive via Judge0)
- `/ai` — 30 requests per minute (OpenAI API costs money)

**How:** Pure JS `Map` keyed by user id with a periodic cleanup interval (`.unref()` so it doesn't block process exit). No `express-rate-limit` package needed.

---

### 12 — XSS: Markdown Sanitization
**Status:** Complete  
**Package added:** `rehype-sanitize@6.0.0` (frontend)  
**Files changed:** `frontend/src/pages/student/LessonView.jsx`, `frontend/src/pages/teacher/LessonEditor.jsx`

**What was done:** Added `rehype-sanitize` as a `rehypePlugins` prop on every `<ReactMarkdown>` instance. This strips any raw HTML that would otherwise pass through the markdown renderer — preventing XSS from malicious lesson content.

**Note:** ReactMarkdown doesn't render raw HTML by default, but making it explicit via the plugin is the correct defence-in-depth approach.

---

### 13 — Drag-and-Drop Lesson Reorder
**Status:** Complete  
**New backend route:** `PATCH /lessons/reorder`  
**Files changed:**
- `backend/src/routes/lessons.js` — new reorder endpoint
- `frontend/src/api/lessons.js` — new `reorderLessons()` call
- `frontend/src/pages/teacher/LessonEditor.jsx` — sidebar replaced with drag-and-drop

**What was done:** Replaced the manual `orderIndex` number input in the sidebar with HTML5 drag-and-drop. Teacher can now drag lessons up/down within their week group. On drop, the new order is computed client-side and bulk-saved to the backend in one `PATCH /lessons/reorder` call.

**How:** Uses native browser `draggable` + `onDragStart/onDragEnd/onDragOver` events — no extra dependency. Backend validates all lesson IDs belong to the class before writing, then bulk-updates `weekNumber` + `orderIndex` in parallel. "Saving order…" indicator shown during the mutation.

**Note:** The manual `weekNumber` + `orderIndex` fields in the form are still there for precise editing when needed.

---

### 15 — Student Can Retract a Submission
**Status:** Complete  
**New backend route:** `DELETE /submissions/:id/retract`  
**Files changed:**
- `backend/src/routes/submissions.js` — new retract endpoint
- `frontend/src/api/submissions.js` — new `retractSubmission()` call
- `frontend/src/pages/student/Homework.jsx` — retract button on submitted cards

**What was done:** Students can now retract a submission that hasn't been graded yet. Retraction doesn't delete the record — it reverts it back to draft state (content moved to `draftContent`, `submittedAt` cleared) so the student can edit and re-submit.

**Rules enforced (backend):**
- Must be the submission owner
- Must not be graded yet (`grade` is null) — returns `409` if already graded
- Must have been submitted (not just a draft)

**UI:** A "Retract" button appears on each submitted-but-ungraded card in Homework. Clicking shows a confirmation dialog before proceeding. Button disappears once the assignment is graded.

---

## Session: April 9, 2026 — Responsive Navbar Redesign

### Navbar — Mobile Hamburger Menu & Responsive Layout
**Status:** Complete  
**Files changed:**
- `frontend/src/components/layout/Navbar.jsx` — full rewrite

**What was done:**  
Replaced the broken `overflow-x-auto` nav that caused a horizontal scrollbar on small screens with a fully responsive navbar.

**Desktop (md and up):**
- Logo on the left, nav links in the middle (flex row, no overflow), class picker on the right
- Active link shows a subtle `bg-brand-50` background and an animated underline pill that glides between links using Framer Motion `layoutId`

**Mobile (below md):**
- Nav links are hidden; a hamburger button appears on the right
- Tapping the hamburger opens an animated dropdown drawer (spring animation via `motion/react`)
- Inside the drawer: class picker (full width) at the top, then nav links in a **2-column grid** so all links fit without scrolling
- Active link shows a small dot indicator on mobile
- Hamburger icon animates between ☰ and ✕ with a rotate transition

**Accessibility & UX:**
- `aria-expanded`, `aria-controls`, `aria-label` on the hamburger button
- Drawer closes on: route navigation, outside click, `Escape` key
- `useReducedMotion` hook disables all animations for users who prefer reduced motion
- All interactive elements have `focus-visible` outline styles

**How:**  
Native React state + `useEffect` for drawer control. Framer Motion `AnimatePresence` + `motion.div` for the drawer animation and icon swap. No new dependencies — `motion/react` was already installed. `ClassPicker` extracted into its own sub-component and reused in both desktop and mobile positions.

---

## Session: April 9, 2026 — Sidebar Navigation Redesign

### Navigation — Full Redesign: Top Navbar → Sidebar
**Status:** Complete  
**Files changed:**
- `frontend/src/components/layout/Navbar.jsx` — complete rewrite as a sidebar
- `frontend/src/components/layout/PageLayout.jsx` — updated to sidebar + main content layout

**What was done:**  
Replaced the horizontal top navbar (which cramped 10 teacher links into a single row) with a proper vertical sidebar. This is the standard layout pattern for desktop-first apps with many navigation items (Notion, Linear, Vercel, etc.).

**Sidebar structure (top → bottom):**
1. **Logo + role badge** — "Class OS" wordmark with the user's role (Teacher / Student) shown in a small tinted label beneath
2. **Class picker** — custom dropdown replacing the native `<select>`, shows active class name with a school icon and animated chevron
3. **Nav links** — each has an icon + label, with a sliding animated pill (`layoutId`) and left-edge accent bar for the active item
4. **Bottom section** — Settings link + user chip showing name/email/avatar initial + logout button

**PageLayout change:**  
Changed from `min-h-screen` stacked layout to a `flex h-screen` split: sidebar is `w-56 sticky` on the left, main content area is `flex-1 overflow-y-auto` on the right. The sidebar never scrolls; the content does.

**Icons:**  
Every nav item has a custom inline SVG icon (no icon library dependency).

**Interactions:**
- Active pill glides between links with Framer Motion `layoutId`  
- Logo mark has a subtle scale + rotate on hover
- Class picker dropdown has spring-animated open/close
- Logout button has hover/tap scale feedback
- All animations respect `useReducedMotion`

---

## Session: April 9, 2026 — Lesson Editor Redesign

### LessonEditor — Complete Layout Overhaul
**Status:** Complete  
**Files changed:**
- `frontend/src/pages/teacher/LessonEditor.jsx` — complete rewrite

**What was done:**  
Replaced the single-column scrolling form with a proper **3-zone editor layout** used by every serious content editor (Notion, Craft, Linear):

**Zone 1 — Left: Lesson list (240px)**
- Groups lessons by week with a thin divider header
- Drag-and-drop reorder preserved with improved drag handles (dot-grid icon)
- Active lesson has a sliding left-edge accent bar (Framer Motion `layoutId`)
- "New lesson" button in header

**Zone 2 — Centre: Editor (flex-1, fills all remaining space)**
- Top bar: large inline title input (no label, just placeholder), Edit/Preview toggle as a segmented control, Save button — all in one clean strip
- Writing area: full-height `<textarea>` in monospace, no border, just background — feels like a real editor
- Preview: renders markdown in a centered `max-w-3xl` reader layout, with the lesson title as an `<h1>`
- Status bar at the bottom: live char/word count, unsaved indicator, save status, Q&A link and delete lesson action

**Zone 3 — Right: Tabbed panel (288px)**
- Three tabs: **Details** (week/order/objectives), **AI Tools** (all AI actions as clean button list with spinners), **Files** (drag-target-style upload zone + file list)
- Tab indicator slides between tabs with `layoutId`
- AI results appear inline below the buttons with AnimatePresence

**Why this is better:**
- The editor textarea is now the dominant element — the whole screen is the editor
- Metadata and AI tools are tucked away in a panel — present when needed, not cluttering the main flow
- No vertical scrolling through a long form to get to the content field
- Word count + unsaved indicator are always visible

---

## Next Up
_Tasks will be added here as they are assigned._

---

> **Format for each entry:**
> ### Task Name
> **Date:** YYYY-MM-DD  
> **Status:** Complete / In Progress / Blocked  
> **Files changed:** list of files  
> **What was done:** summary  
> **How:** approach / pattern used  
> **Where to continue:** what's left or what comes next  
