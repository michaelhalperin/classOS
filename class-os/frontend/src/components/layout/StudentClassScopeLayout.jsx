import { useEffect } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useClass } from "../../context/ClassContext.jsx";
import { STUDENT_CLASSES_ROUTE } from "../../utils/classScopePaths.js";

/** Validates `:classId` in the URL, syncs ClassContext, and renders nested routes. */
export default function StudentClassScopeLayout() {
  const { classId } = useParams();
  const { classes, isLoading, setActiveClassId } = useClass();

  useEffect(() => {
    if (classId) setActiveClassId(classId);
  }, [classId, setActiveClassId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading classes…</p>
      </div>
    );
  }

  if (!classes.length) {
    return <Navigate to={STUDENT_CLASSES_ROUTE} replace />;
  }

  const valid = classes.some((c) => String(c._id) === String(classId));
  if (!classId || !valid) {
    return <Navigate to={STUDENT_CLASSES_ROUTE} replace />;
  }

  return <Outlet />;
}
