import { ReactNode } from "react";
import { Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Wraps <Routes> so each top-level page mount/unmount animates.
 * Children must be <Route> elements (same as a normal <Routes>).
 */
export function AnimatedRoutes({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="h-full w-full"
      >
        <Routes location={location}>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  );
}