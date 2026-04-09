import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { codeHint } from '../../api/ai.js';

/**
 * @param {object} props
 * @param {string} props.code
 * @param {string} props.language
 * @param {string} [props.lessonId]
 * @param {string} [props.exerciseId]
 * @param {string} [props.assignmentId]
 */
export default function CodeHintPanel({ code, language, lessonId, exerciseId, assignmentId }) {
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      codeHint({
        code,
        language,
        lessonId,
        exerciseId,
        assignmentId,
      }),
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            mutation.mutate();
          }}
          disabled={mutation.isPending}
          className="text-sm px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-900 font-medium hover:bg-violet-100 transition-colors disabled:opacity-60"
        >
          {mutation.isPending ? '…' : '🧩'} Stuck? Get a hint
        </button>
        <span className="text-xs text-gray-400">No full solutions — hint, concept, optional one line.</span>
      </div>

      <AnimatePresence>
        {(open || mutation.isPending || mutation.isSuccess || mutation.isError) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-sm text-violet-950"
          >
            {mutation.isPending && (
              <p className="flex items-center gap-2 text-violet-800">
                <span className="inline-block w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                Getting a hint…
              </p>
            )}
            {mutation.isError && (
              <p className="text-red-700">
                {mutation.error?.response?.data?.message || mutation.error?.message || 'Hint failed.'}
              </p>
            )}
            {mutation.isSuccess && (
              <div className="space-y-2">
                {mutation.data.concept && (
                  <p>
                    <span className="font-semibold text-violet-900">Concept:</span>{' '}
                    {mutation.data.concept}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{mutation.data.hint}</p>
                {mutation.data.oneLineTry && (
                  <pre className="text-xs bg-white/80 border border-violet-100 rounded p-2 overflow-x-auto font-mono">
                    {mutation.data.oneLineTry}
                  </pre>
                )}
                <button type="button" className="text-xs text-violet-700 underline" onClick={() => mutation.mutate()}>
                  Refresh hint
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
