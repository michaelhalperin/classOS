import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Editor from '@monaco-editor/react';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useClass } from '../../context/ClassContext.jsx';
import { getStudent, updateStudent } from '../../api/students.js';
import { removeStudentFromClass } from '../../api/classes.js';
import { getSubmissions, gradeSubmission } from '../../api/submissions.js';
import { getAssignments } from '../../api/assignments.js';
import { getLessons } from '../../api/lessons.js';
import { getQuestions } from '../../api/qna.js';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { activeClassId } = useClass();
  const [activeTab, setActiveTab] = useState('overview'); // overview | submissions | activity
  const [editing, setEditing] = useState(false);

  const { data: student,     isLoading: loadingStudent }  = useQuery({ queryKey: ['student', id],    queryFn: () => getStudent(id) });
  const { data: allSubs = [], isLoading: loadingSubs }    = useQuery({
    queryKey: ['submissions', activeClassId],
    queryFn: () => getSubmissions(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: assignments = [] }                        = useQuery({
    queryKey: ['assignments', activeClassId],
    queryFn: () => getAssignments(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: lessons = [] }                            = useQuery({
    queryKey: ['lessons', activeClassId],
    queryFn: () => getLessons(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const updateMutation = useMutation({
    mutationFn: (data) => updateStudent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', id] });
      qc.invalidateQueries({ queryKey: ['students', activeClassId] });
      setEditing(false);
    },
  });

  const removeFromClassMutation = useMutation({
    mutationFn: () => removeStudentFromClass(activeClassId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', activeClassId] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      navigate('/teacher/students');
    },
  });

  // This student's submissions only
  const mySubs = allSubs.filter((s) =>
    String(s.studentId?._id || s.studentId) === String(id)
  );

  const graded    = mySubs.filter((s) => s.grade != null);
  const ungraded  = mySubs.filter((s) => s.grade == null);
  const avgGrade  = graded.length
    ? Math.round(graded.reduce((acc, s) => acc + s.grade, 0) / graded.length)
    : null;

  // Lessons completed (stored client-side; teacher can see submission coverage instead)
  // Assignment completion map
  const subByAssignment = Object.fromEntries(
    mySubs.map((s) => [String(s.assignmentId?._id || s.assignmentId), s])
  );

  if (loadingStudent) return <PageLayout><LoadingSkeleton /></PageLayout>;
  if (!student) return (
    <PageLayout>
      <div className="text-center py-20">
        <p className="text-gray-500">Student not found.</p>
        <Link to="/teacher/students" className="btn-primary mt-4 inline-flex">Back to Students</Link>
      </div>
    </PageLayout>
  );

  const tabs = ['overview', 'submissions', 'activity'];

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/teacher/students" className="hover:text-brand-600 transition-colors">Students</Link>
          <span>›</span>
          <span className="text-gray-800 font-medium">{student.name}</span>
        </div>

        {/* ── Profile header ─────────────────────────────── */}
        <div className="card mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold shrink-0">
                {student.name[0].toUpperCase()}
              </div>
              <div>
                {editing ? (
                  <form onSubmit={handleSubmit(updateMutation.mutate)} className="space-y-2">
                    <input
                      {...register('name', { required: 'Name required' })}
                      defaultValue={student.name}
                      className="input text-lg font-semibold"
                      placeholder="Full name"
                    />
                    <input
                      {...register('email', { required: 'Email required' })}
                      defaultValue={student.email}
                      type="email"
                      className="input text-sm"
                      placeholder="Email"
                    />
                    <div className="flex gap-2 pt-1">
                      <button type="submit" className="btn-primary text-sm py-1.5" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn-secondary text-sm py-1.5" onClick={() => setEditing(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
                    <p className="text-gray-500">{student.email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Joined {new Date(student.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </>
                )}
              </div>
            </div>

            {!editing && (
              <div className="flex gap-2">
                <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${student.name} from this class? They will keep their account.`
                      )
                    ) {
                      removeFromClassMutation.mutate();
                    }
                  }}
                  disabled={removeFromClassMutation.isPending || !activeClassId}
                  className="btn-secondary text-sm"
                >
                  {removeFromClassMutation.isPending ? 'Removing…' : 'Remove from class'}
                </button>
              </div>
            )}
          </div>

          {/* Stat pills */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat label="Submissions" value={mySubs.length} total={assignments.length} color="brand" />
            <MiniStat label="Graded"      value={graded.length}   total={mySubs.length}    color="green" />
            <MiniStat label="Pending"     value={ungraded.length} total={mySubs.length}    color="yellow" />
            <MiniStat label="Avg Grade"   value={avgGrade != null ? `${avgGrade}%` : '—'} color={avgGrade >= 70 ? 'green' : avgGrade != null ? 'red' : 'gray'} />
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────── */}
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
              {tab === 'submissions' && mySubs.length > 0 && (
                <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {mySubs.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {activeTab === 'overview'     && <OverviewTab     assignments={assignments} subByAssignment={subByAssignment} lessons={lessons} />}
            {activeTab === 'submissions'  && <SubmissionsTab  subs={mySubs} studentId={id} activeClassId={activeClassId} />}
            {activeTab === 'activity'     && <ActivityTab     subs={mySubs} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageLayout>
  );
}

// ─── Overview: assignment grid ─────────────────────────────────────────────
function OverviewTab({ assignments, subByAssignment, lessons }) {
  if (assignments.length === 0) {
    return <p className="text-gray-400 text-center py-10">No assignments created yet.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto">
        <h2 className="font-semibold text-gray-800 mb-4">Assignment Progress</h2>
        <div className="space-y-2">
          {assignments.map((a) => {
            const sub    = subByAssignment[String(a._id)];
            const status = !sub ? 'missing' : sub.grade != null ? 'graded' : 'submitted';
            const colors = {
              graded:    'bg-green-100 text-green-700 border-green-200',
              submitted: 'bg-yellow-100 text-yellow-700 border-yellow-200',
              missing:   'bg-red-50 text-red-400 border-red-100',
            };
            const labels = { graded: `${sub?.grade}/100`, submitted: 'Submitted', missing: 'Not submitted' };

            return (
              <div key={a._id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                  {a.lessonId?.title && (
                    <p className="text-xs text-gray-400 truncate">{a.lessonId.title}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full border ${colors[status]}`}>
                  {labels[status]}
                </span>
                {sub?.feedback && (
                  <span className="text-xs text-gray-400 italic truncate max-w-[160px] hidden sm:block">
                    "{sub.feedback}"
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Submissions: collapsible list ─────────────────────────────────────────
function SubmissionsTab({ subs, studentId, activeClassId }) {
  const qc = useQueryClient();

  if (subs.length === 0) {
    return <p className="text-gray-400 text-center py-10">No submissions yet.</p>;
  }

  return (
    <div className="space-y-3">
      {subs.map((sub) => (
        <SubCard
          key={sub._id}
          sub={sub}
          activeClassId={activeClassId}
          onGraded={() => qc.invalidateQueries({ queryKey: ['submissions', activeClassId] })}
        />
      ))}
    </div>
  );
}

function SubCard({ sub, onGraded, activeClassId }) {
  const [expanded, setExpanded] = useState(false);
  const [grading,  setGrading]  = useState(false);
  const qc = useQueryClient();

  const { register, handleSubmit } = useForm({
    defaultValues: { grade: sub.grade ?? '', feedback: sub.feedback ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (data) => gradeSubmission(sub._id, { grade: Number(data.grade), feedback: data.feedback }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions', activeClassId] });
      setGrading(false);
      onGraded();
    },
  });

  const hasGrade = sub.grade != null;

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {sub.assignmentId?.title || 'Assignment'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasGrade ? (
            <span className={`font-bold ${sub.grade >= 70 ? 'text-green-600' : 'text-red-500'}`}>
              {sub.grade}<span className="text-xs font-normal text-gray-400">/100</span>
            </span>
          ) : (
            <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">Ungraded</span>
          )}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="text-gray-400 text-sm"
          >▼</motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
              {sub.content && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Submitted code</p>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <Editor
                      height="200px"
                      value={sub.content}
                      theme="vs-dark"
                      options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', automaticLayout: true, padding: { top: 10, bottom: 10 } }}
                    />
                  </div>
                </div>
              )}
              {sub.githubLink && (
                <a href={sub.githubLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                  className="text-sm text-brand-600 hover:underline flex items-center gap-1.5">
                  🔗 {sub.githubLink}
                </a>
              )}
              {sub.feedback && !grading && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Feedback</p>
                  <p className="text-sm text-gray-700 italic bg-brand-50 rounded-lg p-3 border border-brand-100">{sub.feedback}</p>
                </div>
              )}
              {!grading && (
                <button onClick={() => setGrading(true)} className={hasGrade ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
                  {hasGrade ? 'Edit Grade' : 'Grade'}
                </button>
              )}
              <AnimatePresence>
                {grading && (
                  <motion.form
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    onSubmit={handleSubmit(mutation.mutate)}
                    className="space-y-3 pt-2 border-t border-gray-100"
                  >
                    <div className="w-36">
                      <label className="label">Grade (0–100)</label>
                      <input {...register('grade', { required: true, min: 0, max: 100 })} type="number" min="0" max="100" className="input" />
                    </div>
                    <div>
                      <label className="label">Feedback</label>
                      <textarea {...register('feedback')} rows={3} className="input resize-none" placeholder="Great work! One thing to improve..." />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary text-sm" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Saving…' : 'Save Grade'}
                      </button>
                      <button type="button" className="btn-secondary text-sm" onClick={() => setGrading(false)}>Cancel</button>
                    </div>
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

// ─── Activity: timeline of submissions ─────────────────────────────────────
function ActivityTab({ subs }) {
  const sorted = [...subs].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  if (sorted.length === 0) {
    return <p className="text-gray-400 text-center py-10">No activity yet.</p>;
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-800 mb-4">Submission Timeline</h2>
      <div className="relative">
        <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-200" />
        <div className="space-y-5">
          {sorted.map((sub) => (
            <div key={sub._id} className="flex gap-4 relative">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 ${
                sub.grade != null
                  ? sub.grade >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {sub.grade != null ? sub.grade : '?'}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className="font-medium text-sm text-gray-900">
                  {sub.assignmentId?.title || 'Assignment submitted'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(sub.submittedAt).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </p>
                {sub.feedback && (
                  <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">"{sub.feedback}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────
function MiniStat({ label, value, total, color }) {
  const colors = {
    brand:  'text-brand-600  bg-brand-50',
    green:  'text-green-700  bg-green-50',
    yellow: 'text-yellow-700 bg-yellow-50',
    red:    'text-red-600    bg-red-50',
    gray:   'text-gray-600   bg-gray-100',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color] || colors.gray}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-xl font-bold mt-0.5">
        {value}
        {total != null && <span className="text-xs font-normal opacity-60"> /{total}</span>}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-32 mb-6" />
      <div className="card flex gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
      <div className="card h-48 bg-gray-100" />
    </div>
  );
}
