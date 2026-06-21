import { useEffect } from "react";
import { toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";

/**
 * Dismisses any visible toast as soon as the user clicks (or taps) anywhere on the page.
 * Mounted once at the application root.
 */
export function ToastAutoDismiss() {
  const { dismiss } = useToast();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try { sonnerToast.dismiss(); } catch { /* ignore */ }
      try { dismiss(); } catch { /* ignore */ }
    };
    window.addEventListener("pointerdown", handler, true);
    return () => window.removeEventListener("pointerdown", handler, true);
  }, [dismiss]);
  return null;
}

