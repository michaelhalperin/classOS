# Class OS — Setup Guide

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

---

## 1. Clone / open the project

The project lives in two folders:

- `backend/` — Express + MongoDB API
- `frontend/` — React + Vite app

---

## 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your values:

```
MONGODB_URI=mongodb://localhost:27017/class-os
JWT_SECRET=change_this_to_a_long_random_string
PORT=5000
```

---

## 3. Install dependencies

```bash
# from the class-os root
cd backend && npm install
cd ../frontend && npm install
```

---

## 4. Seed the database

```bash
cd backend
npm run seed
```

This creates:
| Email | Password | Role |
|---|---|---|
| teacher@class.com | password123 | teacher |
| student1@class.com | password123 | student |
| student2@class.com | password123 | student |
| student3@class.com | password123 | student |

---

## 5. Run the app

Open two terminals:

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
# → http://localhost:5000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

Visit **http://localhost:5173** and log in.

---

## Architecture

```
class-os/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── middleware/auth.js    # JWT + role guards
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   └── Lesson.js
│   │   ├── routes/
│   │   │   ├── auth.js           # POST /auth/register, /auth/login
│   │   │   └── lessons.js        # GET/POST/PUT/DELETE /lessons
│   │   ├── seed.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    └── src/
        ├── api/                  # axios.js, auth.js, lessons.js
        ├── context/AuthContext.jsx
        ├── router/index.jsx      # All routes + ProtectedRoute
        ├── components/layout/    # Navbar, PageLayout
        └── pages/
            ├── auth/Login.jsx
            ├── teacher/Dashboard.jsx
            ├── teacher/LessonEditor.jsx
            ├── student/Curriculum.jsx
            └── student/LessonView.jsx
```

---

## What's built (Phase 1)

✅ JWT auth (register + login)
✅ Role-based routing (teacher / student)
✅ Protected routes
✅ Lesson CRUD (teacher: create, edit, delete with markdown editor + live preview)
✅ Student curriculum view (grouped by week, progress bar)
✅ Student lesson view (rendered markdown, prev/next nav, mark complete)
✅ Seed data (1 teacher + 3 students + 3 sample lessons)
✅ TanStack Query for all data fetching
✅ React Hook Form for all forms
✅ Axios instance with automatic JWT attachment + 401 redirect

## Next up (Phase 2)

- Homework assignments + submissions
- Teacher grading interface
- Student progress dashboard grid
