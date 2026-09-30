import { useI18n } from "@/i18n";

/** Navy band with a continuously scrolling brand tagline. */
export function Marquee() {
  const { p, t, dir } = useI18n();
  const text = p(t.marquee.text);
  const row = Array.from({ length: 6 }, () => text).join("");
  return (
    <div className="overflow-hidden border-y-2 border-navy bg-navy py-3" dir="ltr">
      <div
        className={`flex w-max whitespace-nowrap font-display text-lg font-extrabold uppercase tracking-[0.15em] text-paper ${
          dir === "rtl" ? "animate-marquee-rtl" : "animate-marquee"
        }`}
      >
        <span>{row}</span>
        <span>{row}</span>
      </div>
    </div>
  );
}
