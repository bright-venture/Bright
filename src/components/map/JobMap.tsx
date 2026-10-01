import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n";
import { addBaseTiles, L, pinIcon } from "./leafletBase";

type Point = { lat: number; lng: number };

/**
 * The visit address (orange house pin) and, when shared, the technician's live
 * position (blue pin). Fits both in view and follows updates.
 */
export default function JobMap({
  home,
  technician,
  technicianLabel,
  className = "h-56 w-full sm:h-64",
}: {
  home: Point | null;
  technician?: Point | null;
  /** Initials shown on the technician pin. */
  technicianLabel?: string;
  className?: string;
}) {
  const { t, p } = useI18n();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false });
    addBaseTiles(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  const homeKey = home ? `${home.lat},${home.lng}` : "";
  const techKey = technician ? `${technician.lat},${technician.lng}` : "";

  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const points: L.LatLngExpression[] = [];
    if (home) {
      L.marker([home.lat, home.lng], { icon: pinIcon("home"), title: p(t.map.home) }).addTo(g);
      points.push([home.lat, home.lng]);
    }
    if (technician) {
      L.marker([technician.lat, technician.lng], {
        icon: pinIcon("tech", technicianLabel),
        title: p(t.map.technician),
      }).addTo(g);
      points.push([technician.lat, technician.lng]);
    }
    if (points.length === 1) m.setView(points[0], 16);
    else if (points.length > 1) m.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeKey, techKey, technicianLabel]);

  return (
    <div
      ref={el}
      role="img"
      aria-label={p(t.map.jobMapLabel)}
      className={`overflow-hidden rounded-2xl border-2 border-navy/20 ${className}`}
    />
  );
}
