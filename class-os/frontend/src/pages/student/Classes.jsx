import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import { studentClassPath } from "../../utils/classScopePaths.js";

const spring = { type: "spring", stiffness: 100, damping: 20 };
const snappy = { type: "spring", stiffness: 300, damping: 28 };

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 24 },
  },
};

export default function StudentClasses() {
  const shouldReduce = useReducedMotion();
  const navigate = useNavigate();
  const { classes, activeClassId, setActiveClassId, isLoading } = useClass();

  const activeClassLabel = classes.find(
    (c) => String(c._id) === String(activeClassId),
  )?.name;

  function openClass(id) {
    navigate(studentClassPath(id, "curriculum"));
  }

  return (
    <PageLayout title="My Classes">
      <motion.p
        initial={shouldReduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="text-sm text-gray-500 mb-6 max-w-2xl"
      >
        These are the classes you&apos;re enrolled in. Open a class to work in
        that class — the URL includes the class so links stay scoped to it.
      </motion.p>

      {activeClassId && (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="rounded-lg border border-brand-200 bg-brand-50/80 text-brand-950 text-sm px-4 py-3 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            <span className="font-medium">Active class in this browser:</span>{" "}
            {activeClassLabel ?? "Unknown class"}
            <span className="text-brand-800/80">
              {" "}
              — used for shortcuts and settings until you clear it.
            </span>
          </p>
          <button
            type="button"
            className="btn-secondary shrink-0 text-sm"
            onClick={() => setActiveClassId("")}
          >
            Clear active class
          </button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card animate-pulse flex items-center gap-4 py-5"
            >
              <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-9 w-24 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <motion.div
          initial={shouldReduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card text-center py-20 max-w-lg mx-auto"
        >
          <p className="text-5xl mb-4">🏫</p>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Not enrolled in any class yet
          </h2>
          <p className="text-sm text-gray-500">
            Ask your teacher to add you to a class using your registered email
            address.
          </p>
        </motion.div>
      ) : (
        <motion.ul
          variants={shouldReduce ? undefined : listVariants}
          initial={shouldReduce ? false : "hidden"}
          animate="visible"
          className="space-y-3"
        >
          <AnimatePresence>
            {classes.map((c) => {
              const isActive = String(c._id) === String(activeClassId);
              return (
                <motion.li
                  key={c._id}
                  variants={shouldReduce ? undefined : rowVariants}
                  layout
                  whileHover={
                    shouldReduce ? undefined : { y: -1, transition: snappy }
                  }
                  className={`card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-shadow duration-200 hover:shadow-md ${
                    isActive
                      ? "border-brand-300 bg-brand-50/40 ring-1 ring-brand-200"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                        isActive
                          ? "bg-brand-100 text-brand-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`font-semibold truncate ${isActive ? "text-brand-800" : "text-gray-900"}`}
                      >
                        {c.name}
                        {isActive && (
                          <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                            Active
                          </span>
                        )}
                      </p>
                      {c.description ? (
                        <p className="text-sm text-gray-500 truncate mt-0.5">
                          {c.description}
                        </p>
                      ) : null}
                      {c.teacherId?.name ? (
                        <p className="text-xs text-gray-400 mt-1">
                          Teacher: {c.teacherId.name}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <motion.button
                      type="button"
                      onClick={() => openClass(c._id)}
                      whileHover={shouldReduce ? undefined : { scale: 1.02 }}
                      whileTap={shouldReduce ? undefined : { scale: 0.97 }}
                      transition={snappy}
                      className="btn-primary text-sm"
                    >
                      Open class
                    </motion.button>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>
      )}
    </PageLayout>
  );
}
