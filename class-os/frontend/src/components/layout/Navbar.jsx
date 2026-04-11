import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import AppLogoMark from "../branding/AppLogoMark.jsx";

// ─── Spring configs ───────────────────────────────────────────────────────────
const SPRING = { type: "spring", stiffness: 380, damping: 30 };

// ─── Nav icons ────────────────────────────────────────────────────────────────
const ICONS = {
  Dashboard: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="9"
        y="1"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="1"
        y="9"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  ),
  Lessons: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 3h12M2 6h8M2 9h10M2 12h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  Assignments: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="1"
        width="12"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 5h6M5 8h6M5 11h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  Submissions: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 10V2M4 6l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12h12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  Gradebook: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12l3-4 3 2 3-5 3 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  ),
  Quizzes: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M6 6.5c0-1.1.9-2 2-2s2 .9 2 2c0 1-1 1.5-2 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.5" r=".75" fill="currentColor" />
    </svg>
  ),
  Exercises: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="3"
        width="14"
        height="10"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 7l2 2 4-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Students: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11 7.5a2 2 0 0 0 0-4M15 13c0-2.2-1.79-4-4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  Classes: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 1L1 5l7 4 7-4-7-4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M1 11l7 4 7-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M1 8l7 4 7-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Settings: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M2.93 2.93l1.06 1.06M12.01 12.01l1.06 1.06M2.93 13.07l1.06-1.06M12.01 3.99l1.06-1.06"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  Curriculum: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="1"
        width="9"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 4h3M5 7h3M5 10h1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="4"
        width="9"
        height="11"
        rx="1.5"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M8 7h3M8 10h3M8 13h1.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  Due: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="3"
        width="12"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 1v3M11 1v3M2 7h12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11" r="1.5" fill="currentColor" />
    </svg>
  ),
  Homework: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 2h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Progress: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 4v4l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  Calendar: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="3"
        width="12"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 1v3M11 1v3M2 7h12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M5 10h2M9 10h2M5 13h2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
};

// ─── Nav definitions ──────────────────────────────────────────────────────────
const teacherLinks = (classReady) => [
  ...(classReady
    ? [
        { to: "/teacher/dashboard", label: "Dashboard" },
        { to: "/teacher/lessons", label: "Lessons" },
        { to: "/teacher/assignments", label: "Assignments" },
        { to: "/teacher/submissions", label: "Submissions" },
        { to: "/teacher/gradebook", label: "Gradebook" },
        { to: "/teacher/quizzes", label: "Quizzes" },
        { to: "/teacher/exercises", label: "Exercises" },
        { to: "/teacher/students", label: "Students" },
        { to: "/teacher/calendar", label: "Calendar" },
      ]
    : []),
  { to: "/teacher/classes", label: "Classes" },
  { to: "/teacher/settings", label: "Settings" },
];

const studentLinks = [
  { to: "/student/classes", label: "Classes" },
  { to: "/student/curriculum", label: "Curriculum" },
  { to: "/student/due", label: "Due" },
  { to: "/student/homework", label: "Homework" },
  { to: "/student/quizzes", label: "Quizzes" },
  { to: "/student/calendar", label: "Calendar" },
  { to: "/student/progress", label: "Progress" },
  { to: "/student/settings", label: "Settings" },
];

function SidebarToggleIcon({ direction }) {
  const inward = direction === "collapse";
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={inward ? "M10 3l-4 5 4 5" : "M6 3l4 5-4 5"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Navbar({
  sidebarCollapsed = false,
  onToggleSidebarCollapsed,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const { classes, activeClassId } = useClass();
  const shouldReduceMotion = useReducedMotion();

  const isTeacher = user?.role === "teacher";
  const classReady = isTeacher && Boolean(activeClassId) && classes.length > 0;
  const links = isTeacher ? teacherLinks(classReady) : studentLinks;

  const mainLinks = links.filter((l) => !l.to.endsWith("/settings"));
  const settingsLink = links.find((l) => l.to.endsWith("/settings"));
  const layoutSuffix = sidebarCollapsed ? "-rail" : "";

  const displayName =
    (user?.name && String(user.name).trim()) ||
    (user?.email && user.email.split("@")[0]) ||
    "User";
  const displayEmail = (user?.email && String(user.email).trim()) || "";
  const initialLetter = displayName.charAt(0).toUpperCase() || "?";

  return (
    <aside
      className="flex h-full min-h-0 w-full min-w-0 flex-col bg-white border-r border-gray-100"
      style={{ boxShadow: "1px 0 0 #f3f4f6" }}
    >
      {/* ── Logo + collapse toggle (desktop only when handler provided) ── */}
      <div
        className={`pt-4 pb-3 flex items-center gap-2 ${
          sidebarCollapsed ? "flex-col px-2" : "px-4 justify-between"
        }`}
      >
        <Link
          to={isTeacher ? "/teacher/classes" : "/student/curriculum"}
          className={`flex items-center group ${sidebarCollapsed ? "flex-col justify-center" : "gap-2.5 min-w-0 flex-1"}`}
          title={sidebarCollapsed ? "Class OS" : undefined}
        >
          <motion.div
            whileHover={shouldReduceMotion ? {} : { scale: 1.06 }}
            transition={SPRING}
            className="shrink-0 flex items-center justify-center"
          >
            <AppLogoMark height={sidebarCollapsed ? 32 : 36} />
          </motion.div>
          {!sidebarCollapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-[14px] font-semibold text-gray-900 tracking-tight">
                Class OS
              </div>
              <div
                className={`text-[10px] font-medium uppercase tracking-widest ${isTeacher ? "text-brand-500" : "text-green-500"}`}
              >
                {isTeacher ? "Teacher" : "Student"}
              </div>
            </div>
          )}
        </Link>
        {onToggleSidebarCollapsed && (
          <motion.button
            type="button"
            onClick={onToggleSidebarCollapsed}
            whileHover={shouldReduceMotion ? {} : { scale: 1.04 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            transition={SPRING}
            className={`shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 ${
              sidebarCollapsed ? "mt-1" : ""
            }`}
            aria-expanded={!sidebarCollapsed}
            aria-controls="app-sidebar-nav"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            <SidebarToggleIcon
              direction={sidebarCollapsed ? "expand" : "collapse"}
            />
          </motion.button>
        )}
      </div>

      {/* ── Divider ─────────────────────────────────────────── */}
      <div
        className={`mb-2 h-px bg-gray-100 ${sidebarCollapsed ? "mx-2" : "mx-3"}`}
      />

      {/* ── Main nav links ──────────────────────────────────── */}
      <nav
        id="app-sidebar-nav"
        className={`flex-1 overflow-y-auto py-1 space-y-0.5 ${sidebarCollapsed ? "px-1.5" : "px-2"}`}
        aria-label="Main navigation"
      >
        {mainLinks.map((link) => (
          <SidebarLink
            key={link.to}
            to={link.to}
            label={link.label}
            pathname={location.pathname}
            shouldReduceMotion={shouldReduceMotion}
            sidebarCollapsed={sidebarCollapsed}
            layoutSuffix={layoutSuffix}
          />
        ))}
      </nav>

      {/* ── Bottom: settings + user chip ─────────────────────── */}
      <div
        className={`pb-4 space-y-0.5 ${sidebarCollapsed ? "px-1.5" : "px-2"}`}
      >
        <div
          className={`mb-2 h-px bg-gray-100 ${sidebarCollapsed ? "mx-1" : "mx-1"}`}
        />

        {settingsLink && (
          <SidebarLink
            to={settingsLink.to}
            label={settingsLink.label}
            pathname={location.pathname}
            shouldReduceMotion={shouldReduceMotion}
            sidebarCollapsed={sidebarCollapsed}
            layoutSuffix={layoutSuffix}
          />
        )}

        {/* User chip */}
        {user && (
          <div
            className={`mt-2 mx-1 flex min-w-0 items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 py-2 ${
              sidebarCollapsed ? "px-1" : "px-2"
            }`}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
              title={[displayName, displayEmail].filter(Boolean).join("\n")}
            >
              {initialLetter}
            </div>
            {sidebarCollapsed ? (
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[11px] font-medium leading-tight text-gray-800">
                  {displayName}
                </div>
                {displayEmail && (
                  <div className="truncate text-[10px] leading-tight text-gray-400">
                    {displayEmail}
                  </div>
                )}
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-gray-800">
                  {displayName}
                </div>
                {displayEmail ? (
                  <div className="truncate text-[10px] text-gray-400">
                    {displayEmail}
                  </div>
                ) : (
                  <div className="truncate text-[10px] text-gray-400">
                    No email on file
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── SidebarLink ──────────────────────────────────────────────────────────────
function SidebarLink({
  to,
  label,
  pathname,
  shouldReduceMotion,
  sidebarCollapsed,
  layoutSuffix = "",
}) {
  const isActive = pathname === to || pathname.startsWith(to + "/");
  const icon = ICONS[label];

  return (
    <Link
      to={to}
      title={sidebarCollapsed ? label : undefined}
      aria-label={sidebarCollapsed ? label : undefined}
      className={`relative flex items-center rounded-lg text-[13px] font-medium transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 ${
        sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2"
      } ${
        isActive
          ? "text-brand-700"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
      }`}
    >
      {/* Animated active background pill */}
      {isActive && (
        <motion.span
          layoutId={`sidebar-active-pill${layoutSuffix}`}
          className="absolute inset-0 rounded-lg bg-brand-50 border border-brand-100"
          transition={shouldReduceMotion ? { duration: 0 } : SPRING}
        />
      )}

      {/* Active accent bar on left edge */}
      {isActive && (
        <motion.span
          layoutId={`sidebar-active-bar${layoutSuffix}`}
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-600"
          transition={shouldReduceMotion ? { duration: 0 } : SPRING}
        />
      )}

      <span
        className={`relative z-10 shrink-0 ${isActive ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600"}`}
      >
        {icon}
      </span>
      {!sidebarCollapsed && <span className="relative z-10">{label}</span>}
    </Link>
  );
}
