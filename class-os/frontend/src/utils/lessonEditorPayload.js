/** Turn an AI misconception object into markdown to append to the lesson. */
export function formatMisconceptionForLesson(m) {
  const title = String(m?.title || "").trim() || "Misconception";
  const expl = String(m?.explanation || "").trim();
  const addr = String(m?.howToAddress || "").trim();
  let block = `#### ${title}\n\n${expl}`;
  if (addr) block += `\n\n*How to address:* ${addr}`;
  return block;
}

/** RHF lesson form values → API create/update body. */
export function lessonFormToPayload(v) {
  return {
    title: v.title,
    content: v.content ?? "",
    objectives: v.objectives ?? "",
    misconceptionWarnings: v.misconceptionWarnings ?? "",
    weekNumber: v.weekNumber,
    orderIndex: v.orderIndex,
  };
}
