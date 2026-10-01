import { Link } from "react-router";
import { useI18n } from "@/i18n";

export function Footer() {
  const { t, p } = useI18n();
  return (
    <footer className="border-t-2 border-navy bg-navy text-paper">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
          <div>
            <div className="inline-block rounded-3xl bg-white px-5 py-3">
              <img
                src="/assets/wordmark.webp"
                width={239}
                height={96}
                loading="lazy"
                alt="Be Right"
                className="h-12 w-auto"
              />
            </div>
            <p className="mt-5 font-display text-2xl font-extrabold">
              {p(t.footer.tagline)}
            </p>
            <p className="mt-2 max-w-md text-sm text-paper/70">
              {p(t.footer.contactSoon)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/book" className="btn-pill-primary">
              {p(t.nav.book)}
            </Link>
            <Link to="/requests" className="btn-pill-white border-white">
              {p(t.nav.myRequests)}
            </Link>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-paper/20 pt-6 text-xs text-paper/60 sm:flex-row sm:items-center sm:justify-between">
          <span>{p(t.footer.rights)}</span>
          <nav aria-label={p(t.legal.footerLinks)} className="flex gap-4">
            <Link to="/terms" className="underline underline-offset-4 hover:text-paper">
              {p(t.legal.terms)}
            </Link>
            <Link to="/privacy" className="underline underline-offset-4 hover:text-paper">
              {p(t.legal.privacy)}
            </Link>
          </nav>
          <span className="font-display uppercase tracking-[0.2em]">
            {p(t.hero.kicker)}
          </span>
        </div>
      </div>
    </footer>
  );
}
