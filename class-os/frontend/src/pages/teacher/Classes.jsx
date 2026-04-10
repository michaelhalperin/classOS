import { useState } from 'react';
import { flushSync } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { useClass } from '../../context/ClassContext.jsx';
import { getClasses, createClass, deleteClass } from '../../api/classes.js';

const spring = { type: 'spring', stiffness: 100, damping: 20 };
const snappy = { type: 'spring', stiffness: 300, damping: 28 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
};

export default function ClassesPage() {
  const shouldReduce = useReducedMotion();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { activeClassId, setActiveClassId } = useClass();
  const [showForm, setShowForm] = useState(false);

  const { data: classes = [], isLoading } = useQuery({ queryKey: ['classes'], queryFn: getClasses });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const createMutation = useMutation({
    mutationFn: createClass,
    onSuccess: (cls) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      flushSync(() => {
        setActiveClassId(cls._id);
      });
      setShowForm(false);
      reset();
      navigate('/teacher/dashboard');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClass,
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      if (activeClassId === deletedId) setActiveClassId('');
    },
  });

  function enterClass(classId) {
    flushSync(() => {
      setActiveClassId(classId);
    });
    navigate('/teacher/dashboard');
  }

  return (
    <PageLayout
      title="Your classes"
      actions={
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
          + New class
        </button>
      }
    >
      <motion.div
        variants={shouldReduce ? undefined : containerVariants}
        initial={shouldReduce ? false : 'hidden'}
        animate="visible"
      >
        <motion.p variants={shouldReduce ? undefined : itemVariants} className="text-gray-600 text-sm mb-6 max-w-2xl">
          <strong>Step 1:</strong> create or pick a class here. <strong>Step 2:</strong> you’ll land in the dashboard
          for that class — Lessons, Assignments, Students, and the rest only apply to the class you selected.
        </motion.p>

        {!activeClassId && classes.length > 0 && (
          <motion.div
            variants={shouldReduce ? undefined : itemVariants}
            className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-sm px-4 py-3 mb-6"
          >
            Choose a class below , then open the dashboard to use the other tabs.
          </motion.div>
        )}

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
                <h2 className="font-semibold text-gray-800 mb-3">Create a class</h2>
                <form onSubmit={handleSubmit((d) => createMutation.mutate({ name: d.name, description: d.description || '' }))} className="space-y-3">
                  <div>
                    <label className="label">Class name</label>
                    <input {...register('name', { required: 'Name is required' })} className="input" placeholder="e.g. Period 3 — Web Dev" />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="label">Description (optional)</label>
                    <textarea {...register('description')} className="input min-h-[80px]" placeholder="Short note for yourself" />
                  </div>
                  {createMutation.isError && (
                    <p className="text-sm text-red-600">{createMutation.error?.response?.data?.message || 'Could not create class'}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Creating…' : 'Create & open'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); reset(); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <motion.div variants={shouldReduce ? undefined : itemVariants} className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse flex flex-col sm:flex-row gap-3 py-4">
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <div className="h-9 w-32 bg-gray-200 rounded-lg" />
                  <div className="h-9 w-24 bg-gray-200 rounded-lg" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : classes.length === 0 ? (
          <motion.div
            variants={shouldReduce ? undefined : itemVariants}
            className="card text-center py-12 text-gray-600"
          >
            <p className="text-lg mb-2">No classes yet</p>
            <p className="text-sm mb-4">Create a class to add lessons and enroll students.</p>
            <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
              Create your first class
            </button>
          </motion.div>
        ) : (
          <motion.ul variants={shouldReduce ? undefined : listVariants} initial="hidden" animate="visible" className="space-y-3">
            {classes.map((c) => (
              <motion.li
                key={c._id}
                variants={shouldReduce ? undefined : rowVariants}
                layout
                whileHover={shouldReduce ? undefined : { y: -1, transition: snappy }}
                className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:shadow-md transition-shadow duration-200"
              >
                <div>
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  {c.description ? <p className="text-sm text-gray-500 mt-1">{c.description}</p> : null}
                  <p className="text-xs text-gray-400 mt-2">
                    {(c.studentIds?.length ?? 0)} student{(c.studentIds?.length ?? 0) === 1 ? '' : 's'} enrolled
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary text-sm" onClick={() => enterClass(c._id)}>
                    Work in this class
                  </button>
                  <button
                    type="button"
                    className="btn-danger text-sm"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete “${c.name}” and all its lessons, assignments, and exercises? This cannot be undone.`)) {
                        deleteMutation.mutate(c._id);
                      }
                    }}
                  >
                    Delete class
                  </button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </motion.div>
    </PageLayout>
  );
}
