/**
 * Cloudflare Web Analytics: page views and load speed, no cookies, nothing personal.
 * Off until VITE_CF_ANALYTICS_TOKEN is set (Cloudflare → Analytics & Logs → Web Analytics).
 * Loaded when the browser is idle so it never slows the first paint.
 */
export function startAnalytics() {
  const token = import.meta.env.VITE_CF_ANALYTICS_TOKEN;
  if (!token || !import.meta.env.PROD) return;
  const load = () => {
    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://static.cloudflareinsights.com/beacon.min.js";
    script.dataset.cfBeacon = JSON.stringify({ token, spa: true });
    document.head.appendChild(script);
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 5000 });
  else setTimeout(load, 3000);
}
