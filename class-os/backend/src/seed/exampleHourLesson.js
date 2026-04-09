/**
 * Example one-hour lesson for beginner full-stack students.
 * Used by seed.js — copy objectives/content into Lesson Editor for your own courses.
 */

export const exampleHourObjectives = `By the end of this hour, students should be able to:

- Define *full stack* and name the three main layers (client, server, database) in order.
- Describe what happens when a browser sends an HTTP GET request and receives JSON.
- Read a small JSON object and explain what each field represents.
- Trace a single user action (e.g. loading a list of lessons) from click → API → database → screen, in plain English.
- Identify where *business rules* (who may see what) typically live versus *presentation* (how it looks).`;

export const exampleHourContent = `# Example: One-hour full stack starter workshop

**Level:** beginner · **Format:** live session + short activities · **Total time:** 60 minutes

**Assumed background:** basic HTML/CSS awareness helpful but not required; no prior backend required.

---

## Agenda (minute-by-minute)

| Time | Block | What happens |
|------|--------|----------------|
| 0–8 min | **Hook & vocabulary** | Why full stack matters; client vs server vs database |
| 8–22 min | **HTTP & JSON** | Requests/responses; status codes; reading JSON |
| 22–38 min | **The stack in one app** | React (UI), Express (API), MongoDB (data) — how they talk |
| 38–50 min | **Guided trace** | Walk through one real flow (e.g. “load lessons”) step by step |
| 50–58 min | **Hands-on** | Pairs: diagram or pseudocode for “submit a form” end-to-end |
| 58–60 min | **Exit check** | One-minute recap + assign take-home |

---

## 0–8 min — Hook: what is “full stack”?

**Big idea:** A *full stack* developer can work on **what users see and click** (front end), **the rules and connections on the server** (back end), and **where data is stored** (database) — enough to ship a small feature vertically.

### Three places data lives

1. **Browser (client)** — React, buttons, forms, what the user sees.
2. **Server** — Node + Express: validates requests, applies rules, talks to the DB.
3. **Database** — MongoDB: durable storage for users, lessons, submissions, etc.

**Analogy (use aloud):** The browser is the *restaurant dining room*, the server is the *kitchen + manager*, the database is the *pantry and recipe cards*.

**Quick check (ask the room):** *Where does “must be logged in to see this page” usually get enforced — browser only, server only, or both?*  
**Answer to give:** Mostly **server** (and API). The UI can hide buttons, but the server must reject unauthorized API calls.

---

## 8–22 min — HTTP and JSON (the glue)

### HTTP in one sentence

The browser (or app) sends an **HTTP request**; the server sends back an **HTTP response** — often with **JSON** in the body for APIs.

### Methods students should recognize

| Method | Typical use |
|--------|-------------|
| **GET** | Read data (list lessons, load profile) |
| **POST** | Create something (sign up, submit assignment) |
| **PUT** / **PATCH** | Update existing data |
| **DELETE** | Remove data |

### Status codes (don’t memorize all — know these three)

- **200** — OK, success.
- **400** — Bad request (client sent something invalid).
- **401** / **403** — Not authenticated / not allowed.

### JSON

JSON is text that looks like JavaScript objects — keys in quotes, strings in quotes, arrays in \`[]\`, objects in \`{}\`.

\`\`\`json
{
  "title": "Intro to HTTP",
  "weekNumber": 1,
  "completed": false
}
\`\`\`

**Mini activity (3 min):** Paste a tiny JSON on the board; ask students to name the type of each value (string, number, boolean, array).

---

## 22–38 min — How the pieces talk (conceptual)

### Typical flow: loading data for a page

1. User opens a page in the **React** app.
2. React runs \`fetch('/api/lessons')\` or uses a data library that does the same (GET).
3. **Express** route handles \`GET /api/lessons\`, checks auth, queries **MongoDB** via Mongoose.
4. Server responds with **JSON** array of lessons.
5. React **sets state** and **renders** the list.

### Where logic belongs (teaching point)

| Concern | Usually where |
|--------|----------------|
| Layout, buttons, loading spinners | React |
| “Is this user allowed?” “Is this input valid?” for real security | Server |
| Long-term storage | Database |

**Say explicitly:** *Never trust the browser alone for security — always validate on the server.*

---

## 38–50 min — Guided trace (pick one real example)

Walk through **one** path slowly, naming each hop. Example script:

1. **User action:** Student clicks “Lessons” in the nav.
2. **Client:** React router shows the Lessons page; a \`useEffect\` or loader runs.
3. **Network:** Browser sends \`GET /lessons\` with cookies/headers for auth.
4. **Server:** Express middleware checks JWT/session; route handler runs.
5. **Database:** Mongoose \`Lesson.find()\` (maybe sorted by week).
6. **Response:** JSON array returned.
7. **Client:** React stores data in state, maps over array, renders cards.

**Optional:** Open DevTools → Network tab, filter XHR/fetch, show one GET and the JSON preview (if demoing live).

---

## 50–58 min — Hands-on (pairs or small groups)

**Task:** On paper or a shared doc, draw **boxes and arrows** for:

> *“Student fills out a form and submits a new assignment.”*

Must include: **browser**, **API route**, **database**, and labels for **POST**, **JSON body**, **save**, **response**.

**Stretch:** Add where you’d return **400** if the title were empty.

Give **8 minutes**, then **2 minutes** for one group to share.

---

## 58–60 min — Exit check & homework

**Exit ticket (verbal or chat):** *In one sentence, what does Express do that MongoDB does not?*

**Sample answer:** Express handles HTTP and application rules; MongoDB stores documents.

### Suggested take-home (align with your platform)

- Read your course’s \`SETUP.md\` and run the app locally.
- Skim one API route file and one React page that calls it — list three files you looked at.

---

## Instructor notes (for you)

- **Pacing:** If the group is fast, add a live curl: \`curl -i https://api.github.com\` to show headers + JSON.
- **If behind:** Skip the DevTools demo; keep the diagram trace.
- **Accessibility:** Offer the pair activity as solo with a printed template if needed.

---

*This lesson is seeded as an example in Class OS — duplicate and edit in the lesson editor for your cohort.*
`;
