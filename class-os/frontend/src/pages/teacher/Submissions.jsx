import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import Editor from '@monaco-editor/react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useClass } from '../../context/ClassContext.jsx';
import { getSubmissions, gradeSubmission } from '../../api/submissions.js';
import { aiGradeSubmission } from '../../api/ai.js';

const spring = { type: 'spring', stiffness: 100, damping: 20 };

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export default function Submissions() {
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['submissions', activeClassId],
    queryFn: () => getSubmissions(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const [filter, setFilter] = useState('all');

  const filtered = submissions.filter((s) => {
    if (filter === 'ungraded') return s.grade == null;
    if (filter === 'graded')   return s.grade != null;
    return true;
  });

  const ungradedCount = submissions.filter((s) => s.grade == null).length;

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 py-16 text-center">
          <p className="mb-4 text-gray-700">Create a class first.</p>
          <Link to="/teacher/classes" className="btn-primary">Go to Classes</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout fullWidth>
      <div className="space-y-6 pb-24 sm:space-y-7 sm:pb-28 md:pb-32">
        <header className="border-b border-gray-100 pb-5 md:pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Student Submissions</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Open a row to read code, use AI draft feedback, and save grades. Use filters to focus on ungraded work.
          </p>
        </header>

      {/* Filter tabs */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.05 }}
        className="flex flex-wrap gap-2"
      >
        {['all', 'ungraded', 'graded'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f}
            {f === 'ungraded' && ungradedCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {ungradedCount}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20 text-gray-400"
        >
          <p className="text-4xl mb-3">📬</p>
          <p>No {filter === 'all' ? '' : filter} submissions yet.</p>
        </motion.div>
      ) : (
        <motion.div
          key={filter}
          variants={shouldReduce ? undefined : listVariants}
          initial={shouldReduce ? false : 'hidden'}
          animate="visible"
          className="space-y-3"
        >
          {filtered.map((sub) => (
            <motion.div key={sub._id} variants={shouldReduce ? undefined : rowVariants}>
              <SubmissionRow submission={sub} />
            </motion.div>
          ))}
        </motion.div>
      )}
      </div>
    </PageLayout>
  );
}

function SubmissionRow({ submission }) {
  const qc = useQueryClient();
  const { activeClassId } = useClass();
  const [expanded, setExpanded] = useState(false);
  const [grading, setGrading]   = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      grade:    submission.grade ?? '',
      feedback: submission.feedback ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data) =>
      gradeSubmission(submission._id, {
        grade:    Number(data.grade),
        feedback: data.feedback,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions', activeClassId] });
      setGrading(false);
      setAiResult(null);
    },
  });

  const handleAiDraft = async () => {
    setAiError('');
    setAiLoading(true);
    try {
      const result = await aiGradeSubmission(submission._id);
      setAiResult(result);
      setValue('grade', result.suggestedGrade);
      setValue('feedback', result.feedback);
    } catch (e) {
      setAiError(e.response?.data?.message || 'AI grading failed — check your API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const hasGrade   = submission.grade != null;
  const hasContent = submission.content || submission.githubLink || submission.feedback;

  return (
    <div className={`card overflow-hidden transition-shadow duration-200 ${expanded ? 'shadow-md' : 'hover:shadow-sm'}`}>

      {/* ── Always-visible header row ──────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left flex items-start gap-4"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0 mt-0.5">
          {submission.studentId?.name?.[0] || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-gray-900">{submission.studentId?.name}</p>
              <p className="text-xs text-gray-400">{submission.studentId?.email}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasGrade ? (
                <span className={`font-bold text-lg ${submission.grade >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                  {submission.grade}<span className="text-sm font-normal text-gray-400">/100</span>
                </span>
              ) : (
                <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">
                  Ungraded
                </span>
              )}

              {/* Chevron */}
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="text-gray-400 text-sm select-none"
              >
                ▼
              </motion.span>
            </div>
          </div>

          {/* Assignment + date tags */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
              {submission.assignmentId?.title}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </button>

      {/* ── Collapsible body ────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 pl-14">

              {/* Submitted code */}
              {submission.content && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Submitted code</p>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <Editor
                      height="220px"
                      value={submission.content}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        automaticLayout: true,
                        padding: { top: 10, bottom: 10 },
                      }}
                    />
                  </div>
                </div>
              )}

              {/* GitHub link */}
              {submission.githubLink && (
                <a
                  href={submission.githubLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
                >
                  🔗 {submission.githubLink}
                </a>
              )}

              {/* Existing feedback (when not actively editing) */}
              {submission.feedback && !grading && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Your feedback</p>
                  <p className="text-sm text-gray-700 bg-brand-50 rounded-lg p-3 border border-brand-100 italic">
                    {submission.feedback}
                  </p>
                </div>
              )}

              {/* Grade / Edit grade button */}
              {!grading && (
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <button
                    onClick={() => { setGrading(true); setAiResult(null); }}
                    className={hasGrade ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
                  >
                    {hasGrade ? 'Edit Grade' : 'Grade Submission'}
                  </button>
                  {hasGrade && (
                    <span className={`text-sm font-semibold ${submission.grade >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                      {submission.grade}/100
                    </span>
                  )}
                </div>
              )}

              {/* Grading form */}
              <AnimatePresence>
                {grading && (
                  <motion.form
                    key="grade-form"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    onSubmit={handleSubmit(mutation.mutate)}
                    className="space-y-4 pt-3 border-t border-gray-100"
                  >
                    {/* AI draft feedback button */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={handleAiDraft}
                        disabled={aiLoading}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {aiLoading ? (
                          <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing…</>
                        ) : (
                          <><span>✨</span> AI Draft Feedback</>
                        )}
                      </button>
                      <span className="text-xs text-gray-400">Fills in a suggested grade + feedback — you can edit before saving</span>
                    </div>

                    {aiError && <p className="text-sm text-red-600">{aiError}</p>}

                    {/* AI result panel */}
                    <AnimatePresence>
                      {aiResult && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 space-y-3">
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">AI Analysis</p>
                            {aiResult.strengths?.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Strengths</p>
                                <ul className="space-y-0.5">
                                  {aiResult.strengths.map((s, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                                      <span className="text-green-500 shrink-0">✓</span>{s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {aiResult.improvements?.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-1">Could improve</p>
                                <ul className="space-y-0.5">
                                  {aiResult.improvements.map((s, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                                      <span className="text-yellow-500 shrink-0">→</span>{s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="w-40">
                      <label className="label">Grade (0–100)</label>
                      <input
                        {...register('grade', {
                          required: 'Grade is required',
                          min: { value: 0,   message: 'Min 0'   },
                          max: { value: 100, message: 'Max 100' },
                        })}
                        type="number"
                        min="0"
                        max="100"
                        className="input"
                      />
                      {errors.grade && (
                        <p className="mt-1 text-xs text-red-600">{errors.grade.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="label">Feedback</label>
                      <textarea
                        {...register('feedback')}
                        rows={3}
                        className="input resize-none"
                        placeholder="Great work! One thing to improve..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? 'Saving…' : 'Save Grade'}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => { setGrading(false); setAiResult(null); }}
                      >
                        Cancel
                      </button>
                    </div>

                    {mutation.isError && (
                      <p className="text-sm text-red-600">
                        {mutation.error?.response?.data?.message || 'Failed to save'}
                      </p>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 pb-12">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse flex gap-4">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-200 rounded w-1/5 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
