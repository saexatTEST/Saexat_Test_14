import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";

/**
 * Binds the active language preference to the currently signed-in user.
 *
 * Each user (admin / director / manager / superuser) has their own stored
 * language under `sayohat-lang:<username>`. When they sign in, their saved
 * language is loaded and the app stays 100% in that language until THEY
 * change it — another user's choice can never override theirs.
 */
export function UserLanguageSync() {
  const { user } = useAuth();
  const { setUserScope } = useI18n();

  useEffect(() => {
    setUserScope(user?.username ?? null);
  }, [user?.username, setUserScope]);

  return null;
}
