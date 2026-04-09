import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import Drawer from '../ui/Drawer.jsx';
import { generateDrills, checkDrill } from '../../api/ai.js';

export default function LessonDrills({
  lessonId,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  stackAfterOpen = false,
  presentation = 'inline',
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = typeof onOpenChange === 'function';
  const open = controlled ? Boolean(openProp) : internalOpen;
  const setOpen = (next) => {
    if (controlled) {
      onOpenChange(typeof next === 'function' ? next(open) : next);
    } else {
      setInternalOpen(next);
    }
  };
  const [drills, setDrills] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  const genMutation = useMutation({
    mutationFn: () => generateDrills(lessonId),
    onSuccess: (data) => {
      setDrills(data.drills || []);
      setActiveIdx(0);
      setAnswer('');
      setCheckResult(null);
    },
  });

  const checkMutation = useMutation({
    mutationFn: () => checkDrill(drills[activeIdx], answer),
    onSuccess: (data) => setCheckResult(data),
  });

  const active = drills[activeIdx];

  const drillsBody = (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary text-sm"
          onClick={() => genMutation.mutate()}
          disabled={genMutation.isPending}
        >
          {genMutation.isPending ? 'Generating…' : 'Generate drills'}
        </button>
        {drills.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {drills.map((d, i) => (
              <button
                key={d.id || i}
                type="button"
                onClick={() => {
                  setActiveIdx(i);
                  setAnswer('');
                  setCheckResult(null);
                }}
                className={`text-xs px-2 py-1 rounded-md border ${
                  i === activeIdx ? 'bg-brand-100 border-brand-300 text-brand-800' : 'border-gray-200 text-gray-600'
                }`}
              >
                {i + 1}. {d.type?.replace('_', ' ') || 'Q'}
              </button>
            ))}
          </div>
        )}
      </div>

      {genMutation.isError && (
        <p className="text-sm text-red-600">
          {genMutation.error?.response?.data?.message || 'Could not generate drills. Is OPENAI_API_KEY set?'}
        </p>
      )}

      {active && (
        <>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Question</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{active.question}</p>
          </div>
          <div>
            <label className="label text-sm">Your answer</label>
            <textarea
              className="input font-mono text-sm min-h-[100px]"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer…"
            />
          </div>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => checkMutation.mutate()}
            disabled={checkMutation.isPending || !answer.trim()}
          >
            {checkMutation.isPending ? 'Checking…' : 'Check my answer'}
          </button>

          {checkResult && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-brand-700">{checkResult.score}</span>
                <span className="text-gray-500">/ 100</span>
              </div>
              <p className="text-gray-700">{checkResult.feedback}</p>
              {checkResult.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700">Strengths</p>
                  <ul className="list-disc list-inside text-gray-600">
                    {checkResult.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {checkResult.improvements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-800">Improve</p>
                  <ul className="list-disc list-inside text-gray-600">
                    {checkResult.improvements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  const rootClass =
    presentation === 'inline' && hideTrigger
      ? (open ? (stackAfterOpen ? 'mt-4' : 'mt-6') : '')
      : presentation === 'inline'
        ? 'mt-4'
        : '';

  if (presentation === 'drawer') {
    return (
      <>
        {!hideTrigger && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/80 text-left hover:shadow-sm transition-shadow"
            >
              <span className="font-semibold text-amber-900 flex items-center gap-2">
                <span aria-hidden>✏️</span>
                Practice drills
                <span className="text-xs font-normal text-amber-800/80">AI from lesson objectives &amp; content</span>
              </span>
              <span className="text-amber-800 text-sm">{open ? '▼' : '▶'}</span>
            </button>
          </div>
        )}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          title="Practice drills"
          subtitle="AI-generated from lesson objectives & content"
          tone="amber"
          bodyClassName="overflow-y-auto p-0"
        >
          {drillsBody}
        </Drawer>
      </>
    );
  }

  return (
    <div className={rootClass}>
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50/80 text-left hover:shadow-sm transition-shadow"
        >
          <span className="font-semibold text-amber-900 flex items-center gap-2">
            <span aria-hidden>✏️</span>
            Practice drills
            <span className="text-xs font-normal text-amber-800/80">AI from lesson objectives &amp; content</span>
          </span>
          <span className="text-amber-800 text-sm">{open ? '▼' : '▶'}</span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-gray-200 bg-white p-0 overflow-hidden">
              {drillsBody}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
