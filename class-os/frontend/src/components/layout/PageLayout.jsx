import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar.jsx";

/** Ref to the main column scroll container (not `document` — that’s where overflow-y-auto lives). */
const MainColumnScrollRefContext = createContext(null);
export function useMainColumnScrollRef() {
  return useContext(MainColumnScrollRefContext);
}

const SIDEBAR_COLLAPSED_KEY = "classos-sidebar-collapsed";

function readSidebarCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function PageLayout({
  children,
  title,
  actions,
  fullWidth,
  edgeToEdge,
  mainStickyHeader,
}) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] =
    useState(readSidebarCollapsed);
  const mainColumnScrollRef = useRef(null);

  const toggleDesktopSidebar = useCallback(() => {
    setDesktopSidebarCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Mobile: open menu ── */}
      <button
        type="button"
        className="touch-manipulation md:hidden fixed top-3 left-3 z-[100] flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* ── Mobile: nav drawer ── */}
      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 z-[90] cursor-default border-0 bg-black/40 p-0"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="md:hidden fixed inset-y-0 left-0 z-[95] flex max-w-[min(18rem,88vw)] flex-col border-r border-gray-100 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-end border-b border-gray-100 px-2 py-2">
              <button
                type="button"
                className="touch-manipulation rounded-lg p-2 text-gray-500 hover:bg-gray-50"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 4l10 10M14 4L4 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <Navbar sidebarCollapsed={false} />
            </div>
          </div>
        </>
      )}

      {/* ── Sidebar — desktop (block so Navbar fills width; collapsible rail) ── */}
      <div
        className={`relative z-20 hidden h-screen shrink-0 overflow-hidden transition-[width] duration-200 ease-out md:block md:sticky md:top-0 ${
          desktopSidebarCollapsed ? "w-[4.5rem]" : "w-56"
        }`}
      >
        <Navbar
          sidebarCollapsed={desktopSidebarCollapsed}
          onToggleSidebarCollapsed={toggleDesktopSidebar}
        />
      </div>

      {/* ── Main content area ── */}
      {edgeToEdge ? (
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
          <main className="w-full flex-1 min-h-0 flex flex-col p-0">
            {(title || actions) && (
              <div className="flex items-center justify-between mb-8">
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                )}
                {actions && <div className="flex gap-3">{actions}</div>}
              </div>
            )}
            {children}
          </main>
        </div>
      ) : (
        <MainColumnScrollRefContext.Provider value={mainColumnScrollRef}>
          <div
            ref={mainColumnScrollRef}
            className="flex min-h-0 flex-1 min-w-0 flex-col overflow-y-auto"
          >
            {mainStickyHeader}
            <main
              className={`min-h-0 flex-1 ${
                fullWidth
                  ? "w-full px-6 lg:px-10 py-8"
                  : "mx-auto max-w-6xl px-6 lg:px-10 py-8"
              }`}
            >
              {(title || actions) && (
                <div className="mb-8 flex items-center justify-between">
                  {title && (
                    <h1 className="text-2xl font-bold text-gray-900">
                      {title}
                    </h1>
                  )}
                  {actions && <div className="flex gap-3">{actions}</div>}
                </div>
              )}
              {children}
            </main>
          </div>
        </MainColumnScrollRefContext.Provider>
      )}
    </div>
  );
}
