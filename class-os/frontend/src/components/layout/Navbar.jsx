import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useClass } from "../../context/ClassContext.jsx";
import AppLogoMark from "../branding/AppLogoMark.jsx";
import { NAV_ICONS, SidebarToggleIcon } from "../../utils/icons/navIcons.jsx";
import { SPRING_SNAPPY as SPRING } from "../../utils/motionSprings.js";

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
  const icon = NAV_ICONS[label];

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
