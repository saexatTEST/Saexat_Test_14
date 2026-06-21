import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  title: string;
  message: string;
  cancelLabel: string;
  discardLabel: string;
};

/**
 * Animated, brand-aware "are you sure you want to close?" overlay.
 * Renders ON TOP of the parent dialog (z-[120]) so it doesn't fight
 * Radix's Dialog focus trap.
 */
export function UnsavedCloseWarning({
  open,
  onCancel,
  onDiscard,
  title,
  message,
  cancelLabel,
  discardLabel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[2147483000] flex items-center justify-center px-4 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
        >
          {/* dark scrim */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: 'spring', stiffness: 320, damping: 22 },
            }}
            exit={{ opacity: 0, scale: 0.9, y: 12, transition: { duration: 0.15 } }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/40 bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
          >
            {/* glowing top accent */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-500/30 via-amber-400/10 to-transparent"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/40 blur-3xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.7, 0.45] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative px-6 pt-6 pb-3">
              <div className="flex items-start gap-4">
                <motion.div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/40"
                  initial={{ rotate: -12, scale: 0.8 }}
                  animate={{
                    rotate: [0, -8, 8, -6, 6, 0],
                    scale: 1,
                  }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                >
                  <AlertTriangle className="h-6 w-6" />
                </motion.div>
                <div className="min-w-0 flex-1 pt-1">
                  <h2 className="font-display text-xl font-black tracking-tight text-foreground">
                    {title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {message}
                  </p>
                </div>
                <button
                  onClick={onCancel}
                  aria-label="Close"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground transition hover:border-foreground/40 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-end gap-2 border-t border-border/60 bg-background/60 px-6 py-4 backdrop-blur">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="gap-1.5 rounded-xl"
              >
                <Save className="h-3.5 w-3.5" /> {cancelLabel}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDiscard}
                className="gap-1.5 rounded-xl shadow-md shadow-destructive/30"
              >
                <X className="h-3.5 w-3.5" /> {discardLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
