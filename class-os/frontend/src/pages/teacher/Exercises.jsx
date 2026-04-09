import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/layout/PageLayout.jsx';
import CodeEditor from '../../components/ui/CodeEditor.jsx';
import { useClass } from '../../context/ClassContext.jsx';
import { getLessons } from '../../api/lessons.js';
import { getExercises, createExercise, updateExercise, deleteExercise } from '../../api/exercises.js';

const LANGUAGES = ['javascript', 'python', 'java', 'cpp', 'c', 'typescript', 'go', 'rust'];

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

export default function Exercises() {
  const qc = useQueryClient();
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [starterCode, setStarterCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises', activeClassId],
    queryFn: () => getExercises({ classId: activeClassId }),
    enabled: Boolean(activeClassId),
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', activeClassId],
    queryFn: () => getLessons(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const watchedLanguage = watch('language', 'javascript');

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, starterCode };
      return editing ? updateExercise(editing, payload) : createExercise(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      setEditing(null);
      setShowForm(false);
      setStarterCode('');
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });

  const handleEdit = (ex) => {
    setEditing(ex._id);
    setShowForm(true);
    setStarterCode(ex.starterCode || '');
    setSelectedLanguage(ex.language || 'javascript');
    reset({
      lessonId: ex.lessonId?._id || ex.lessonId,
      title: ex.title,
      instructions: ex.instructions,
      language: ex.language || 'javascript',
    });
  };

  const handleNew = () => {
    setEditing(null);
    setShowForm(true);
    setStarterCode('');
    reset({ lessonId: '', title: '', instructions: '', language: 'javascript' });
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Code Exercises</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-600">
              Practice problems with starter code; students run and submit from the homework flow.
            </p>
          </div>
          <button type="button" onClick={handleNew} className="btn-primary shrink-0">
            + New Exercise
          </button>
        </header>

      {/* Form — slides in/out */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="exercise-form"
            initial={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={shouldReduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={shouldReduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={snappy}
            className="overflow-hidden mb-6"
          >
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Exercise' : 'New Exercise'}</h2>
              <form onSubmit={handleSubmit(saveMutation.mutate)} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
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
                    <label className="label">Language</label>
                    <select
                      {...register('language')}
                      className="input capitalize"
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Title</label>
                  <input {...register('title', { required: 'Title is required' })} className="input" placeholder="e.g. Reverse a String" />
                  {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
                </div>
                <div>
                  <label className="label">Instructions</label>
                  <textarea
                    {...register('instructions', { required: 'Instructions are required' })}
                    rows={4}
                    className="input resize-y"
                    placeholder="Explain what the student needs to implement..."
                  />
                  {errors.instructions && <p className="mt-1 text-xs text-red-600">{errors.instructions.message}</p>}
                </div>
                <div>
                  <label className="label">Starter Code</label>
                  <CodeEditor
                    language={watchedLanguage || selectedLanguage}
                    value={starterCode}
                    onChange={(val) => setStarterCode(val || '')}
                    height="250px"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving…' : editing ? 'Update' : 'Create Exercise'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setShowForm(false); setEditing(null); setStarterCode(''); reset(); }}
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

      {isLoading ? (
        <LoadingSkeleton />
      ) : exercises.length === 0 && !showForm ? (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <p className="text-4xl mb-3">💻</p>
          <p className="text-gray-500">No exercises yet. Create one to get started!</p>
        </motion.div>
      ) : (
        <motion.div
          variants={shouldReduce ? undefined : listVariants}
          initial={shouldReduce ? false : 'hidden'}
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <AnimatePresence>
            {exercises.map((ex) => (
              <motion.div
                key={ex._id}
                variants={shouldReduce ? undefined : itemVariants}
                exit={shouldReduce ? { opacity: 0 } : itemVariants.exit}
                layout
                whileHover={shouldReduce ? undefined : { y: -2, transition: snappy }}
                className="card flex h-full flex-col transition-shadow duration-200 hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-semibold text-gray-900">{ex.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
                      {ex.language}
                    </span>
                    {ex.lessonId && (
                      <span className="line-clamp-1 max-w-full rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
                        {ex.lessonId.title}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-600">{ex.instructions}</p>
                </div>
                <div className="mt-4 flex shrink-0 flex-wrap gap-2 border-t border-gray-100 pt-3">
                  <button type="button" onClick={() => handleEdit(ex)} className="btn-secondary text-sm py-1.5">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this exercise?')) deleteMutation.mutate(ex._id);
                    }}
                    className="btn-danger text-sm py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
      </div>
    </PageLayout>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 pb-12 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card h-36 animate-pulse p-4">
          <div className="mb-2 h-5 w-2/3 rounded bg-gray-200" />
          <div className="h-4 w-1/3 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
