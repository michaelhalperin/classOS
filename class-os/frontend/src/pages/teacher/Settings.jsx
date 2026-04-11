import { motion, useReducedMotion } from "motion/react";
import PageLayout from "../../components/layout/PageLayout.jsx";
import ProfileSettings from "../../components/settings/ProfileSettings.jsx";

const spring = { type: "spring", stiffness: 100, damping: 20 };

export default function TeacherSettings() {
  const shouldReduce = useReducedMotion();

  return (
    <PageLayout fullWidth>
      <div className="mx-auto w-full max-w-5xl pb-24 sm:pb-28 md:pb-32">
        <header className="border-b border-gray-100 pb-5 md:pb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Account settings
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-gray-600 md:text-base">
            Update how you appear in Class OS and manage your sign-in details.
          </p>
        </header>

        <motion.div
          className="mt-8 md:mt-10"
          initial={shouldReduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <ProfileSettings description="Changes apply to how students and other teachers see your name in this workspace." />
        </motion.div>
      </div>
    </PageLayout>
  );
}
