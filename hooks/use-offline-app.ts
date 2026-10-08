"use client";

import { useEffect } from "react";

export function useOfflineApp() {
  useEffect(() => {
    // Never cache development bundles or install a worker on a dev origin.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let disposed = false;
    void navigator.serviceWorker.register("/sw.js").then(async () => {
      const registration = await navigator.serviceWorker.ready;
      if (disposed) return;
      // The first page loaded before the worker took control. Warm its
      // already-used static files as well, so a later offline reload works.
      const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
      registration.active?.postMessage({ type: "warm", urls });
    }).catch(() => { /* Dictation and reading still work if registration is blocked. */ });
    return () => { disposed = true; };
  }, []);
}
