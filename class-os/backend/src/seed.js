import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Classroom from "./models/Classroom.js";
import Lesson from "./models/Lesson.js";
import Assignment from "./models/Assignment.js";
import Exercise from "./models/Exercise.js";
import {
  exampleHourContent,
  exampleHourObjectives,
} from "./seed/exampleHourLesson.js";

async function seed() {
  await connectDB();

  // Clear everything
  await Promise.all([
    User.deleteMany({}),
    Classroom.deleteMany({}),
    Lesson.deleteMany({}),
    Assignment.deleteMany({}),
    Exercise.deleteMany({}),
  ]);

  const hash = (pw) => bcrypt.hash(pw, 12);

  // ── Users ──────────────────────────────────────
  const [teacher, s1, s2, s3] = await User.create([
    {
      name: "Teacher",
      email: "teacher@class.com",
      passwordHash: await hash("password123"),
      role: "teacher",
    },
    {
      name: "Student One",
      email: "student1@class.com",
      passwordHash: await hash("password123"),
      role: "student",
    },
    {
      name: "Student Two",
      email: "student2@class.com",
      passwordHash: await hash("password123"),
      role: "student",
    },
    {
      name: "Student Three",
      email: "student3@class.com",
      passwordHash: await hash("password123"),
      role: "student",
    },
  ]);

  const mainClass = await Classroom.create({
    name: "Full Stack 101",
    description:
      "Default demo class — lessons, assignments, and roster are scoped here.",
    teacherId: teacher._id,
    studentIds: [s1._id, s2._id, s3._id],
  });

  // ── Lessons ────────────────────────────────────
  const [exampleHour, lesson1, lesson2, lesson3] = await Lesson.create([
    {
      classId: mainClass._id,
      title: "Example (60 min): Full Stack Starter Workshop",
      objectives: exampleHourObjectives,
      content: exampleHourContent,
      weekNumber: 1,
      orderIndex: 0,
    },
    {
      classId: mainClass._id,
      title: "Introduction to Full Stack Development",
      content: `# Welcome to the Course!\n\nIn this lesson we'll cover the fundamentals of full stack development.\n\n## What you'll learn\n\n- The difference between frontend and backend\n- How HTTP requests and responses work\n- Setting up your development environment\n\n## The Stack\n\nWe'll be using:\n\n| Layer | Tech |\n|---|---|\n| Frontend | React + Vite + Tailwind |\n| Backend | Node.js + Express |\n| Database | MongoDB + Mongoose |\n\n## Your First Task\n\nGet the project running locally following the SETUP.md guide.`,
      weekNumber: 1,
      orderIndex: 1,
    },
    {
      classId: mainClass._id,
      title: "Node.js & Express Basics",
      content: `# Node.js & Express\n\nLet's build your first REST API.\n\n## What is Node.js?\n\nNode.js is a JavaScript runtime built on Chrome's V8 engine. It lets you run JavaScript **outside the browser** — perfect for building servers.\n\n## Your First Express Server\n\n\`\`\`js\nimport express from 'express';\nconst app = express();\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello World!' });\n});\n\napp.listen(3000, () => console.log('Server running!'));\n\`\`\`\n\n## REST Methods\n\n- **GET** — fetch data\n- **POST** — create data\n- **PUT** — update data\n- **DELETE** — remove data`,
      weekNumber: 1,
      orderIndex: 2,
    },
    {
      classId: mainClass._id,
      title: "MongoDB & Mongoose",
      content: `# Databases with MongoDB\n\nLearn how to store and retrieve data.\n\n## What is MongoDB?\n\nMongoDB is a **NoSQL** document database. Instead of rows and tables, it stores data as JSON-like documents.\n\n## Defining a Schema\n\n\`\`\`js\nimport mongoose from 'mongoose';\n\nconst userSchema = new mongoose.Schema({\n  name: { type: String, required: true },\n  email: { type: String, required: true, unique: true },\n  role: { type: String, enum: ['teacher', 'student'] },\n});\n\nexport default mongoose.model('User', userSchema);\n\`\`\`\n\n## CRUD Operations\n\n\`\`\`js\n// Create\nconst user = await User.create({ name: 'Alice', email: 'a@b.com', role: 'student' });\n\n// Read\nconst users = await User.find({ role: 'student' });\n\n// Update\nawait User.findByIdAndUpdate(id, { name: 'Bob' });\n\n// Delete\nawait User.findByIdAndDelete(id);\n\`\`\``,
      weekNumber: 2,
      orderIndex: 1,
    },
  ]);

  // ── Assignments ────────────────────────────────
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  await Assignment.create([
    {
      lessonId: exampleHour._id,
      title: "After-class: trace one flow in your own words",
      instructions: `Pick **one** user action from your class app (for example: logging in, opening the lesson list, or submitting work).\n\nIn **8–12 sentences**, describe the path from **click or page load** → **HTTP method and path** → **what the server does** → **what the database is for** → **what appears on screen**.\n\nIf you draw a diagram (boxes and arrows), you may attach a photo or link instead of prose — but label POST/GET and JSON at least once.`,
      dueDate,
    },
    {
      lessonId: lesson1._id,
      title: "Environment Setup Checklist",
      instructions: `Complete the following and describe the steps you took:\n\n1. Install Node.js (v18+) and verify with \`node --version\`\n2. Install MongoDB locally or create a free Atlas cluster\n3. Clone the repo and get the backend running (\`npm run dev\`)\n4. Run the seed script and confirm the accounts were created\n5. Log in to the app with the teacher account\n\nWrite a short paragraph explaining any issues you ran into and how you solved them.`,
      dueDate,
    },
    {
      lessonId: lesson2._id,
      title: "Build a Simple Express API",
      instructions: `Create a new Express app (separate from this project) with the following endpoints:\n\n- GET /todos — return a list of 3 hardcoded todos\n- POST /todos — accept a JSON body with a "title" field and return it back with an id\n- DELETE /todos/:id — return a success message\n\nShare your code as a GitHub repo link or paste it below.`,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  ]);

  // ── Exercises ──────────────────────────────────
  await Exercise.create([
    {
      lessonId: exampleHour._id,
      title: "Read API-style JSON",
      instructions: `Imagine the server returned this **string** (as it often does over the wire):\n\nYou must **parse** it with \`JSON.parse\`, then:\n\n1. Log the **number of lessons** in the array.\n2. Log the **title** of the first lesson.\n3. Write a one-line comment: what HTTP method would you usually use to *fetch* this list from an API?`,
      language: "javascript",
      starterCode: `const body = \`{"lessons":[{"title":"HTTP & JSON","weekNumber":1},{"title":"Express Basics","weekNumber":1}]}\`;\n\n// TODO: parse \`body\`, then log count and first title\n`,
    },
    {
      lessonId: lesson2._id,
      title: "Reverse a String",
      instructions: `Write a function called \`reverseString\` that takes a string and returns it reversed.\n\nExamples:\n- reverseString("hello") → "olleh"\n- reverseString("world") → "dlrow"\n- reverseString("") → ""\n\nThen call it with a few test cases and log the results.`,
      language: "javascript",
      starterCode: `// Write your solution below\nfunction reverseString(str) {\n  // TODO: implement this\n}\n\n// Test it\nconsole.log(reverseString("hello"));\nconsole.log(reverseString("world"));\nconsole.log(reverseString(""));`,
    },
    {
      lessonId: lesson3._id,
      title: "FizzBuzz",
      instructions: `Write a Python program that prints the numbers from 1 to 30.\n\nBut for multiples of 3 print "Fizz" instead of the number, for multiples of 5 print "Buzz", and for multiples of both 3 and 5 print "FizzBuzz".`,
      language: "python",
      starterCode: `# FizzBuzz in Python\nfor i in range(1, 31):\n    # TODO: print Fizz, Buzz, FizzBuzz, or the number\n    pass`,
    },
  ]);

  console.log("\n✅ Seed complete!\n");
  console.log("  👩‍🏫  teacher@class.com    / password123");
  console.log("  🎓  student1@class.com  / password123");
  console.log("  🎓  student2@class.com  / password123");
  console.log("  🎓  student3@class.com  / password123\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
