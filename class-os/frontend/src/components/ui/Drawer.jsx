import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Right-side overlay drawer. Locks body scroll while open; Escape and backdrop close.
 */
export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  tone = 'default',
  bodyClassName = 'overflow-y-auto',
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const headerTone =
    tone === 'indigo'
      ? 'border-indigo-100 bg-indigo-50/90'
      : tone === 'amber'
        ? 'border-amber-100 bg-amber-50/90'
        : 'border-gray-200 bg-gray-50';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-[101] flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col bg-white shadow-2xl sm:max-w-lg"
          >
            <div className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 ${headerTone}`}>
              <div className="min-w-0 pr-2">
                <h2 id="drawer-title" className="font-semibold text-gray-900">
                  {title}
                </h2>
                {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-black/5 hover:text-gray-800"
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
            <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
