import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useClass } from '../../context/ClassContext.jsx';
import { getLessons } from '../../api/lessons.js';
import { getAssignments, createAssignment, updateAssignment, deleteAssignment } from '../../api/assignments.js';

const spring = { type: 'spring', stiffness: 100, damping: 20 };
const snappy = { type: 'spring', stiffness: 280, damping: 26 };

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: spring },
  exit:   { opacity: 0, x: -16, transition: { duration: 0.2 } },
};

export default function Assignments() {
  const qc = useQueryClient();
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['assignments', activeClassId],
    queryFn: () => getAssignments(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', activeClassId],
    queryFn: () => getLessons(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? updateAssignment(editing, data) : createAssignment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      reset();
      setEditing(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });

  const handleEdit = (a) => {
    setEditing(a._id);
    setShowForm(true);
    reset({
      lessonId: a.lessonId?._id || a.lessonId,
      title: a.title,
      instructions: a.instructions,
      dueDate: a.dueDate ? new Date(a.dueDate).toISOString().split('T')[0] : '',
    });
  };

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
    reset({ lessonId: '', title: '', instructions: '', dueDate: '' });
  };

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
        <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-center md:justify-between md:pb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Assignments</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Link homework to lessons, set due dates, then grade submissions from the Submissions page.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link to="/teacher/submissions" className="btn-secondary">View Submissions</Link>
            <button type="button" onClick={handleNew} className="btn-primary">+ New Assignment</button>
          </div>
        </header>

      {/* Form — slides in/out */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="assignment-form"
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={snappy}
            className="overflow-hidden mb-6"
          >
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Assignment' : 'New Assignment'}</h2>
              <form onSubmit={handleSubmit(saveMutation.mutate)} className="space-y-4">
                <div>
                  <label className="label">Linked Lesson</label>
                  <select {...register('lessonId', { required: 'Lesson is required' })} className="input">
                    <option value="">Select a lesson…</option>
                    {[...lessons]
                      .sort((a, b) => a.weekNumber - b.weekNumber || a.orderIndex - b.orderIndex)
                      .map((l) => (
                        <option key={l._id} value={l._id}>
                          Week {l.weekNumber} #{l.orderIndex} — {l.title}
                        </option>
                      ))}
                  </select>
                  {errors.lessonId && <p className="mt-1 text-xs text-red-600">{errors.lessonId.message}</p>}
                </div>
                <div>
                  <label className="label">Title</label>
                  <input {...register('title', { required: 'Title is required' })} className="input" placeholder="e.g. Build a REST API" />
                  {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="label">Instructions</label>
                  <textarea
                    {...register('instructions', { required: 'Instructions are required' })}
                    rows={5}
                    className="input resize-y"
                    placeholder="Describe what students need to do..."
                  />
                  {errors.instructions && <p className="mt-1 text-xs text-red-600">{errors.instructions.message}</p>}
                </div>
                <div>
                  <label className="label">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input {...register('dueDate')} type="date" className="input" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Create Assignment'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setShowForm(false); setEditing(null); reset(); }}
                  >
                    Cancel
                  </button>
                </div>
                {saveMutation.isError && (
                  <p className="text-sm text-red-600">{saveMutation.error?.response?.data?.message}</p>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : assignments.length === 0 && !showForm ? (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">No assignments yet. Create one to get started!</p>
        </motion.div>
      ) : (
        <motion.div
          variants={shouldReduce ? undefined : listVariants}
          initial={shouldReduce ? false : 'hidden'}
          animate="visible"
          className="space-y-3"
        >
          <AnimatePresence>
            {assignments.map((a) => {
              const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
              return (
                <motion.div
                  key={a._id}
                  variants={shouldReduce ? undefined : itemVariants}
                  exit={shouldReduce ? { opacity: 0 } : itemVariants.exit}
                  layout
                  whileHover={shouldReduce ? undefined : { y: -1, transition: snappy }}
                  className="card flex items-start justify-between gap-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      {a.lessonId && (
                        <span className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">
                          {a.lessonId.title}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Past due</span>
                      )}
                    </div>
                    {a.dueDate && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Due {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.instructions}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEdit(a)} className="btn-secondary text-sm py-1.5">Edit</button>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this assignment and all its submissions?')) {
                          deleteMutation.mutate(a._id);
                        }
                      }}
                      className="btn-danger text-sm py-1.5"
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
      </div>
    </PageLayout>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 pb-12">
      {[1, 2].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="mb-2 h-5 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
