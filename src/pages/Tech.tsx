import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { CATEGORY_MAP, type RequestStatus } from "@contracts/services";

/** Watches GPS and reports position for the given active job. */
function useLocationSharing() {
  const watchRef = useRef<number | null>(null);
  const lastSent = useRef(0);
  const [sharingFor, setSharingFor] = useState<number | null>(null);
  const [geoError, setGeoError] = useState(false);
  const report = trpc.tech.reportLocation.useMutation();

  function stop() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSharingFor(null);
  }

  function start(requestId: number) {
    setGeoError(false);
    if (!("geolocation" in navigator)) {
      setGeoError(true);
      return;
    }
    stop();
    setSharingFor(requestId);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSent.current < 15000) return; // throttle 15s
        lastSent.current = now;
        report.mutate({
          requestId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        setGeoError(true);
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000 },
    );
  }

  useEffect(() => stop, []);
  return { sharingFor, geoError, start, stop };
}

export default function Tech() {
  const { t, p } = useI18n();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const utils = trpc.useUtils();
  const isTech = user?.role === "technician" || user?.role === "admin";

  const jobs = trpc.tech.myJobs.useQuery(undefined, { enabled: !!isTech });
  const fieldEvent = trpc.tech.fieldEvent.useMutation({
    onSuccess: () => utils.tech.myJobs.invalidate(),
  });
  const { sharingFor, geoError, start, stop } = useLocationSharing();
  const [notes, setNotes] = useState<Record<number, string>>({});

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  if (isAuthenticated && !isTech) {
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 pt-16">
          <div className="card-br max-w-md p-8 text-center">
            <img src="/assets/mascot.png" alt="" className="mx-auto w-28" />
            <p className="mt-4 text-sm leading-relaxed text-navy/70">
              {p(t.tech.notTech)}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const rows = jobs.data ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-24 sm:px-6">
        <h1 className="font-display text-3xl font-black text-navy sm:text-4xl">
          {p(t.tech.title)}
        </h1>

        {rows.length === 0 && !jobs.isLoading && (
          <div className="card-br mt-10 p-10 text-center font-semibold text-navy/60">
            {p(t.tech.empty)}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4">
          {rows.map((r) => {
            const active = ["scheduled", "in_progress"].includes(r.status);
            const sharing = sharingFor === r.id;
            return (
              <div key={r.id} className="card-br p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-navy/15 bg-paper text-bird">
                      <ServiceIcon id={r.category} className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="font-display text-base font-extrabold text-navy">
                        #{r.id} ·{" "}
                        {CATEGORY_MAP[r.category]
                          ? p(CATEGORY_MAP[r.category].name)
                          : r.category}
                      </p>
                      <p className="text-xs text-navy/60">
                        {p(t.tech.appointment)}: {r.preferredDate} · {r.timeSlot}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border-2 border-navy/25 px-3 py-1 text-xs font-bold text-navy">
                    {p(t.status[r.status as RequestStatus])}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border-2 border-navy/15 bg-paper p-4 text-sm text-navy/80">
                  <p className="font-bold text-navy">{r.area}</p>
                  <p>{r.address}</p>
                  <p dir="ltr" className="mt-1 text-start">{r.phone}</p>
                  {r.notes && <p className="mt-1 italic">{r.notes}</p>}
                </div>

                {active && (
                  <div className="mt-4 flex flex-col gap-3">
                    {/* live location */}
                    <div className="rounded-2xl border-2 border-dashed border-bird/50 bg-bird/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-navy">
                        <Navigation className="h-4 w-4 text-bird" />
                        {p(t.tracking.liveLocation)}
                      </div>
                      <p className="mt-1 text-xs text-navy/60">
                        {p(t.tech.shareHint)}
                      </p>
                      {geoError && (
                        <p className="mt-2 text-xs font-semibold text-destructive">
                          {p(t.tech.geoError)}
                        </p>
                      )}
                      <button
                        onClick={() => (sharing ? stop() : start(r.id))}
                        className={`btn-pill mt-3 w-full sm:w-auto ${
                          sharing
                            ? "border-flame bg-flame text-white"
                            : "border-bird bg-bird text-white"
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        {sharing ? p(t.tech.shareStop) : p(t.tech.shareStart)}
                      </button>
                      {sharing && (
                        <span className="ms-3 inline-flex items-center gap-1.5 text-xs font-bold text-bird">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bird opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-bird" />
                          </span>
                          {p(t.tech.sharing)}
                        </span>
                      )}
                    </div>

                    {/* field actions */}
                    <input
                      value={notes[r.id] ?? ""}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                      }
                      placeholder={p(t.tech.notePh)}
                      className="min-h-12 rounded-2xl border-2 border-navy/30 bg-white px-4 text-sm font-semibold text-navy focus:border-flame focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      {r.status === "scheduled" && (
                        <>
                          <button
                            onClick={() =>
                              fieldEvent.mutate({
                                requestId: r.id,
                                action: "arrived",
                                note: notes[r.id] || undefined,
                              })
                            }
                            disabled={fieldEvent.isPending}
                            className="btn-pill-outline"
                          >
                            {p(t.tech.arrived)}
                          </button>
                          <button
                            onClick={() =>
                              fieldEvent.mutate({
                                requestId: r.id,
                                action: "start",
                                note: notes[r.id] || undefined,
                              })
                            }
                            disabled={fieldEvent.isPending}
                            className="btn-pill-primary"
                          >
                            {fieldEvent.isPending && (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )}
                            {p(t.tech.startWork)}
                          </button>
                        </>
                      )}
                      {r.status === "in_progress" && (
                        <button
                          onClick={() => {
                            fieldEvent.mutate({
                              requestId: r.id,
                              action: "complete",
                              note: notes[r.id] || undefined,
                            });
                            if (sharing) stop();
                          }}
                          disabled={fieldEvent.isPending}
                          className="btn-pill-primary"
                        >
                          {fieldEvent.isPending && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                          {p(t.tech.complete)}
                        </button>
                      )}
                    </div>
                    {fieldEvent.isError && (
                      <p className="text-sm font-semibold text-destructive">
                        {p(t.misc.error)}
                      </p>
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
