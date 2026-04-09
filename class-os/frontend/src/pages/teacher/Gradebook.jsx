import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useClass } from '../../context/ClassContext.jsx';
import { getAssignments } from '../../api/assignments.js';
import { getSubmissions, gradeSubmission } from '../../api/submissions.js';
import { getStudents } from '../../api/students.js';

const spring = { type: 'spring', stiffness: 100, damping: 20 };

export default function Gradebook() {
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();
  const qc = useQueryClient();

  const [gradeModal, setGradeModal] = useState(null); // { sub, assignment }
  const [filterStudent, setFilterStudent] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'avg' | 'missing'

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', activeClassId],
    queryFn: () => getStudents(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['assignments', activeClassId],
    queryFn: () => getAssignments(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['submissions', activeClassId],
    queryFn: () => getSubmissions(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const isLoading = studentsLoading || assignmentsLoading || subsLoading;

  // Build lookup: studentId__assignmentId → submission
  const subMap = {};
  submissions.forEach((s) => {
    const key = `${s.studentId?._id || s.studentId}__${s.assignmentId?._id || s.assignmentId}`;
    subMap[key] = s;
  });

  function getSub(studentId, assignmentId) {
    return subMap[`${studentId}__${assignmentId}`];
  }

  function getStatus(studentId, assignmentId) {
    const s = getSub(studentId, assignmentId);
    if (!s?.submittedAt) return 'missing';
    if (s.grade != null) return 'graded';
    return 'submitted';
  }

  // Per-student averages
  function studentAvg(studentId) {
    const graded = assignments
      .map((a) => getSub(studentId, a._id))
      .filter((s) => s?.grade != null);
    if (graded.length === 0) return null;
    return Math.round(graded.reduce((sum, s) => sum + s.grade, 0) / graded.length);
  }

  function missingCount(studentId) {
    return assignments.filter((a) => getStatus(studentId, a._id) === 'missing').length;
  }

  // Filtered + sorted students
  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(filterStudent.toLowerCase()) ||
    s.email.toLowerCase().includes(filterStudent.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'avg') {
      const avgA = studentAvg(a._id) ?? -1;
      const avgB = studentAvg(b._id) ?? -1;
      return avgB - avgA;
    }
    if (sortBy === 'missing') {
      return missingCount(b._id) - missingCount(a._id);
    }
    return a.name.localeCompare(b.name);
  });

  // Class-wide stats
  const allGrades = submissions.filter((s) => s.grade != null).map((s) => s.grade);
  const classAvg = allGrades.length > 0
    ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
    : null;
  const pendingGrades = submissions.filter((s) => s.submittedAt && s.grade == null).length;
  const totalMissing = students.reduce((sum, st) => sum + missingCount(st._id), 0);

  const sortedAssignments = [...assignments].sort(
    (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)
  );

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout fullWidth>
        <div className="card mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-gray-700">Create a class first to use the gradebook.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout fullWidth>
      <div className="space-y-6 pb-24 sm:space-y-7 sm:pb-28 md:pb-32">
        <header className="flex flex-col gap-2 border-b border-gray-100 pb-5 md:flex-row md:items-end md:justify-between md:pb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Gradebook</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Cross-tab of students and assignments — click a cell to grade submitted work.
            </p>
          </div>
          {activeClassId ? (
            <p className="shrink-0 tabular-nums text-sm font-medium text-gray-500">
              {students.length} {students.length === 1 ? 'student' : 'students'}
              <span className="mx-1.5 text-gray-300">·</span>
              {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
            </p>
          ) : null}
        </header>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">
          {/* ── Summary stats ─────────────────────────────────────── */}
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            <SummaryCard label="Class Average" value={classAvg != null ? `${classAvg}%` : '—'} color="brand" />
            <SummaryCard label="Pending Grades" value={pendingGrades} color={pendingGrades > 0 ? 'yellow' : 'green'} />
            <SummaryCard label="Total Missing" value={totalMissing} color={totalMissing > 0 ? 'red' : 'green'} />
            <SummaryCard label="Total Submissions" value={submissions.length} color="purple" />
          </motion.div>

          {/* ── Filter + sort bar ──────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search student…"
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="input max-w-xs"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              {['name', 'avg', 'missing'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === s
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'name' ? 'Name' : s === 'avg' ? 'Avg Grade' : 'Most Missing'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Grade grid ─────────────────────────────────────────── */}
          {sorted.length === 0 || sortedAssignments.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-gray-500">
                {students.length === 0
                  ? 'No students enrolled yet.'
                  : assignments.length === 0
                  ? 'No assignments created yet.'
                  : 'No students match that search.'}
              </p>
            </div>
          ) : (
            <motion.div
              initial={shouldReduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.15 }}
              className="card overflow-x-auto p-0"
            >
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left font-medium text-gray-500 px-5 py-3 sticky left-0 bg-white min-w-[180px]">
                      Student
                    </th>
                    <th className="text-center font-medium text-gray-500 px-3 py-3 bg-gray-50 border-l border-gray-100">
                      Avg
                    </th>
                    {sortedAssignments.map((a) => (
                      <th
                        key={a._id}
                        className="px-2 py-3 font-medium text-gray-500 text-center min-w-[80px] max-w-[100px]"
                      >
                        <span className="block truncate text-xs" title={a.title}>{a.title}</span>
                        {a.dueDate && (
                          <span className="block text-xs text-gray-300 font-normal mt-0.5">
                            {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((student) => {
                    const avg = studentAvg(student._id);
                    return (
                      <motion.tr
                        key={student._id}
                        initial={shouldReduce ? false : { opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={spring}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-3 sticky left-0 bg-white hover:bg-gray-50">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0">
                              {student.name?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate">{student.name}</p>
                              <p className="text-xs text-gray-400 truncate">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center bg-gray-50/60 border-l border-gray-100">
                          {avg != null ? (
                            <span className={`font-bold text-sm ${
                              avg >= 90 ? 'text-green-600' :
                              avg >= 80 ? 'text-blue-600' :
                              avg >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {avg}%
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {sortedAssignments.map((a) => {
                          const sub = getSub(student._id, a._id);
                          const status = getStatus(student._id, a._id);
                          return (
                            <td key={a._id} className="py-3 px-2 text-center">
                              <GradeCell
                                sub={sub}
                                status={status}
                                onClick={() =>
                                  sub?.submittedAt
                                    ? setGradeModal({ sub, assignment: a, studentName: student.name })
                                    : undefined
                                }
                              />
                            </td>
                          );
                        })}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Legend */}
              <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
                <LegendItem color="bg-green-100 border-green-200" label="Graded" />
                <LegendItem color="bg-yellow-100 border-yellow-200" label="Submitted (click to grade)" />
                <LegendItem color="bg-red-50 border-red-100" label="Missing" />
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Grade modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {gradeModal && (
          <GradeModal
            sub={gradeModal.sub}
            assignment={gradeModal.assignment}
            studentName={gradeModal.studentName}
            onClose={() => setGradeModal(null)}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ['submissions'] });
              setGradeModal(null);
            }}
          />
        )}
      </AnimatePresence>
      </div>
    </PageLayout>
  );
}

// ── Grade cell ────────────────────────────────────────────────────────────────
function GradeCell({ sub, status, onClick }) {
  const base = 'inline-flex items-center justify-center w-10 h-8 rounded-lg border text-xs font-semibold cursor-default transition-colors';
  if (status === 'graded') {
    return (
      <button
        onClick={onClick}
        title={`Grade: ${sub.grade}/100 — click to edit`}
        className={`${base} bg-green-100 text-green-700 border-green-200 hover:bg-green-200 cursor-pointer`}
      >
        {sub.grade}
      </button>
    );
  }
  if (status === 'submitted') {
    return (
      <button
        onClick={onClick}
        title="Submitted — click to grade"
        className={`${base} bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 cursor-pointer`}
      >
        ⏳
      </button>
    );
  }
  return (
    <span title="Not submitted" className={`${base} bg-red-50 text-red-300 border-red-100`}>
      —
    </span>
  );
}

// ── Grade modal ───────────────────────────────────────────────────────────────
function GradeModal({ sub, assignment, studentName, onClose, onSaved }) {
  const [grade, setGrade] = useState(sub.grade ?? '');
  const [feedback, setFeedback] = useState(sub.feedback ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      gradeSubmission(sub._id, {
        grade: grade === '' ? null : Number(grade),
        feedback: feedback.trim() || '',
      }),
    onSuccess: onSaved,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{assignment.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{studentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Submission content */}
        {sub.content && (
          <div className="px-6 py-4 border-b border-gray-50 max-h-40 overflow-auto">
            <p className="text-xs font-medium text-gray-400 mb-2">Submitted code / answer</p>
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap bg-gray-50 rounded-lg p-3 leading-relaxed">
              {sub.content}
            </pre>
          </div>
        )}
        {sub.githubLink && (
          <div className="px-6 py-2 border-b border-gray-50">
            <a
              href={sub.githubLink}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brand-600 hover:underline"
            >
              🔗 {sub.githubLink}
            </a>
          </div>
        )}

        {/* Grade + feedback form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Grade <span className="text-gray-400 font-normal">(0 – 100)</span></label>
            <input
              type="number"
              min={0}
              max={100}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="input w-32"
              placeholder="—"
            />
          </div>
          <div>
            <label className="label">Feedback <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="input resize-none"
              placeholder="Great work on…"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-600">
              {mutation.error?.response?.data?.message || 'Failed to save grade.'}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Saving…' : 'Save Grade'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    brand:  'text-brand-700',
    purple: 'text-purple-700',
    green:  'text-green-600',
    yellow: 'text-yellow-600',
    red:    'text-red-600',
  };
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-5 h-5 rounded border inline-block ${color}`} />
      {label}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 pb-12">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-24 animate-pulse p-4" />
        ))}
      </div>
      <div className="card h-48 animate-pulse p-4" />
    </div>
  );
}
