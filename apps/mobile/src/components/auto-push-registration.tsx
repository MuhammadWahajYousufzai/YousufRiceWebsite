import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { registerMobilePushTargetIfAllowed } from "@/lib/mobile-notifications";

export function AutoPushRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    registerMobilePushTargetIfAllowed().catch(() => {
      // Manual enable on the Account screen surfaces actionable setup errors.
    });
  }, [user?.$id]);

  return null;
}
