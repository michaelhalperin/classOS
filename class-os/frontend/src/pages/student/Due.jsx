import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import { getAssignments } from "../../api/assignments.js";
import { useClass } from "../../context/ClassContext.jsx";

const spring = { type: "spring", stiffness: 120, damping: 20 };
const snappy = { type: "spring", stiffness: 300, damping: 28 };

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const sectionHeaderVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: spring },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: spring },
};

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function Due() {
  const shouldReduce = useReducedMotion();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments", activeClassId],
    queryFn: () => getAssignments(activeClassId || undefined),
    enabled: Boolean(activeClassId),
  });

  const buckets = useMemo(() => {
    const now = new Date();
    const sow = startOfWeekMonday(now);
    const eow = addDays(sow, 7);

    const incomplete = assignments.filter((a) => !a.submission?.submittedAt);

    const overdue = [];
    const thisWeek = [];
    const upcoming = [];
    const noDue = [];

    for (const a of incomplete) {
      if (!a.dueDate) {
        noDue.push(a);
        continue;
      }
      const due = new Date(a.dueDate);
      if (due < now) {
        overdue.push(a);
      } else if (due < eow) {
        thisWeek.push(a);
      } else {
        upcoming.push(a);
      }
    }

    const sortByDue = (arr) =>
      [...arr].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return {
      overdue: sortByDue(overdue),
      thisWeek: sortByDue(thisWeek),
      upcoming: sortByDue(upcoming),
      noDue,
    };
  }, [assignments]);

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout title="What's due">
        <div className="card text-center py-20 max-w-lg mx-auto">
          <p className="text-3xl mb-3">📅</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            Not enrolled in any class
          </h2>
          <p className="text-sm text-gray-500">
            Ask your teacher to add you to a class — your due dates will show up
            here.
          </p>
        </div>
      </PageLayout>
    );
  }

  if (!activeClassId) {
    return (
      <PageLayout title="What's due">
        <div className="card text-center py-20 max-w-lg mx-auto">
          <p className="text-3xl mb-3">📅</p>
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            Pick a class first
          </h2>
          <p className="text-sm text-gray-500">
            Use the class selector in the top bar to choose which class to view.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="What's due"
      actions={
        <motion.div
          whileHover={shouldReduce ? undefined : { scale: 1.02 }}
          whileTap={shouldReduce ? undefined : { scale: 0.98 }}
          transition={snappy}
        >
          <Link to="/student/homework" className="btn-primary">
            Open Homework
          </Link>
        </motion.div>
      }
    >
      <motion.p
        initial={shouldReduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="text-sm text-gray-500 mb-6 max-w-2xl"
      >
        Incomplete assignments grouped by due date. Week runs Monday–Sunday.
        Times are based on due dates your teacher set.
      </motion.p>

      {isLoading ? (
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="space-y-4 animate-pulse"
        >
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </motion.div>
      ) : (
        <motion.div
          variants={shouldReduce ? undefined : pageVariants}
          initial={shouldReduce ? false : "hidden"}
          animate="visible"
          className="space-y-10"
        >
          <DueSection
            shouldReduce={shouldReduce}
            title="Overdue"
            emoji="⚠️"
            tone="red"
            empty="Nothing overdue — nice work."
            items={buckets.overdue}
          />
          <DueSection
            shouldReduce={shouldReduce}
            title="Due this week"
            emoji="📅"
            tone="amber"
            empty="Nothing due this week."
            items={buckets.thisWeek}
          />
          <DueSection
            shouldReduce={shouldReduce}
            title="Upcoming"
            emoji="🔜"
            tone="brand"
            empty="No future due dates yet."
            items={buckets.upcoming}
          />
          {buckets.noDue.length > 0 && (
            <DueSection
              shouldReduce={shouldReduce}
              title="No due date set"
              emoji="📋"
              tone="gray"
              empty=""
              items={buckets.noDue}
            />
          )}
        </motion.div>
      )}
    </PageLayout>
  );
}

function DueSection({ shouldReduce, title, emoji, tone, empty, items }) {
  const border =
    tone === "red"
      ? "border-red-100 bg-red-50/50"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50/40"
        : tone === "brand"
          ? "border-brand-100 bg-brand-50/30"
          : "border-gray-100 bg-gray-50/50";

  return (
    <motion.section variants={shouldReduce ? undefined : sectionHeaderVariants}>
      <div className="flex items-center gap-2 mb-3">
        <motion.span
          className="text-xl"
          aria-hidden
          whileHover={shouldReduce ? undefined : { scale: 1.12 }}
          transition={snappy}
        >
          {emoji}
        </motion.span>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="text-sm text-gray-400">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <motion.p
          initial={shouldReduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-500 py-2"
        >
          {empty}
        </motion.p>
      ) : (
        <motion.ul
          variants={shouldReduce ? undefined : listVariants}
          initial={shouldReduce ? false : "hidden"}
          animate="visible"
          className={`rounded-xl border ${border} divide-y divide-gray-100/80 overflow-hidden shadow-sm`}
        >
          {items.map((a) => (
            <motion.li
              key={a._id}
              variants={shouldReduce ? undefined : rowVariants}
              whileHover={
                shouldReduce
                  ? undefined
                  : { backgroundColor: "rgba(255,255,255,0.65)" }
              }
              transition={spring}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{a.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {a.lessonId?.title && <span>{a.lessonId.title}</span>}
                  {a.lessonId?.className && (
                    <span className="text-gray-400">
                      {" "}
                      · {a.lessonId.className}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {a.dueDate && (
                  <time
                    className="text-xs text-gray-500 whitespace-nowrap"
                    dateTime={a.dueDate}
                  >
                    Due{" "}
                    {new Date(a.dueDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                )}
                <motion.div
                  whileHover={shouldReduce ? undefined : { scale: 1.03 }}
                  whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                  transition={snappy}
                >
                  <Link
                    to="/student/homework"
                    className="btn-secondary text-xs py-1.5 px-3 inline-block"
                  >
                    Go to Homework
                  </Link>
                </motion.div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </motion.section>
  );
}
