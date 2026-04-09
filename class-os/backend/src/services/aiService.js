import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function isAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function truncate(text, max = 14000) {
  if (!text || text.length <= max) return text || '';
  return `${text.slice(0, max)}\n\n[…truncated for length]`;
}

/** @param {{ role: 'system'|'user'|'assistant', content: string }[]} messages */
export async function chat(messages, options = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI is not configured (missing OPENAI_API_KEY)');
    err.status = 503;
    throw err;
  }
  const { responseFormatJson = false, temperature = 0.6, maxTokens = 4096 } = options;
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(responseFormatJson ? { response_format: { type: 'json_object' } } : {}),
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    const err = new Error('Empty AI response');
    err.status = 502;
    throw err;
  }
  return content;
}

/**
 * Lesson-scoped tutor: answers in simple steps; cites headings/sections from lesson text.
 */
export async function tutorReply({ lesson, weekLessons, messages }) {
  const weekTitles = (weekLessons || [])
    .filter((l) => l._id.toString() !== lesson._id.toString())
    .map((l) => `- ${l.title} (lesson #${l.orderIndex})`)
    .join('\n');

  const system = `You are a supportive tutor for a single course lesson. You MUST:
- Base every answer ONLY on the lesson material and week context below. If something is not covered, say so and point to what to read instead of inventing facts.
- Answer in clear, short steps (numbered when helpful).
- When pointing students to re-read, name the exact section: quote or paraphrase the markdown heading (## or ###) from the lesson text when possible.
- Use simple language appropriate for students.
- Do not give full solutions to graded homework or exam-style tasks; encourage thinking instead.

--- THIS WEEK'S OTHER LESSONS (titles only; for context) ---
${weekTitles || '(none listed)'}

--- LEARNING OBJECTIVES (if any) ---
${lesson.objectives?.trim() || '(not specified — infer goals from lesson content only)'}

--- FULL LESSON MARKDOWN (primary source) ---
${truncate(lesson.content || '')}

--- LESSON TITLE ---
${lesson.title}
`;

  const history = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const fullMessages = [{ role: 'system', content: system }, ...history];
  return chat(fullMessages, { temperature: 0.55, maxTokens: 2048 });
}

/**
 * Code hint: never full assignment solution.
 */
export async function codeHint({
  code,
  language,
  lessonContent,
  lessonTitle,
  exerciseTitle,
  exerciseInstructions,
  assignmentTitle,
  assignmentInstructions,
}) {
  const system = `You help students who are stuck on code. Rules:
- NEVER provide a complete solution or replace their whole assignment.
- Give: (1) a short hint about what to check or try, (2) the main concept name (e.g. "array indexing", "async/await"), (3) at most ONE short line of example code OR pseudocode — not their full answer.
- If the snippet is empty, encourage them to start from the instructions and suggest a first step.
- Respond in JSON with keys: hint (string), concept (string), oneLineTry (string, can be empty if not needed).`;

  const ctx = [
    lessonTitle && `Lesson: ${lessonTitle}`,
    exerciseTitle && `Exercise: ${exerciseTitle}`,
    exerciseInstructions && `Exercise instructions:\n${truncate(exerciseInstructions, 6000)}`,
    assignmentTitle && `Assignment: ${assignmentTitle}`,
    assignmentInstructions && `Assignment instructions:\n${truncate(assignmentInstructions, 6000)}`,
    lessonContent && `Lesson excerpt:\n${truncate(lessonContent, 4000)}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const user = `${ctx}\n\nLanguage: ${language || 'javascript'}\n\nStudent code:\n\`\`\`\n${truncate(code, 12000)}\n\`\`\``;

  const raw = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { responseFormatJson: true, temperature: 0.4, maxTokens: 800 }
  );
  try {
    const parsed = JSON.parse(raw);
    return {
      hint: String(parsed.hint || ''),
      concept: String(parsed.concept || ''),
      oneLineTry: String(parsed.oneLineTry || ''),
    };
  } catch {
    return { hint: raw, concept: '', oneLineTry: '' };
  }
}

/** Generate practice drills from lesson objectives + content */
export async function generateDrills({ lesson }) {
  const system = `You create short practice drills for students based ONLY on the lesson content and objectives below.
Return a JSON object with key "drills" whose value is an array of 4 to 6 objects. Each object must have:
- "id" (string, unique slug like "d1")
- "type": one of "short_answer" | "trace_output" | "mini_refactor"
- "question" (string)
- "rubric" (string, what a good answer should include — for grading)
- "answerKey" (string, the ideal answer for instructor/checker — students may not see this in UI if you prefer; still include for automated check)

Do not include content outside the lesson's scope.`;

  const user = `Title: ${lesson.title}\n\nObjectives:\n${lesson.objectives?.trim() || '(infer from content)'}\n\nLesson markdown:\n${truncate(lesson.content || '', 12000)}`;

  const raw = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { responseFormatJson: true, temperature: 0.55, maxTokens: 2500 }
  );
  const parsed = JSON.parse(raw);
  const drills = Array.isArray(parsed.drills) ? parsed.drills : [];
  return drills.map((d, i) => ({
    id: d.id || `drill-${i}`,
    type: d.type || 'short_answer',
    question: String(d.question || ''),
    rubric: String(d.rubric || ''),
    answerKey: String(d.answerKey || ''),
  }));
}

/** Rubric-style feedback on a student answer */
export async function checkDrillAnswer({ drill, userAnswer }) {
  const system = `You are a fair grader. Compare the student's answer to the question, rubric, and answer key.
Return JSON: { "score": number 0-100, "feedback": string (2-4 sentences), "strengths": string[], "improvements": string[] }
Be encouraging; partial credit is OK.`;

  const user = `Question:\n${drill.question}\n\nRubric:\n${drill.rubric}\n\nAnswer key (reference):\n${drill.answerKey}\n\nStudent answer:\n${userAnswer}`;

  const raw = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { responseFormatJson: true, temperature: 0.35, maxTokens: 900 }
  );
  const p = JSON.parse(raw);
  return {
    score: Math.min(100, Math.max(0, Number(p.score) || 0)),
    feedback: String(p.feedback || ''),
    strengths: Array.isArray(p.strengths) ? p.strengths.map(String) : [],
    improvements: Array.isArray(p.improvements) ? p.improvements.map(String) : [],
  };
}

/** Cluster Q&A themes for teachers */
export async function clusterConfusion({ questions }) {
  const lines = questions.map((q, i) => `Q${i + 1} (id ${q._id}): ${q.title}\n${truncate(q.body, 500)}`).join('\n---\n');
  const system = `You analyze student questions from one lesson. Identify 3-6 clusters of confusion (themes).
Return JSON: { "clusters": [ { "label": string, "summary": string, "questionIds": string[] (Mongo ObjectId strings from the input), "severity": "low"|"medium"|"high" } ] }
Only use question ids that appear in the input. If few questions, return fewer clusters.`;

  const user = `Questions:\n${lines || '(none)'}`;

  const raw = await chat(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { responseFormatJson: true, temperature: 0.3, maxTokens: 2000 }
  );
  const p = JSON.parse(raw);
  const clusters = Array.isArray(p.clusters) ? p.clusters : [];
  return clusters.map((c) => ({
    label: String(c.label || ''),
    summary: String(c.summary || ''),
    questionIds: Array.isArray(c.questionIds) ? c.questionIds.map(String) : [],
    severity: ['low', 'medium', 'high'].includes(c.severity) ? c.severity : 'medium',
  }));
}

/**
 * Generate a full quiz (MCQ + T/F + short) from lesson content.
 * Returns { title, description, questions[] } matching the Quiz model shape.
 */
export async function generateQuiz({ lesson, questionCount = 8 }) {
  const system = `You are an expert quiz maker. Given a lesson, generate a quiz with exactly ${questionCount} questions.
Mix types: roughly half multiple-choice (mcq), one or two true/false (true_false), and the rest short-answer (short).
Return a JSON object with:
{
  "title": string,
  "description": string (one sentence),
  "questions": [
    {
      "text": string,
      "type": "mcq" | "true_false" | "short",
      "options": string[] (4 items for mcq, ["True","False"] for true_false, [] for short),
      "correctAnswer": string (exact option text for mcq/tf; ideal answer for short),
      "explanation": string (1-2 sentences why the answer is correct),
      "points": number (1 or 2)
    }
  ]
}
Rules:
- Only use content explicitly covered in the lesson — no outside knowledge.
- MCQ distractors must be plausible but clearly wrong.
- Short-answer correctAnswer should be a concise expected answer (1-10 words) for case-insensitive matching.
- Explanations help students learn; keep them clear and brief.`;

  const user = `Lesson title: ${lesson.title}
Objectives: ${lesson.objectives?.trim() || '(infer from content)'}
Lesson content:
${truncate(lesson.content || '', 13000)}`;

  const raw = await chat(
    [{ role: 'system', content: system }, { role: 'user', content: user }],
    { responseFormatJson: true, temperature: 0.5, maxTokens: 4000 }
  );
  const p = JSON.parse(raw);
  return {
    title: String(p.title || `${lesson.title} Quiz`),
    description: String(p.description || ''),
    questions: Array.isArray(p.questions)
      ? p.questions.map((q) => ({
          text: String(q.text || ''),
          type: ['mcq', 'true_false', 'short'].includes(q.type) ? q.type : 'mcq',
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          correctAnswer: String(q.correctAnswer || ''),
          explanation: String(q.explanation || ''),
          points: Number(q.points) || 1,
        }))
      : [],
  };
}

/**
 * AI-assisted grading: suggest a grade + feedback for a submission.
 * Returns { suggestedGrade: number, feedback: string, strengths: string[], improvements: string[] }
 */
export async function gradeSubmissionAI({ assignmentTitle, assignmentInstructions, submissionContent, githubLink }) {
  const system = `You are a helpful grading assistant. Evaluate the student's submission against the assignment instructions.
Return JSON:
{
  "suggestedGrade": number (0-100),
  "feedback": string (2-4 sentences of constructive feedback for the student),
  "strengths": string[] (2-3 bullet points of what was done well),
  "improvements": string[] (1-3 bullet points of what could be better)
}
Be fair and encouraging. Award partial credit generously. If the submission is empty or clearly off-topic, give a low score but still explain why.`;

  const content = [
    `Assignment: ${assignmentTitle}`,
    assignmentInstructions && `Instructions:\n${truncate(assignmentInstructions, 5000)}`,
    submissionContent && `Student submission:\n\`\`\`\n${truncate(submissionContent, 8000)}\n\`\`\``,
    githubLink && `GitHub link: ${githubLink}`,
  ].filter(Boolean).join('\n\n');

  const raw = await chat(
    [{ role: 'system', content: system }, { role: 'user', content: content }],
    { responseFormatJson: true, temperature: 0.4, maxTokens: 1200 }
  );
  const p = JSON.parse(raw);
  return {
    suggestedGrade: Math.min(100, Math.max(0, Number(p.suggestedGrade) || 0)),
    feedback: String(p.feedback || ''),
    strengths: Array.isArray(p.strengths) ? p.strengths.map(String) : [],
    improvements: Array.isArray(p.improvements) ? p.improvements.map(String) : [],
  };
}

/** Teacher lesson polish */
export async function polishLesson({ lesson, mode }) {
  const base = `Lesson title: ${lesson.title}\nWeek: ${lesson.weekNumber}\nObjectives:\n${lesson.objectives?.trim() || '(none)'}\n\nContent:\n${truncate(lesson.content || '', 14000)}`;

  if (mode === 'expand') {
    const system = `You expand lesson notes into fuller markdown for students: clear headings, bullet lists, short examples. Keep the same topic; add structure and explanations. Return JSON: { "markdown": string }`;
    const raw = await chat(
      [{ role: 'system', content: system }, { role: 'user', content: base }],
      { responseFormatJson: true, temperature: 0.5, maxTokens: 6000 }
    );
    const p = JSON.parse(raw);
    return { markdown: String(p.markdown || '') };
  }

  if (mode === 'exercises') {
    const system = `Suggest 3-5 exercises (coding or written) matching this lesson. Return JSON: { "exercises": [ { "title": string, "instructions": string, "language": string|null, "starterCode": string } ] }`;
    const raw = await chat(
      [{ role: 'system', content: system }, { role: 'user', content: base }],
      { responseFormatJson: true, temperature: 0.55, maxTokens: 3000 }
    );
    const p = JSON.parse(raw);
    return { exercises: Array.isArray(p.exercises) ? p.exercises : [] };
  }

  if (mode === 'misconceptions') {
    const system = `List common misconceptions students might have about this lesson. Return JSON: { "misconceptions": [ { "title": string, "explanation": string, "howToAddress": string } ] }`;
    const raw = await chat(
      [{ role: 'system', content: system }, { role: 'user', content: base }],
      { responseFormatJson: true, temperature: 0.45, maxTokens: 2500 }
    );
    const p = JSON.parse(raw);
    return { misconceptions: Array.isArray(p.misconceptions) ? p.misconceptions : [] };
  }

  const err = new Error('Invalid polish mode');
  err.status = 400;
  throw err;
}
