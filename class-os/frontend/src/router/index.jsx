import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import TeacherClassGate from "../components/teacher/TeacherClassGate.jsx";

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
          user.role === "teacher" ? "/teacher/classes" : "/student/curriculum"
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
                    ? "/teacher/classes"
                    : "/student/curriculum"
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
                    ? "/teacher/classes"
                    : "/student/curriculum"
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
          path="/teacher/classes"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/settings"
          element={
            <ProtectedRoute role="teacher">
              <TeacherSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <TeacherDashboard />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/lessons"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <LessonEditor />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/lessons/:id"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <LessonEditor />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/assignments"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <Assignments />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/submissions"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <Submissions />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/exercises"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <Exercises />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/qna/:lessonId"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <QnA />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <Students />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/students/:id"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <StudentDetail />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/gradebook"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <Gradebook />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/quizzes"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <TeacherQuizzes />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/calendar"
          element={
            <ProtectedRoute role="teacher">
              <TeacherClassGate>
                <Calendar />
              </TeacherClassGate>
            </ProtectedRoute>
          }
        />

        {/* ── Student routes ─────────────────────────────── */}
        <Route
          path="/student/classes"
          element={
            <ProtectedRoute role="student">
              <StudentClasses />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/curriculum"
          element={
            <ProtectedRoute role="student">
              <Curriculum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/lessons/:id"
          element={
            <ProtectedRoute role="student">
              <LessonView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/homework"
          element={
            <ProtectedRoute role="student">
              <Homework />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/due"
          element={
            <ProtectedRoute role="student">
              <Due />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/exercises/:id"
          element={
            <ProtectedRoute role="student">
              <CodeExercise />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/qna/:lessonId"
          element={
            <ProtectedRoute role="student">
              <QnA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/settings"
          element={
            <ProtectedRoute role="student">
              <StudentSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/progress"
          element={
            <ProtectedRoute role="student">
              <StudentProgress />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/quizzes"
          element={
            <ProtectedRoute role="student">
              <StudentQuizzes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/calendar"
          element={
            <ProtectedRoute role="student">
              <Calendar />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route
          path="*"
          element={
            user ? (
              <Navigate
                to={
                  user.role === "teacher"
                    ? "/teacher/classes"
                    : "/student/curriculum"
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
