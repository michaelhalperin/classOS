import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useClass } from '../../context/ClassContext.jsx';
import { getStudents } from '../../api/students.js';
import { addStudentToClass, removeStudentFromClass } from '../../api/classes.js';
import { getAssignments } from '../../api/assignments.js';
import { getSubmissions } from '../../api/submissions.js';
import { getLessons } from '../../api/lessons.js';

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
};

export default function Students() {
  const qc = useQueryClient();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [newCreds, setNewCreds] = useState(null);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', activeClassId],
    queryFn: () => getStudents(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments', activeClassId],
    queryFn: () => getAssignments(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions', activeClassId],
    queryFn: () => getSubmissions(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', activeClassId],
    queryFn: () => getLessons(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createMutation = useMutation({
    mutationFn: (data) => addStudentToClass(activeClassId, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['students', activeClassId] });
      qc.invalidateQueries({ queryKey: ['classes'] });
      setNewCreds({ name: data.name, email: data.email });
      setShowForm(false);
      reset();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (studentId) => removeStudentFromClass(activeClassId, studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', activeClassId] });
      qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  function statsFor(studentId) {
    const sid = String(studentId);
    const studentSubs = submissions.filter((s) =>
      String(s.studentId?._id || s.studentId) === sid
    );
    const graded = studentSubs.filter((s) => s.grade != null);
    const avgGrade = graded.length
      ? Math.round(graded.reduce((acc, s) => acc + s.grade, 0) / graded.length)
      : null;
    return {
      submitted: studentSubs.length,
      total: assignments.length,
      graded: graded.length,
      avgGrade,
    };
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout title="Students">
        <div className="card text-center py-16 max-w-lg mx-auto">
          <p className="text-gray-700 mb-4">Create a class first, then enroll students in that class.</p>
          <Link to="/teacher/classes" className="btn-primary">Go to Classes</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Students in this class"
      actions={
        <button
          onClick={() => { setShowForm(true); setNewCreds(null); }}
          className="btn-primary"
          disabled={!activeClassId}
        >
          + Add to class
        </button>
      }
    >
      <p className="text-sm text-gray-500 mb-6 max-w-2xl">
        Students create their own accounts (name, password) via{' '}
        <Link to="/register" className="text-brand-600 font-medium hover:underline">Sign up</Link>.
        You only enter their <strong>email</strong> here to add someone who already has an account.{' '}
        <strong>Remove from class</strong> drops them from this roster only; their account stays active.
      </p>

      <AnimatePresence>
        {newCreds && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-start justify-between gap-4"
          >
            <div>
              <p className="font-semibold text-green-800 text-sm">Added to this class</p>
              <p className="text-sm text-green-700 mt-1">
                <strong>{newCreds.name}</strong> ({newCreds.email}) can see this class in their account.
              </p>
            </div>
            <button type="button" onClick={() => setNewCreds(null)} className="text-green-400 hover:text-green-600 text-lg leading-none">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            className="overflow-hidden mb-6 w-full"
          >
            <div className="card w-full">
              <div className="flex flex-col xl:flex-row xl:items-start gap-6 xl:gap-10">
                <div className="xl:flex-1 xl:min-w-0 xl:max-w-xl">
                  <h2 className="font-semibold text-gray-800 mb-2">Add by email</h2>
                  <p className="text-sm text-gray-500">
                    Enter the email they used when they signed up. If they don’t have an account yet, ask them to register first — you don’t set their name or password.
                  </p>
                </div>
                <form
                  onSubmit={handleSubmit((d) => createMutation.mutate({ email: d.email.trim() }))}
                  className="w-full xl:flex-1 min-w-0 flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 w-full">
                    <div className="flex-1 min-w-0 w-full">
                      <label className="label">Student email</label>
                      <input
                        {...register('email', {
                          required: 'Email is required',
                          pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
                        })}
                        type="email"
                        className="input w-full"
                        placeholder="same email as their Class OS account"
                        autoComplete="off"
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 sm:pb-0.5">
                      <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Adding…' : 'Add to class'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); reset(); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                  {createMutation.isError && (
                    <p className="text-sm text-red-600">
                      {createMutation.error?.response?.data?.message || 'Could not add to class'}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Students in class" value={students.length} color="brand" />
        <StatCard label="Lessons" value={lessons.length} color="purple" />
        <StatCard label="Assignments" value={assignments.length} color="yellow" />
        <StatCard label="Submissions" value={submissions.length} color="green" />
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
          placeholder="Search students…"
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🎓</p>
          <p className="text-gray-500">
            {search ? `No students matching "${search}"` : 'No students in this class yet.'}
          </p>
        </div>
      ) : (
        <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-3">
          {filtered.map((student) => {
            const stats = statsFor(student._id);
            return (
              <motion.div key={student._id} variants={rowVariants} layout>
                <StudentRow
                  student={student}
                  stats={stats}
                  onRemoveFromClass={() => {
                    if (window.confirm(`Remove ${student.name} from this class? They will keep their account.`)) {
                      removeMutation.mutate(student._id);
                    }
                  }}
                  removing={removeMutation.isPending}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageLayout>
  );
}

function StudentRow({ student, stats, onRemoveFromClass, removing }) {
  return (
    <div className="card flex flex-col lg:flex-row lg:items-center gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base shrink-0">
        {student.name[0].toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{student.name}</p>
        <p className="text-sm text-gray-400 truncate">{student.email}</p>
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0 flex-wrap">
        <StatChip
          label="Submitted"
          value={`${stats.submitted}/${stats.total}`}
          color={stats.submitted === stats.total && stats.total > 0 ? 'green' : 'gray'}
        />
        {stats.avgGrade != null && (
          <StatChip label="Avg grade" value={`${stats.avgGrade}%`} color={stats.avgGrade >= 70 ? 'green' : 'red'} />
        )}
        <p className="text-xs text-gray-400 whitespace-nowrap">
          Joined {new Date(student.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Link to={`/teacher/students/${student._id}`} className="btn-secondary text-sm py-1.5 px-3">
          View profile
        </Link>
        <button type="button" onClick={onRemoveFromClass} disabled={removing} className="btn-secondary text-sm py-1.5 px-3">
          Remove from class
        </button>
      </div>
    </div>
  );
}

function StatChip({ label, value, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50  text-red-600',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <div className={`text-center px-3 py-1 rounded-lg ${colors[color] || colors.gray}`}>
      <p className="text-xs font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    brand: 'text-brand-600',
    purple: 'text-purple-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
  };
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card animate-pulse flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-gray-200 rounded-lg" />
            <div className="h-8 w-20 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
