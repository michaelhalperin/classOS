import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./AuthContext.jsx";
import { getClasses } from "../api/classes.js";

const ClassContext = createContext(null);

const TEACHER_KEY = "teacherActiveClassId";
const STUDENT_KEY = "studentActiveClassId";

export function ClassProvider({ children }) {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  const storageKey = isTeacher ? TEACHER_KEY : STUDENT_KEY;

  const [activeClassId, setActiveClassIdState] = useState(
    () => sessionStorage.getItem(isTeacher ? TEACHER_KEY : STUDENT_KEY) || "",
  );

  const setActiveClassId = useCallback(
    (id) => {
      const v = id ? String(id) : "";
      setActiveClassIdState(v);
      if (v) sessionStorage.setItem(storageKey, v);
      else sessionStorage.removeItem(storageKey);
    },
    [storageKey],
  );

  const {
    data: classes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["classes"],
    queryFn: getClasses,
    enabled: isTeacher || isStudent,
  });

  // Clear stored class if it was removed; active class comes from URL when scoped.
  useEffect(() => {
    if (!classes.length) return;
    if (!activeClassId) return;
    const valid = classes.some((c) => String(c._id) === activeClassId);
    if (!valid) setActiveClassId("");
  }, [classes, activeClassId, setActiveClassId]);

  const value = useMemo(
    () => ({
      classes,
      activeClassId,
      setActiveClassId,
      isLoading,
      refetch,
    }),
    [classes, activeClassId, setActiveClassId, isLoading, refetch],
  );

  return (
    <ClassContext.Provider value={value}>{children}</ClassContext.Provider>
  );
}

export function useClass() {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error("useClass must be used within ClassProvider");
  return ctx;
}
