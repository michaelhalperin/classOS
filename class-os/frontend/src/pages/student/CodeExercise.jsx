import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import CodeEditor from '../../components/ui/CodeEditor.jsx';
import CodeHintPanel from '../../components/ai/CodeHintPanel.jsx';
import PageLayout from '../../components/layout/PageLayout.jsx';
import { getExercise, runCode } from '../../api/exercises.js';

// Instant browser-side JS execution — no API key needed
function runJavaScriptInBrowser(code) {
  const logs = [];
  const errors = [];
  const origLog   = console.log;
  const origError = console.error;
  const origWarn  = console.warn;
  console.log   = (...args) => logs.push(args.map(String).join(' '));
  console.error = (...args) => errors.push(args.map(String).join(' '));
  console.warn  = (...args) => logs.push('[warn] ' + args.map(String).join(' '));
  let stderr = '';
  try { new Function(code)(); }
  catch (e) { stderr = e.toString(); }
  finally {
    console.log   = origLog;
    console.error = origError;
    console.warn  = origWarn;
  }
  const errorOutput = errors.join('\n');
  return {
    stdout: logs.join('\n'),
    stderr: stderr || errorOutput,
    compile_output: '',
    status: stderr || errorOutput ? 'Runtime Error' : 'Accepted',
    time: null,
  };
}

const spring = { type: 'spring', stiffness: 100, damping: 20 };

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const blockVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export default function CodeExercise() {
  const shouldReduce = useReducedMotion();
  const { id } = useParams();
  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => getExercise(id),
  });

  const [code, setCode] = useState('');
  const [output, setOutput] = useState(null);

  useEffect(() => {
    if (exercise) setCode(exercise.starterCode || '');
  }, [exercise?._id, exercise?.starterCode]);

  const lang = exercise?.language || 'javascript';

  const runMutation = useMutation({
    mutationFn: async () => {
      if (lang === 'javascript') return runJavaScriptInBrowser(code);
      return runCode({ code, language: lang });
    },
    onSuccess: (data) => setOutput(data),
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </PageLayout>
    );
  }

  if (!exercise) {
    return (
      <PageLayout>
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="text-center py-20"
        >
          <p className="text-gray-500">Exercise not found.</p>
          <Link to="/student/curriculum" className="btn-primary mt-4 inline-flex">Back to Curriculum</Link>
        </motion.div>
      </PageLayout>
    );
  }

  const hasOutput = output !== null;
  const hasError = output?.stderr || output?.compile_output;
  const statusOk = output?.status === 'Accepted';

  return (
    <PageLayout>
      <motion.div
        className="max-w-5xl mx-auto"
        variants={shouldReduce ? undefined : sectionVariants}
        initial={shouldReduce ? false : 'hidden'}
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={shouldReduce ? undefined : blockVariants} className="mb-6">
          <Link
            to={`/student/lessons/${exercise.lessonId?._id || exercise.lessonId}`}
            className="text-sm text-brand-600 hover:underline"
          >
            ← Back to Lesson
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{exercise.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
              {exercise.language}
            </span>
            {exercise.lessonId?.title && (
              <span className="text-xs text-gray-400">{exercise.lessonId.title}</span>
            )}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Instructions */}
          <motion.div variants={shouldReduce ? undefined : blockVariants}>
            <div className="card h-full">
              <h2 className="font-semibold text-gray-800 mb-3">📋 Instructions</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {exercise.instructions}
              </div>
            </div>
          </motion.div>

          {/* Right: Editor + Output */}
          <motion.div variants={shouldReduce ? undefined : blockVariants} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Your Code</label>
                <button
                  onClick={() => setCode(exercise.starterCode || '')}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Reset to starter
                </button>
              </div>
              <CodeEditor
                language={exercise.language}
                value={code}
                onChange={(val) => setCode(val || '')}
                height="380px"
              />
              <div className="mt-3">
                <CodeHintPanel
                  code={code}
                  language={lang}
                  lessonId={exercise.lessonId?._id || exercise.lessonId}
                  exerciseId={exercise._id}
                />
              </div>
            </div>

            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="btn-primary w-full py-2.5"
            >
              {runMutation.isPending ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Running…
                </span>
              ) : (
                '▶ Run Code'
              )}
            </button>

            {/* Output panel */}
            {hasOutput && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${
                  hasError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                  <span>{hasError ? '✗' : '✓'}</span>
                  <span>{output.status}</span>
                  {output.time && <span className="ml-auto text-xs opacity-60">{output.time}s</span>}
                </div>
                <div className="bg-gray-900 text-gray-100 p-4 font-mono text-sm overflow-auto max-h-48">
                  {output.stdout && (
                    <pre className="whitespace-pre-wrap">{output.stdout}</pre>
                  )}
                  {output.stderr && (
                    <pre className="whitespace-pre-wrap text-red-400">{output.stderr}</pre>
                  )}
                  {output.compile_output && (
                    <pre className="whitespace-pre-wrap text-yellow-400">{output.compile_output}</pre>
                  )}
                  {!output.stdout && !output.stderr && !output.compile_output && (
                    <span className="text-gray-500">(no output)</span>
                  )}
                </div>
              </div>
            )}

            {runMutation.isError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {runMutation.error?.response?.data?.message || 'Failed to run code. Check your Judge0 API key.'}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </PageLayout>
  );
}
