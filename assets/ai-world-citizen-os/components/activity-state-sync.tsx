"use client";

import { useEffect } from "react";
import { syncActivityStateQueue } from "@/lib/supabase/activity-state";

export function ActivityStateSync() {
  useEffect(() => {
    const sync = () => {
      void syncActivityStateQueue();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") sync();
    };

    sync();
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
