import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServiceIcon } from "@/components/ServiceIcon";
import { MediaGrid } from "@/components/MediaGrid";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  CATEGORY_MAP,
  URGENCY_META,
  type RequestStatus,
  type UrgencyLevel,
} from "@contracts/services";

const URGENCY_DOT: Record<UrgencyLevel, string> = {
  normal: "bg-navy/30",
  priority: "bg-bird",
  urgent: "bg-flame",
  critical: "bg-red-700",
};

export default function Dashboard() {
  const { t, p } = useI18n();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<"queue" | "applications">("queue");
  const [selected, setSelected] = useState<number | null>(null);
  const [urgency, setUrgency] = useState<UrgencyLevel>("normal");
  const [amount, setAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [note, setNote] = useState("");

  const isAdmin = user?.role === "admin";
  const queue = trpc.admin.queue.useQuery(undefined, { enabled: isAdmin });
  const detail = trpc.admin.detail.useQuery(
    { id: selected! },
    { enabled: isAdmin && selected !== null },
  );

  const invalidate = () => {
    utils.admin.queue.invalidate();
    utils.admin.detail.invalidate();
  };
  const startReview = trpc.admin.startReview.useMutation({ onSuccess: invalidate });
  const sendQuote = trpc.admin.sendQuote.useMutation({
    onSuccess: () => {
      invalidate();
      setAmount("");
      setQuoteNote("");
    },
  });
  const setStatus = trpc.admin.setStatus.useMutation({
    onSuccess: () => {
      invalidate();
      setNote("");
    },
  });
  const techList = trpc.tech.list.useQuery(undefined, { enabled: isAdmin });
  const addTech = trpc.tech.addByEmail.useMutation({
    onSuccess: () => {
      utils.tech.list.invalidate();
      setTechEmail("");
    },
  });
  const assign = trpc.tech.assign.useMutation({ onSuccess: invalidate });
  const [techEmail, setTechEmail] = useState("");
  const [chosenTech, setChosenTech] = useState("");

  const applications = trpc.join.list.useQuery(undefined, {
    enabled: isAdmin && tab === "applications",
  });
  const setAppStatus = trpc.join.setStatus.useMutation({
    onSuccess: () => utils.join.list.invalidate(),
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  /* ---------- access gate ---------- */
  if (isAuthenticated && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 pt-16">
          <div className="card-br max-w-md p-8 text-center">
            <h1 className="font-display text-2xl font-black text-navy">
              {p(t.dash.title)}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-navy/70">
              {p(t.dash.notAdmin)}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const rows = queue.data ?? [];
  const d = detail.data;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-24 sm:px-6">
        <h1 className="font-display text-3xl font-black text-navy sm:text-4xl">
          {p(t.dash.title)}
        </h1>

        <div className="mt-6 inline-flex rounded-full border-2 border-navy bg-white p-1">
          {(["queue", "applications"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`min-h-10 rounded-full px-5 text-sm font-bold transition-colors ${
                tab === k ? "bg-navy text-paper" : "text-navy/60 hover:text-navy"
              }`}
            >
              {k === "queue" ? p(t.dash3.tabQueue) : p(t.dash3.tabApplications)}
            </button>
          ))}
        </div>

        {tab === "applications" && (
          <div className="mt-8 flex flex-col gap-3">
            {(applications.data ?? []).length === 0 && !applications.isLoading && (
              <div className="card-br p-10 text-center font-semibold text-navy/60">
                {p(t.dash3.noApplications)}
              </div>
            )}
            {(applications.data ?? []).map((a) => (
              <div key={a.id} className="card-br flex flex-wrap items-center gap-4 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-navy/15 bg-paper text-bird">
                  <ServiceIcon id={a.trade} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-extrabold text-navy">
                    {a.name}{" "}
                    <span className="font-normal text-navy/50">
                      · {CATEGORY_MAP[a.trade] ? p(CATEGORY_MAP[a.trade].name) : a.trade}
                    </span>
                  </p>
                  <p className="text-xs text-navy/60">
                    <span dir="ltr">{a.phone}</span> · {a.area}
                  </p>
                  {a.notes && (
                    <p className="mt-1 line-clamp-2 text-xs text-navy/70">{a.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(["new", "contacted", "hired", "rejected"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setAppStatus.mutate({ id: a.id, status: s })}
                      disabled={setAppStatus.isPending}
                      className={`min-h-9 rounded-full border-2 px-3 text-[11px] font-bold transition-colors ${
                        a.status === s
                          ? s === "rejected"
                            ? "border-flame bg-flame text-white"
                            : "border-navy bg-navy text-paper"
                          : "border-navy/25 text-navy/60 hover:border-navy hover:text-navy"
                      }`}
                    >
                      {p(t.dash3[s])}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "queue" && rows.length === 0 && !queue.isLoading && (
          <div className="card-br mt-10 p-10 text-center font-semibold text-navy/60">
            {p(t.dash.empty)}
          </div>
        )}

        <div className={`mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr] ${tab === "queue" ? "" : "hidden"}`}>
          {/* queue */}
          <div className="flex flex-col gap-3">
            {rows.map(({ request: r, customerName, customerEmail }) => {
              const level = (r.urgencyFinal ?? r.urgencySuggested) as UrgencyLevel;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelected(r.id);
                    setUrgency(level);
                  }}
                  className={`card-br flex min-h-16 items-center gap-3 p-4 text-start transition-all hover:-translate-y-0.5 ${
                    selected === r.id ? "!border-flame !bg-flame/5" : ""
                  }`}
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${URGENCY_DOT[level]}`}
                    title={p(URGENCY_META[level].label)}
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-navy/15 bg-paper text-bird">
                    <ServiceIcon id={r.category} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-extrabold text-navy">
                      #{r.id} · {CATEGORY_MAP[r.category] ? p(CATEGORY_MAP[r.category].name) : r.category}
                    </span>
                    <span className="block truncate text-xs text-navy/60">
                      {customerName ?? customerEmail ?? "—"} · {r.area} · {r.preferredDate}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border-2 border-navy/25 px-2.5 py-0.5 text-[11px] font-bold text-navy">
                    {p(t.status[r.status as RequestStatus])}
                  </span>
                </button>
              );
            })}
          </div>

          {/* detail */}
          {selected !== null && d && (
            <div className="card-br h-fit p-5 sm:p-6 animate-rise-in">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-black text-navy">
                  #{d.request.id} ·{" "}
                  {CATEGORY_MAP[d.request.category]
                    ? p(CATEGORY_MAP[d.request.category].name)
                    : d.request.category}
                </h2>
                <span className="rounded-full border-2 border-navy/25 px-3 py-1 text-xs font-bold text-navy">
                  {p(t.status[d.request.status as RequestStatus])}
                </span>
              </div>

              <div className="mt-4 rounded-2xl border-2 border-navy/15 bg-paper p-4 text-sm">
                <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                  {p(t.dash.customer)}
                </p>
                <p className="mt-2 font-bold text-navy">
                  {d.customer?.name ?? "—"}
                </p>
                <p className="text-navy/70">{d.customer?.email ?? ""}</p>
                <p className="mt-1 text-navy/70" dir="ltr">{d.request.phone}</p>
                <p className="mt-1 text-navy/70">
                  {d.request.area} — {d.request.address}
                </p>
                <p className="mt-1 text-navy/70">
                  {d.request.preferredDate} · {d.request.timeSlot}
                </p>
              </div>

              <div className="mt-4 text-sm">
                <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                  {p(t.dash.answers)}
                </p>
                <dl className="mt-2 flex flex-col gap-1.5">
                  {CATEGORY_MAP[d.request.category]?.questions.map((q) => {
                    const answers = JSON.parse(d.request.answers) as Record<string, string>;
                    const val = answers[q.id];
                    if (!val) return null;
                    const opt = q.options?.find((o) => o.value === val);
                    return (
                      <div key={q.id} className="flex justify-between gap-4">
                        <dt className="text-navy/60">{p(q.label)}</dt>
                        <dd className="text-end font-semibold text-navy">
                          {opt ? p(opt.label) : val}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
                {d.request.notes && (
                  <p className="mt-3 rounded-xl bg-navy/5 p-3 text-navy/80">
                    {d.request.notes}
                  </p>
                )}
              </div>

              {d.media.length > 0 && (
                <div className="mt-4">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                    {p(t.dash.media)}
                  </p>
                  <MediaGrid items={d.media} className="mt-2 grid grid-cols-4 gap-2" />
                </div>
              )}

              <div className="mt-4 rounded-2xl border-2 border-navy/15 bg-paper p-4 text-sm">
                <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                  {p(t.dash.suggested)}
                </p>
                <p className="mt-1 font-display text-base font-extrabold text-navy">
                  {p(URGENCY_META[d.request.urgencySuggested as UrgencyLevel].label)}
                </p>
              </div>

              {/* technician assignment */}
              {!["completed", "cancelled"].includes(d.request.status) && (
                <div className="mt-4 rounded-2xl border-2 border-navy/15 bg-paper p-4">
                  <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                    {p(t.dash2.currentTech)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-navy">
                    {techList.data?.find((x) => x.id === d.request.technicianId)
                      ?.name ??
                      (d.request.technicianId ? `#${d.request.technicianId}` : p(t.dash2.none))}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={chosenTech}
                      onChange={(e) => setChosenTech(e.target.value)}
                      className="min-h-12 rounded-2xl border-2 border-navy/30 bg-white px-4 text-sm font-semibold text-navy focus:border-flame focus:outline-none"
                    >
                      <option value="">{p(t.dash2.chooseTech)}</option>
                      {techList.data?.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name ?? x.email}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        assign.mutate({
                          requestId: d.request.id,
                          technicianId: Number(chosenTech),
                        })
                      }
                      disabled={!chosenTech || assign.isPending}
                      className="btn-pill-outline !min-h-12 !py-2 disabled:opacity-40"
                    >
                      {assign.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {p(t.dash2.assignTech)}
                    </button>
                  </div>
                  <div className="mt-3 border-t border-navy/10 pt-3">
                    <p className="text-xs text-navy/60">{p(t.dash2.addTechHint)}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        value={techEmail}
                        onChange={(e) => setTechEmail(e.target.value)}
                        placeholder={p(t.dash2.techEmail)}
                        type="email"
                        className="min-h-11 flex-1 rounded-2xl border-2 border-navy/30 bg-white px-4 text-sm font-semibold text-navy focus:border-flame focus:outline-none"
                      />
                      <button
                        onClick={() => addTech.mutate({ email: techEmail })}
                        disabled={!techEmail || addTech.isPending}
                        className="btn-pill-white !min-h-11 !py-2 text-xs disabled:opacity-40"
                      >
                        {p(t.dash2.addTech)}
                      </button>
                    </div>
                    {addTech.isError && (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        {addTech.error.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* actions per status */}
              <div className="mt-5 border-t-2 border-navy/10 pt-5">
                {d.request.status === "submitted" && (
                  <div className="flex flex-col gap-3">
                    <label className="font-display text-sm font-extrabold text-navy">
                      {p(t.dash.setUrgency)}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(URGENCY_META) as UrgencyLevel[]).map((u) => (
                        <button
                          key={u}
                          onClick={() => setUrgency(u)}
                          className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold ${
                            urgency === u
                              ? "border-navy bg-navy text-paper"
                              : "border-navy/30 bg-white text-navy"
                          }`}
                        >
                          {p(URGENCY_META[u].label)}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() =>
                        startReview.mutate({ id: d.request.id, urgency })
                      }
                      disabled={startReview.isPending}
                      className="btn-pill-primary mt-1"
                    >
                      {startReview.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {p(t.dash.review)}
                    </button>
                  </div>
                )}

                {d.request.status === "in_review" && (
                  <div className="flex flex-col gap-3">
                    <label className="font-display text-sm font-extrabold text-navy">
                      {p(t.dash.quoteAmount)}
                    </label>
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="decimal"
                      placeholder="45"
                      className="min-h-12 w-40 rounded-2xl border-2 border-navy/30 bg-white px-4 font-semibold text-navy focus:border-flame focus:outline-none"
                    />
                    <input
                      value={quoteNote}
                      onChange={(e) => setQuoteNote(e.target.value)}
                      placeholder={p(t.dash.quoteNote)}
                      className="min-h-12 rounded-2xl border-2 border-navy/30 bg-white px-4 font-semibold text-navy focus:border-flame focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        sendQuote.mutate({
                          id: d.request.id,
                          amount,
                          note: quoteNote || undefined,
                        })
                      }
                      disabled={!amount || sendQuote.isPending}
                      className="btn-pill-primary disabled:opacity-40"
                    >
                      {sendQuote.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {p(t.dash.sendQuote)}
                    </button>
                  </div>
                )}

                {["approved", "scheduled", "in_progress"].includes(
                  d.request.status,
                ) && (
                  <div className="flex flex-col gap-3">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={p(t.dash.note)}
                      className="min-h-12 rounded-2xl border-2 border-navy/30 bg-white px-4 font-semibold text-navy focus:border-flame focus:outline-none"
                    />
                    <button
                      onClick={() =>
                        setStatus.mutate({
                          id: d.request.id,
                          status:
                            d.request.status === "approved"
                              ? "scheduled"
                              : d.request.status === "scheduled"
                                ? "in_progress"
                                : "completed",
                          note: note || undefined,
                        })
                      }
                      disabled={setStatus.isPending}
                      className="btn-pill-primary"
                    >
                      {setStatus.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {d.request.status === "approved"
                        ? p(t.dash.schedule)
                        : d.request.status === "scheduled"
                          ? p(t.dash.startWork)
                          : p(t.dash.complete)}
                    </button>
                  </div>
                )}
              </div>

              {/* event log */}
              <ol className="mt-5 flex flex-col gap-2 border-t-2 border-navy/10 pt-4 text-xs text-navy/60">
                {d.events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-3">
                    <span className="font-bold text-navy">
                      {p(
                        (t.events as Record<string, { en: string; ar: string }>)[e.status] ??
                          t.status[e.status as RequestStatus] ??
                          { en: e.status, ar: e.status },
                      )}
                      {e.note ? ` — ${e.note}` : ""}
                    </span>
                    <span dir="ltr">
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
