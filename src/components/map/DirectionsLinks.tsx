import { Navigation } from "lucide-react";
import { useI18n } from "@/i18n";
import { directionsLinks } from "@contracts/geo";

/** One-tap navigation to the visit address in Google Maps or Waze. */
export function DirectionsLinks({ lat, lng }: { lat: number; lng: number }) {
  const { t, p } = useI18n();
  const links = directionsLinks(lat, lng);
  const cls = "btn-pill-outline !min-h-10 !px-4 !py-1.5 text-xs";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-navy">
        <Navigation className="h-4 w-4 text-bird" /> {p(t.map.directions)}
      </span>
      <a href={links.google} target="_blank" rel="noreferrer" className={cls}>
        {p(t.map.googleMaps)}
      </a>
      <a href={links.waze} target="_blank" rel="noreferrer" className={cls}>
        {p(t.map.waze)}
      </a>
    </div>
  );
}
