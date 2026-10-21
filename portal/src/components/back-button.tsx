"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The portal sends "Referrer-Policy: no-referrer", so the browser can't tell a
// page where the user came from. NavTracker remembers the previous in-app page
// for this tab (sessionStorage) so Back buttons can decide what to do.
const CUR = "nav:cur";
const PREV = "nav:prev";

export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const here = window.location.pathname + window.location.search;
      const cur = sessionStorage.getItem(CUR);
      if (cur !== here) {
        if (cur) sessionStorage.setItem(PREV, cur);
        sessionStorage.setItem(CUR, here);
      }
    } catch { /* storage unavailable: Back falls back to its default page */ }
  }, [pathname]);
  return null;
}

// Goes to the previous page. If there isn't one in this tab (e.g. opened from a
// QR scan), or the previous page was the sign-in flow, it opens `fallback`.
export function BackButton({ fallback, className, children }: { fallback: string; className?: string; children: React.ReactNode }) {
  function goBack() {
    let prev: string | null = null;
    try { prev = sessionStorage.getItem(PREV); } catch { /* ignore */ }
    const usable = !!prev && !/^\/(?:login|auth)(?:[/?]|$)/.test(prev) && window.history.length > 1;
    if (usable) window.history.back();
    else window.location.assign(fallback);
  }
  return <button type="button" className={className} onClick={goBack}>{children}</button>;
}
