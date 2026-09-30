import { Link } from "react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/i18n";

export default function NotFound() {
  const { t, p } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="card-br w-full max-w-md p-8 text-center">
          <img
            src="/assets/mascot-320.webp"
            width={320}
            height={408}
            alt=""
            className="mx-auto h-auto w-28"
          />
          <p className="mt-4 font-display text-sm font-bold uppercase tracking-[0.2em] text-navy/70">
            404
          </p>
          <h1 className="mt-2 font-display text-3xl font-black text-navy">
            {p(t.notFound.title)}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-navy/70">{p(t.notFound.body)}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/" className="btn-pill-outline">
              {p(t.join.backHome)}
            </Link>
            <Link to="/book" className="btn-pill-primary">
              {p(t.nav.book)}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
