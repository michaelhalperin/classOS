import express from "express";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Judge0 Community Edition (free, no API key required)
const JUDGE0_BASE = "https://ce.judge0.com";

const LANGUAGE_IDS = {
  javascript: 63, // Node.js
  python: 71, // Python 3
  java: 62, // Java
  cpp: 54, // C++ (GCC)
  c: 50, // C (GCC)
  typescript: 74, // TypeScript
  go: 60, // Go
  rust: 73, // Rust
};

// POST /code/run
router.post("/run", requireAuth, async (req, res) => {
  try {
    const { code, language = "javascript", stdin = "" } = req.body;
    if (!code) return res.status(400).json({ message: "code is required" });

    const lang = language.toLowerCase();
    const languageId = LANGUAGE_IDS[lang];
    if (!languageId) {
      return res
        .status(400)
        .json({ message: `Unsupported language: ${language}` });
    }

    // ── Step 1: submit ────────────────────────────────────────────────────
    const submitRes = await fetch(
      `${JUDGE0_BASE}/submissions?base64_encoded=false`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin,
        }),
      },
    );

    if (!submitRes.ok) {
      const text = await submitRes.text();
      return res
        .status(502)
        .json({
          message: `Judge0 submit failed: ${submitRes.status}`,
          detail: text,
        });
    }

    const { token } = await submitRes.json();
    if (!token)
      return res.status(502).json({ message: "No token returned from Judge0" });

    // ── Step 2: poll until done (max ~10s) ───────────────────────────────
    let result;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const pollRes = await fetch(
        `${JUDGE0_BASE}/submissions/${token}?base64_encoded=false`,
        { headers: { "Content-Type": "application/json" } },
      );
      if (!pollRes.ok) continue;
      result = await pollRes.json();
      // Status IDs 1 = In Queue, 2 = Processing — keep polling
      if (result.status?.id > 2) break;
    }

    if (!result)
      return res.status(504).json({ message: "Code execution timed out" });

    res.json({
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      compile_output: result.compile_output || "",
      status: result.status?.description || "Unknown",
      time: result.time,
      memory: result.memory,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
