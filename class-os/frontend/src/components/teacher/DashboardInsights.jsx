import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'motion/react';
import { getClassInsights } from '../../api/classes.js';

const spring = { type: 'spring', stiffness: 100, damping: 20 };
const snappy = { type: 'spring', stiffness: 300, damping: 28 };

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: spring },
};

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: spring },
};

const analyticsBlockVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: spring },
};

function fmtSec(totalSeconds) {
  const s = Math.round(totalSeconds || 0);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function downloadNudgeCsv(insights) {
  if (!insights?.nudgeList?.length) return;
  const rows = [['name', 'email', 'reasons'].join(',')].concat(
    insights.nudgeList.map((r) =>
      [`"${(r.name || '').replace(/"/g, '""')}"`, `"${(r.email || '').replace(/"/g, '""')}"`, `"${(r.reasons || []).join('; ').replace(/"/g, '""')}"`].join(
        ','
      )
    )
  );
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nudge-list.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function mailtoNudge(insights) {
  if (!insights?.nudgeList?.length) return;
  const emails = insights.nudgeList.map((r) => encodeURIComponent(r.email)).join(',');
  window.location.href = `mailto:?bcc=${emails}&subject=${encodeURIComponent('Class check-in')}`;
}

export default function DashboardInsights({ classId }) {
  const shouldReduce = useReducedMotion();
  const { data: ins, isLoading, isError } = useQuery({
    queryKey: ['class-insights', classId],
    queryFn: () => getClassInsights(classId),
    enabled: Boolean(classId),
  });

  if (!classId) return null;
  if (isLoading) {
    return (
      <motion.div
        initial={shouldReduce ? false : { opacity: 0.6 }}
        animate={{ opacity: 1 }}
        className="card mb-8 animate-pulse space-y-3"
      >
        <div className="h-5 bg-gray-100 rounded w-1/3" />
        <div className="h-20 bg-gray-100 rounded" />
      </motion.div>
    );
  }
  if (isError || !ins) {
    return (
      <motion.div
        initial={shouldReduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={snappy}
        className="card mb-8 text-sm text-red-600"
      >
        Could not load class insights.
      </motion.div>
    );
  }

  const dist = ins.gradeDistribution || {};
  const gradeTotal = Object.values(dist).reduce((a, b) => a + b, 0);

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="space-y-8 mb-10"
    >
      <section>
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.02 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4"
        >
          <h2 className="font-semibold text-gray-800">Class health</h2>
          <div className="flex flex-wrap gap-2">
            <motion.button
              type="button"
              className="btn-secondary text-sm py-1.5"
              onClick={() => downloadNudgeCsv(ins)}
              whileHover={shouldReduce ? undefined : { scale: 1.02 }}
              whileTap={shouldReduce ? undefined : { scale: 0.98 }}
              transition={snappy}
            >
              Export nudge list (CSV)
            </motion.button>
            <motion.button
              type="button"
              className="btn-secondary text-sm py-1.5"
              onClick={() => mailtoNudge(ins)}
              whileHover={shouldReduce ? undefined : { scale: 1.02 }}
              whileTap={shouldReduce ? undefined : { scale: 0.98 }}
              transition={snappy}
            >
              Open email (BCC all)
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          variants={shouldReduce ? undefined : sectionVariants}
          initial={shouldReduce ? false : 'hidden'}
          animate="visible"
          className="grid gap-4 md:grid-cols-3"
        >
          <motion.div
            variants={shouldReduce ? undefined : cardVariants}
            whileHover={shouldReduce ? undefined : { y: -2, transition: snappy }}
            className="card p-4 border-l-4 border-l-amber-400"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stale logins</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{ins.staleStudents.length}</p>
            <p className="text-xs text-gray-500 mt-1">No login in {ins.staleLoginDays}+ days</p>
          </motion.div>
          <motion.div
            variants={shouldReduce ? undefined : cardVariants}
            whileHover={shouldReduce ? undefined : { y: -2, transition: snappy }}
            className="card p-4 border-l-4 border-l-red-400"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Behind on work</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{ins.behindStudents.length}</p>
            <p className="text-xs text-gray-500 mt-1">At least one missing submission</p>
          </motion.div>
          <motion.div
            variants={shouldReduce ? undefined : cardVariants}
            whileHover={shouldReduce ? undefined : { y: -2, transition: snappy }}
            className="card p-4 border-l-4 border-l-brand-500"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due this week</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{ins.dueThisWeek.length}</p>
            <p className="text-xs text-gray-500 mt-1">Assignments due Mon–Sun</p>
          </motion.div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2 mt-6">
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="card p-4"
          >
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Nudge list</h3>
            {ins.nudgeList.length === 0 ? (
              <p className="text-sm text-gray-500">Everyone looks active.</p>
            ) : (
              <motion.ul
                variants={shouldReduce ? undefined : sectionVariants}
                initial={shouldReduce ? false : 'hidden'}
                animate="visible"
                className="text-sm max-h-48 overflow-y-auto"
              >
                {ins.nudgeList.map((r) => (
                  <motion.li
                    key={r.email}
                    variants={shouldReduce ? undefined : rowVariants}
                    className="flex justify-between gap-2 border-b border-gray-50 pb-2 last:border-0"
                  >
                    <span className="font-medium text-gray-800 truncate">{r.name}</span>
                    <span className="text-gray-500 text-xs text-right shrink-0">
                      {(r.reasons || []).join(' · ')}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.div>
          <motion.div
            initial={shouldReduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.16 }}
            className="card p-4"
          >
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Due this week</h3>
            {ins.dueThisWeek.length === 0 ? (
              <p className="text-sm text-gray-500">No due dates in the current week.</p>
            ) : (
              <motion.ul
                variants={shouldReduce ? undefined : sectionVariants}
                initial={shouldReduce ? false : 'hidden'}
                animate="visible"
                className="text-sm space-y-0"
              >
                {ins.dueThisWeek.map((a) => (
                  <motion.li key={a._id} variants={shouldReduce ? undefined : rowVariants} className="flex justify-between gap-2 py-1">
                    <span className="text-gray-800 truncate">{a.title}</span>
                    <time className="text-gray-500 text-xs shrink-0" dateTime={a.dueDate}>
                      {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </time>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.div>
        </div>
      </section>

      <section>
        <motion.h2
          initial={shouldReduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="font-semibold text-gray-800 mb-4"
        >
          Analytics
        </motion.h2>
        <motion.div
          variants={shouldReduce ? undefined : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.06 } } }}
          initial={shouldReduce ? false : 'hidden'}
          animate="visible"
          className="grid gap-6 lg:grid-cols-2"
        >
          <motion.div variants={shouldReduce ? undefined : analyticsBlockVariants} className="card p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Grade distribution</h3>
            <div className="space-y-2">
              {Object.entries(dist).map(([k, v]) => {
                const pct = gradeTotal ? (v / gradeTotal) * 100 : 0;
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">{k}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-brand-500 rounded-full max-w-full"
                        initial={shouldReduce ? false : { width: '0%' }}
                        animate={{ width: `${pct}%` }}
                        transition={{ ...spring, delay: 0.08 }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-6 text-right">{v}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div variants={shouldReduce ? undefined : analyticsBlockVariants} className="card p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Submission timing vs due date</h3>
            <p className="text-xs text-gray-500 mb-2">Hours after the due time (negative = early). Only graded work with a due date.</p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-gray-500">Average</dt>
                <dd className="font-semibold text-gray-900">
                  {ins.submissionLatencyHours?.avg != null ? `${ins.submissionLatencyHours.avg.toFixed(1)} h` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Median</dt>
                <dd className="font-semibold text-gray-900">
                  {ins.submissionLatencyHours?.median != null
                    ? `${ins.submissionLatencyHours.median.toFixed(1)} h`
                    : '—'}
                </dd>
              </div>
              <div className="col-span-2 text-xs text-gray-400">
                n = {ins.submissionLatencyHours?.sampleSize ?? 0}
              </div>
            </dl>
          </motion.div>

          <motion.div variants={shouldReduce ? undefined : analyticsBlockVariants} className="card p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Assignment difficulty (missing rate)</h3>
            {ins.assignmentDifficulty.length === 0 ? (
              <p className="text-sm text-gray-500">No assignments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 pr-4">Assignment</th>
                      <th className="pb-2 pr-4">Lesson</th>
                      <th className="pb-2">Missing</th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={shouldReduce ? undefined : sectionVariants}
                    initial={shouldReduce ? false : 'hidden'}
                    animate="visible"
                    className="divide-y divide-gray-50"
                  >
                    {ins.assignmentDifficulty.slice(0, 12).map((row) => (
                      <motion.tr key={String(row.assignmentId)} variants={shouldReduce ? undefined : rowVariants}>
                        <td className="py-2 pr-4 font-medium text-gray-800 max-w-[200px] truncate">{row.title}</td>
                        <td className="py-2 pr-4 text-gray-500 truncate max-w-[160px]">{row.lessonTitle || '—'}</td>
                        <td className="py-2">
                          {Math.round(row.missingRate * 100)}% ({row.classSize - row.submittedCount}/{row.classSize})
                        </td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            )}
          </motion.div>

          <motion.div variants={shouldReduce ? undefined : analyticsBlockVariants} className="card p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Time on lesson (tracked)</h3>
            <p className="text-xs text-gray-500 mb-2">Sum of active time students spent on each lesson (30s heartbeats while the tab is open).</p>
            {ins.lessonTime.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet — students generate this by reading lessons.</p>
            ) : (
              <motion.ul
                variants={shouldReduce ? undefined : sectionVariants}
                initial={shouldReduce ? false : 'hidden'}
                animate="visible"
                className="text-sm space-y-1"
              >
                {ins.lessonTime.slice(0, 10).map((lt) => (
                  <motion.li key={String(lt.lessonId)} variants={shouldReduce ? undefined : rowVariants} className="flex justify-between gap-2">
                    <span className="text-gray-800 truncate">{lt.title}</span>
                    <span className="text-gray-500 shrink-0">{fmtSec(lt.totalSeconds)}</span>
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </motion.div>
        </motion.div>
      </section>
    </motion.div>
  );
}
