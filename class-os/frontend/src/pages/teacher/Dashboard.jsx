import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import { getLessons } from "../../api/lessons.js";
import { getAssignments } from "../../api/assignments.js";
import { getSubmissions } from "../../api/submissions.js";
import { getStudents } from "../../api/students.js";
import DashboardInsights from "../../components/teacher/DashboardInsights.jsx";
import {
  teacherClassPath,
  TEACHER_CLASSES_ROUTE,
} from "../../utils/classScopePaths.js";

// Animation configs
const spring = { type: "spring", stiffness: 100, damping: 20 };
const snappy = { type: "spring", stiffness: 300, damping: 28 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: spring },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: spring },
};

export default function TeacherDashboard() {
  const shouldReduce = useReducedMotion();
  const { classId } = useParams();
  const { activeClassId, classes, isLoading: classesLoading } = useClass();

  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", activeClassId],
    queryFn: () => getLessons(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", activeClassId],
    queryFn: () => getAssignments(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions", activeClassId],
    queryFn: () => getSubmissions(activeClassId),
    enabled: Boolean(activeClassId),
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students", activeClassId],
    queryFn: () => getStudents(activeClassId),
    enabled: Boolean(activeClassId),
  });

  const sortedAssignments = [...assignments].sort(
    (a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0),
  );

  const subMap = {};
  submissions.forEach((s) => {
    const key = `${s.studentId?._id || s.studentId}__${s.assignmentId?._id || s.assignmentId}`;
    subMap[key] = s;
  });

  function getCellStatus(studentId, assignmentId) {
    const key = `${studentId}__${assignmentId}`;
    const sub = subMap[key];
    if (!sub?.submittedAt) return "missing";
    if (sub.grade != null) return "graded";
    return "submitted";
  }

  const cellColors = {
    graded: "bg-green-100 text-green-700 border-green-200",
    submitted: "bg-yellow-100 text-yellow-700 border-yellow-200",
    missing: "bg-red-50 text-red-400 border-red-100",
  };

  const cellLabels = { graded: "✓", submitted: "⏳", missing: "—" };

  const statsTotal = submissions.length;
  const statsGraded = submissions.filter((s) => s.grade != null).length;
  const statsPending = statsTotal - statsGraded;

  const recentLessons = [...lessons]
    .sort((a, b) => a.weekNumber - b.weekNumber || a.orderIndex - b.orderIndex)
    .slice(0, 6);

  if (!classesLoading && classes.length === 0) {
    return (
      <PageLayout title="Teacher Dashboard">
        <div className="card text-center py-16 max-w-lg mx-auto">
          <p className="text-gray-700 mb-2">
            You need a class before adding lessons or students.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Everything in the teacher area is scoped to the class selected in
            the top bar.
          </p>
          <Link to={TEACHER_CLASSES_ROUTE} className="btn-primary">
            Create a class
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Teacher Dashboard"
      fullWidth
      actions={
        <div className="flex gap-2">
          <Link
            to={teacherClassPath(classId, "lessons")}
            className="btn-secondary"
          >
            Manage Lessons
          </Link>
          <Link
            to={teacherClassPath(classId, "assignments")}
            className="btn-primary"
          >
            + Assignment
          </Link>
        </div>
      }
    >
      {/* Stats */}
      <motion.div
        variants={shouldReduce ? undefined : containerVariants}
        initial={shouldReduce ? false : "hidden"}
        animate="visible"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
      >
        <StatCard
          label="Total Students"
          value={students.length}
          color="brand"
          delay={0}
          shouldReduce={shouldReduce}
        />
        <StatCard
          label="Lessons"
          value={lessons.length}
          color="purple"
          delay={0.08}
          shouldReduce={shouldReduce}
        />
        <StatCard
          label="Submissions"
          value={statsTotal}
          color="yellow"
          delay={0.16}
          shouldReduce={shouldReduce}
        />
        <StatCard
          label="Needs Grading"
          value={statsPending}
          color="red"
          delay={0.24}
          shouldReduce={shouldReduce}
        />
      </motion.div>

      {activeClassId && <DashboardInsights classId={activeClassId} />}

      {/* Progress Grid */}
      {students.length > 0 && sortedAssignments.length > 0 && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.3 }}
          className="card overflow-x-auto"
        >
          <h2 className="font-semibold text-gray-800 mb-4">
            Student Progress Grid
          </h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="text-left font-medium text-gray-500 pb-3 pr-4 whitespace-nowrap sticky left-0 bg-white">
                  Student
                </th>
                {sortedAssignments.map((a) => (
                  <th
                    key={a._id}
                    className="pb-3 px-2 font-medium text-gray-500 text-center whitespace-nowrap max-w-[100px]"
                  >
                    <span className="block truncate text-xs" title={a.title}>
                      {a.title}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <motion.tbody
              variants={
                shouldReduce
                  ? undefined
                  : {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.4,
                        },
                      },
                    }
              }
              initial={shouldReduce ? false : "hidden"}
              animate="visible"
              className="divide-y divide-gray-50"
            >
              {students.map((student) => (
                <motion.tr
                  key={student._id}
                  variants={shouldReduce ? undefined : rowVariants}
                  className="hover:bg-gray-50"
                >
                  <td className="py-2 pr-4 sticky left-0 bg-white hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                        {student.name?.[0]}
                      </div>
                      <span className="font-medium text-gray-800 whitespace-nowrap">
                        {student.name}
                      </span>
                    </div>
                  </td>
                  {sortedAssignments.map((a) => {
                    const status = getCellStatus(student._id, a._id);
                    const sub = subMap[`${student._id}__${a._id}`];
                    return (
                      <td key={a._id} className="py-2 px-2 text-center">
                        <span
                          title={
                            status === "graded"
                              ? `Grade: ${sub?.grade}/100`
                              : status === "submitted"
                                ? "Submitted — awaiting grade"
                                : "Not submitted"
                          }
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold cursor-default ${cellColors[status]}`}
                        >
                          {status === "graded"
                            ? sub?.grade
                            : cellLabels[status]}
                        </span>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </motion.tbody>
          </table>

          <div className="mt-4 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-green-100 border border-green-200 inline-block" />{" "}
              Graded
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-yellow-100 border border-yellow-200 inline-block" />{" "}
              Submitted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded bg-red-50 border border-red-100 inline-block" />{" "}
              Missing
            </span>
          </div>
        </motion.div>
      )}

      {/* Recent Lessons */}
      <motion.div
        initial={shouldReduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.3 }}
        className="mt-8 pb-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Lessons</h2>
          <Link
            to={teacherClassPath(classId, "lessons")}
            className="text-sm text-brand-600 hover:underline"
          >
            View all →
          </Link>
        </div>
        <motion.div
          variants={
            shouldReduce
              ? undefined
              : {
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.07, delayChildren: 0.5 },
                  },
                }
          }
          initial={shouldReduce ? false : "hidden"}
          animate="visible"
          className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {recentLessons.map((lesson) => (
            <motion.div
              key={lesson._id}
              variants={shouldReduce ? undefined : itemVariants}
              whileHover={
                shouldReduce ? undefined : { y: -2, transition: snappy }
              }
            >
              <Link
                to={teacherClassPath(classId, `lessons/${lesson._id}`)}
                className="card hover:shadow-md transition-shadow group p-4 block"
              >
                <span className="text-xs text-brand-500 font-medium">
                  Week {lesson.weekNumber} · #{lesson.orderIndex}
                </span>
                <p className="mt-1 font-medium text-gray-900 group-hover:text-brand-600 transition-colors truncate">
                  {lesson.title}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </PageLayout>
  );
}

function StatCard({ label, value, color, delay, shouldReduce }) {
  const colors = {
    brand: "text-brand-700",
    purple: "text-purple-700",
    yellow: "text-yellow-700",
    red: "text-red-600",
  };
  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      whileHover={
        shouldReduce
          ? undefined
          : {
              y: -2,
              transition: { type: "spring", stiffness: 300, damping: 28 },
            }
      }
      className="card p-4"
    >
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </motion.div>
  );
}
