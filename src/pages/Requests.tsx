import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, Loader2, MapPin } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServiceIcon } from "@/components/ServiceIcon";
import { MediaGrid } from "@/components/MediaGrid";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  CATEGORY_MAP,
  STATUS_ORDER,
  URGENCY_META,
  type RequestStatus,
  type UrgencyLevel,
} from "@contracts/services";

const STATUS_STYLE: Record<RequestStatus, string> = {
  submitted: "border-navy/40 bg-white text-navy",
  in_review: "border-bird bg-bird/10 text-bird",
  quote_ready: "border-flame bg-flame text-white",
  approved: "border-navy bg-navy text-paper",
  scheduled: "border-navy bg-navy text-paper",
  in_progress: "border-flame bg-flame/15 text-flame-dark",
  completed: "border-green-700 bg-green-700 text-white",
  cancelled: "border-navy/30 bg-navy/5 text-navy/50",
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const { t, p } = useI18n();
  return (
    <span
      className={`inline-block rounded-full border-2 px-3 py-1 text-xs font-bold ${STATUS_STYLE[status]}`}
    >
      {p(t.status[status])}
    </span>
  );
}

function TechnicianCard({
  name,
  location,
}: {
  name: string | null;
  location: { lat: string; lng: string; updatedAt: Date } | null;
}) {
  const { t, p } = useI18n();
  const lat = location ? Number(location.lat) : null;
  const lng = location ? Number(location.lng) : null;
  const hasFix = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
  return (
    <div className="mt-5 rounded-2xl border-2 border-bird bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-bird bg-bird/10 text-bird">
          <MapPin className="h-5 w-5" />
        </span>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
            {p(t.tracking.techOnWay)}
          </p>
          <p className="font-display text-base font-extrabold text-navy">
            {name ?? "Be Right"}
          </p>
        </div>
        {hasFix && (
          <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-bird px-3 py-1 text-xs font-bold text-white">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            {p(t.tracking.liveLocation)}
          </span>
        )}
      </div>
      {hasFix ? (
        <>
          <iframe
            title="Technician location"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.006},${lat! - 0.004},${lng! + 0.006},${lat! + 0.004}&layer=mapnik&marker=${lat},${lng}`}
            className="mt-3 h-56 w-full rounded-2xl border-2 border-navy/20"
            loading="lazy"
          />
          <p className="mt-2 text-xs text-navy/60">
            {p(t.tracking.lastUpdate)}:{" "}
            {new Date(location!.updatedAt).toLocaleTimeString()}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-navy/60">{p(t.tracking.noLocationYet)}</p>
      )}
    </div>
  );
}

export default function Requests() {
  const { t, p } = useI18n();
  const { isAuthenticated, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [openId, setOpenId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const list = trpc.requests.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const detail = trpc.requests.get.useQuery(
    { id: openId! },
    { enabled: openId !== null },
  );
  const approve = trpc.requests.approveQuote.useMutation({
    onSuccess: () => {
      utils.requests.mine.invalidate();
      utils.requests.get.invalidate();
    },
  });
  const cancel = trpc.requests.cancel.useMutation({
    onSuccess: () => {
      utils.requests.mine.invalidate();
      utils.requests.get.invalidate();
    },
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  const rows = list.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-24 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-black text-navy sm:text-4xl">
            {p(t.requests.title)}
          </h1>
          <Link to="/book" className="btn-pill-primary !px-5 !py-2">
            {p(t.nav.book)}
          </Link>
        </div>

        {rows.length === 0 && !list.isLoading && (
          <div className="card-br mt-10 p-10 text-center">
            <img src="/assets/mascot.png" alt="" className="mx-auto w-28" />
            <p className="mt-4 font-semibold text-navy/70">{p(t.requests.empty)}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4">
          {rows.map((r) => {
            const cat = CATEGORY_MAP[r.category];
            const open = openId === r.id;
            return (
              <div key={r.id} className="card-br overflow-hidden">
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="flex min-h-16 w-full items-center gap-4 p-4 text-start sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-navy/15 bg-paper text-bird">
                    <ServiceIcon id={r.category} className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-base font-extrabold text-navy">
                      {cat ? p(cat.name) : r.category}{" "}
                      <span className="text-xs font-bold text-navy/40">#{r.id}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-navy/60">
                      {p(t.requests.preferred)}: {r.preferredDate} · {r.area}
                    </span>
                  </span>
                  <StatusBadge status={r.status as RequestStatus} />
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-navy transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && detail.data && detail.data.request.id === r.id && (
                  <div className="border-t-2 border-navy/10 p-5 animate-rise-in">
                    {/* timeline */}
                    <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                      {p(t.requests.timeline)}
                    </p>
                    <ol className="mt-3 flex flex-wrap items-center gap-1">
                      {STATUS_ORDER.map((s, i) => {
                        const reached =
                          STATUS_ORDER.indexOf(
                            detail.data!.request.status as RequestStatus,
                          ) >= i &&
                          detail.data!.request.status !== "cancelled";
                        return (
                          <li key={s} className="flex items-center gap-1">
                            <span
                              className={`rounded-full border-2 px-3 py-1 text-[11px] font-bold ${
                                reached
                                  ? "border-navy bg-navy text-paper"
                                  : "border-navy/20 text-navy/40"
                              }`}
                            >
                              {p(t.status[s])}
                            </span>
                            {i < STATUS_ORDER.length - 1 && (
                              <span className="h-0.5 w-3 bg-navy/20" />
                            )}
                          </li>
                        );
                      })}
                    </ol>

                    {/* urgency + quote */}
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border-2 border-navy/15 bg-paper p-4">
                        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                          {p(t.requests.urgency)}
                        </p>
                        <p className="mt-2 font-display text-lg font-extrabold text-navy">
                          {p(
                            URGENCY_META[
                              (detail.data.request.urgencyFinal ??
                                detail.data.request
                                  .urgencySuggested) as UrgencyLevel
                            ].label,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border-2 border-navy/15 bg-paper p-4">
                        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                          {p(t.requests.quote)}
                        </p>
                        {detail.data.request.quoteAmount ? (
                          <>
                            <p className="mt-2 font-display text-lg font-extrabold text-navy">
                              ${detail.data.request.quoteAmount}
                            </p>
                            {detail.data.request.quoteNote && (
                              <p className="mt-1 text-xs text-navy/60">
                                {detail.data.request.quoteNote}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-2 text-sm text-navy/50">—</p>
                        )}
                      </div>
                    </div>

                    {detail.data.request.status === "quote_ready" && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => approve.mutate({ id: r.id })}
                          disabled={approve.isPending}
                          className="btn-pill-primary"
                        >
                          {approve.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {p(t.requests.approveQuote)}
                        </button>
                        <button
                          onClick={() => cancel.mutate({ id: r.id })}
                          disabled={cancel.isPending}
                          className="btn-pill-outline"
                        >
                          {p(t.requests.declineQuote)}
                        </button>
                      </div>
                    )}

                    {/* technician + live location */}
                    {detail.data.technician && (
                      <TechnicianCard
                        name={detail.data.technician.name}
                        location={detail.data.location}
                      />
                    )}

                    {/* answers */}
                    <p className="mt-6 font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                      {p(t.requests.answers)}
                    </p>
                    <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                      {cat?.questions.map((q) => {
                        const answers = JSON.parse(
                          detail.data!.request.answers,
                        ) as Record<string, string>;
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

                    {/* photos */}
                    {detail.data.media.length > 0 && (
                      <>
                        <p className="mt-6 font-display text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                          {p(t.requests.photos)}
                        </p>
                        <div className="mt-3">
                          <MediaGrid items={detail.data.media} />
                        </div>
                      </>
                    )}

                    {["submitted", "in_review"].includes(
                      detail.data.request.status,
                    ) && (
                      <button
                        onClick={() => cancel.mutate({ id: r.id })}
                        disabled={cancel.isPending}
                        className="mt-6 text-sm font-bold text-destructive underline underline-offset-4"
                      >
                        {p(t.requests.cancel)}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
