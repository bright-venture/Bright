import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** OpenStreetMap tiles: free, no API key; attribution is required by their terms. */
export function addBaseTiles(map: L.Map) {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

/** Brand-coloured pins drawn with HTML, so no marker image files are needed. */
export function pinIcon(kind: "home" | "tech", label?: string) {
  const color = kind === "home" ? "#C94407" : "#0B63CE";
  const inner =
    kind === "home"
      ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>`
      : `<span style="color:#fff;font:700 12px/1 Arial">${label ?? ""}</span>`;
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="width:34px;height:34px;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(12,43,92,.45);display:flex;align-items:center;justify-content:center">${inner}</div>`,
  });
}

export { L };
