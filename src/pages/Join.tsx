import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useI18n } from "@/i18n";
import { trpc } from "@/providers/trpc";
import { CATEGORIES } from "@contracts/services";

export default function Join() {
  const { t, p } = useI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [trade, setTrade] = useState("");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submitMutation = trpc.join.submit.useMutation();

  const valid =
    name.trim().length >= 2 &&
    phone.trim().length >= 6 &&
    trade !== "" &&
    area.trim().length >= 2;

  async function submit() {
    setError("");
    try {
      await submitMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim(),
        trade,
        area: area.trim(),
        notes: notes.trim() || undefined,
      });
      setDone(true);
    } catch {
      setError(p(t.misc.error));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex-1 pt-16">
        <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
          {done ? (
            <div className="card-br p-8 text-center sm:p-12">
              <CheckCircle2 className="mx-auto h-14 w-14 text-flame" />
              <h1 className="mt-6 font-display text-3xl font-black tracking-tight text-navy sm:text-4xl">
                {p(t.join.successTitle)}
              </h1>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-navy/70">
                {p(t.join.successBody)}
              </p>
              <Link to="/" className="btn-pill-primary mt-8">
                {p(t.join.backHome)}
                <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
              </Link>
            </div>
          ) : (
            <>
              <span className="tech-label text-flame-ink">{p(t.join.kicker)}</span>
              <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-navy sm:text-5xl">
                {p(t.join.title)}
              </h1>
              <p className="mt-4 max-w-lg leading-relaxed text-navy/70">
                {p(t.join.sub)}
              </p>

              <div className="card-br mt-8 flex flex-col gap-6 p-6 sm:p-8">
                <div>
                  <label className="font-display text-base font-extrabold text-navy">
                    {p(t.join.name)}
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={p(t.join.namePh)}
                    className="mt-2 min-h-12 w-full rounded-2xl border-2 border-navy/30 bg-white px-4 font-semibold text-navy placeholder:font-normal placeholder:text-navy/40 focus:border-flame focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-display text-base font-extrabold text-navy">
                    {p(t.join.phone)}
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+961 70 000 000"
                    dir="ltr"
                    className="mt-2 min-h-12 w-full rounded-2xl border-2 border-navy/30 bg-white px-4 font-semibold text-navy placeholder:font-normal placeholder:text-navy/40 focus:border-flame focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-display text-base font-extrabold text-navy">
                    {p(t.join.trade)}
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTrade(c.id)}
                        className={`flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-start text-sm font-bold transition-colors ${
                          trade === c.id
                            ? "border-navy bg-navy text-paper"
                            : "border-navy/30 bg-white text-navy hover:border-navy"
                        }`}
                      >
                        <ServiceIcon
                          id={c.id}
                          className={`h-5 w-5 shrink-0 ${trade === c.id ? "text-flame" : "text-bird"}`}
                        />
                        {p(c.name)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-display text-base font-extrabold text-navy">
                    {p(t.join.area)}
                  </label>
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={p(t.join.areaPh)}
                    className="mt-2 min-h-12 w-full rounded-2xl border-2 border-navy/30 bg-white px-4 font-semibold text-navy placeholder:font-normal placeholder:text-navy/40 focus:border-flame focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-display text-base font-extrabold text-navy">
                    {p(t.join.notes)}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={p(t.join.notesPh)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border-2 border-navy/30 bg-white px-4 py-3 font-semibold text-navy placeholder:font-normal placeholder:text-navy/40 focus:border-flame focus:outline-none"
                  />
                </div>

                {error && (
                  <p className="rounded-xl border-2 border-flame bg-flame/10 px-4 py-2 text-sm font-semibold text-flame-dark">
                    {error}
                  </p>
                )}

                <button
                  onClick={submit}
                  disabled={!valid || submitMutation.isPending}
                  className="btn-pill-primary w-full justify-center text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitMutation.isPending
                    ? p(t.join.sending)
                    : p(t.join.submit)}
                  <ArrowRight className="h-5 w-5 rtl:-scale-x-100" />
                </button>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
