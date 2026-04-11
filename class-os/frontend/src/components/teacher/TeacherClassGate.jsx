import { Navigate } from "react-router-dom";
import { useClass } from "../../context/ClassContext.jsx";

/** Teachers must pick a class (and have at least one) before Dashboard, Lessons, etc. */
export default function TeacherClassGate({ children }) {
  const { classes, activeClassId, isLoading } = useClass();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading classes…</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return <Navigate to="/teacher/classes" replace />;
  }

  if (!activeClassId) {
    return <Navigate to="/teacher/classes" replace />;
  }

  return children;
}
