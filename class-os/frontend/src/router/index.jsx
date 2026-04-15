import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import TeacherClassScopeLayout from "../components/layout/TeacherClassScopeLayout.jsx";
import StudentClassScopeLayout from "../components/layout/StudentClassScopeLayout.jsx";
import {
  TEACHER_CLASSES_ROUTE,
  STUDENT_CLASSES_ROUTE,
  TEACHER_SETTINGS_ROUTE,
  STUDENT_SETTINGS_ROUTE,
} from "../utils/classScopePaths.js";

// Auth
import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";

// Teacher
import TeacherDashboard from "../pages/teacher/Dashboard.jsx";
import LessonEditor from "../pages/teacher/LessonEditor.jsx";
import Assignments from "../pages/teacher/Assignments.jsx";
import Submissions from "../pages/teacher/Submissions.jsx";
import Exercises from "../pages/teacher/Exercises.jsx";
import Students from "../pages/teacher/Students.jsx";
import StudentDetail from "../pages/teacher/StudentDetail.jsx";
import TeacherSettings from "../pages/teacher/Settings.jsx";
import TeacherClasses from "../pages/teacher/Classes.jsx";
import Gradebook from "../pages/teacher/Gradebook.jsx";
import TeacherQuizzes from "../pages/teacher/Quizzes.jsx";
import Calendar from "../pages/shared/Calendar.jsx";

// Student
import StudentClasses from "../pages/student/Classes.jsx";
import Curriculum from "../pages/student/Curriculum.jsx";
import LessonView from "../pages/student/LessonView.jsx";
import Homework from "../pages/student/Homework.jsx";
import Due from "../pages/student/Due.jsx";
import CodeExercise from "../pages/student/CodeExercise.jsx";
import QnA from "../pages/student/QnA.jsx";
import StudentSettings from "../pages/student/Settings.jsx";
import StudentProgress from "../pages/student/Progress.jsx";
import StudentQuizzes from "../pages/student/Quizzes.jsx";

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return (
      <Navigate
        to={
          user.role === "teacher" ? TEACHER_CLASSES_ROUTE : STUDENT_CLASSES_ROUTE
        }
        replace
      />
    );
  }
  return children;
}

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Login */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={
                  user.role === "teacher"
                    ? TEACHER_CLASSES_ROUTE
                    : STUDENT_CLASSES_ROUTE
                }
                replace
              />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate
                to={
                  user.role === "teacher"
                    ? TEACHER_CLASSES_ROUTE
                    : STUDENT_CLASSES_ROUTE
                }
                replace
              />
            ) : (
              <Register />
            )
          }
        />

        {/* ── Teacher routes ─────────────────────────────── */}
        <Route
          path={TEACHER_CLASSES_ROUTE}
          element={
            <ProtectedRoute role="teacher">
              <TeacherClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path={TEACHER_SETTINGS_ROUTE}
          element={
            <ProtectedRoute role="teacher">
              <TeacherSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/:classId"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassScopeLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="lessons" element={<LessonEditor />} />
          <Route path="lessons/:id" element={<LessonEditor />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="submissions" element={<Submissions />} />
          <Route path="exercises" element={<Exercises />} />
          <Route path="qna/:lessonId" element={<QnA />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="gradebook" element={<Gradebook />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>

        {/* ── Student routes ─────────────────────────────── */}
        <Route
          path={STUDENT_CLASSES_ROUTE}
          element={
            <ProtectedRoute role="student">
              <StudentClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path={STUDENT_SETTINGS_ROUTE}
          element={
            <ProtectedRoute role="student">
              <StudentSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/:classId"
          element={
            <ProtectedRoute role="student">
              <StudentClassScopeLayout />
            </ProtectedRoute>
          }
        >
          <Route path="curriculum" element={<Curriculum />} />
          <Route path="lessons/:id" element={<LessonView />} />
          <Route path="homework" element={<Homework />} />
          <Route path="due" element={<Due />} />
          <Route path="exercises/:id" element={<CodeExercise />} />
          <Route path="qna/:lessonId" element={<QnA />} />
          <Route path="progress" element={<StudentProgress />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>

        {/* Default redirect */}
        <Route
          path="*"
          element={
            user ? (
              <Navigate
                to={
                  user.role === "teacher"
                    ? TEACHER_CLASSES_ROUTE
                    : STUDENT_CLASSES_ROUTE
                }
                replace
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
