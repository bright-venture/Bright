import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n";

/** Simplified silhouette of Lebanon — coast on the left, Tripoli top, Tyre bottom. */
const LEBANON_PATH =
  "M215,28 L205,58 L216,92 L205,132 L219,178 L209,224 L222,262 L212,304 L223,338 L238,344 L286,296 L300,240 L288,182 L300,124 L285,70 L254,34 Z";

const RUN_MS = 4300; // dash across the screen (halts mid-way to beep)
const END_MS = 5200; // burst + slogan, then reveal
const BEEPS = [1500, 2100]; // "meep meep" at the mid-screen halt

/** Classic road-runner "meep meep" — two quick sine chirps, WebAudio only. */
function playMeep(ctx: AudioContext) {
  [0, 0.22].forEach((off, i) => {
    const t = ctx.currentTime + 0.02 + off;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(i === 0 ? 1180 : 1240, t);
    osc.frequency.linearRampToValueAtTime(i === 0 ? 900 : 960, t + 0.16);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.015);
    gain.gain.setValueAtTime(0.35, t + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

/** Tiny cloud of dust puffs at the road-runner's heels. */
function Dust() {
  return (
    <span className="pointer-events-none absolute -left-2 top-1/2 -translate-y-1/2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute block rounded-full bg-paper/70 blur-[3px]"
          style={{
            width: 18 + i * 10,
            height: 18 + i * 10,
            left: -i * 14,
            top: -6 - i * 6,
            animation: `pl-dust 0.45s ease-out ${i * 0.09}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function Preloader({ onDone }: { onDone: () => void }) {
  const { p, t } = useI18n();
  const [phase, setPhase] = useState<"run" | "end">("run");
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setLeaving(true);
    window.setTimeout(onDone, 520); // wait out the fade
  };

  /* Sound schedule — driven by the animation clock, so audio and visuals never drift. */
  const onRunStart = () => {
    let ctx: AudioContext | null = null;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new AC();
    } catch {
      return; // no audio support — visuals still play
    }
    void ctx.resume().catch(() => undefined);
    BEEPS.forEach((ms) =>
      window.setTimeout(() => {
        if (ctx) void ctx.resume().then(() => playMeep(ctx));
      }, ms),
    );
    window.setTimeout(() => void ctx?.close().catch(() => undefined), END_MS);
  };

  /* Auto-finish even if animation events are swallowed (reduced motion, hidden tab…). */
  useEffect(() => {
    const id = window.setTimeout(finish, END_MS + 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={finish}
      role="button"
      aria-label="Skip intro"
      className={`fixed inset-0 z-[100] cursor-pointer overflow-hidden bg-navy-deep transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Lebanon silhouette */}
      <svg
        viewBox="0 0 420 400"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-y-0 left-1/2 h-[88vh] w-auto -translate-x-1/2 opacity-90"
        style={{ transform: "translateX(-50%) rotate(22deg)" }}
        aria-hidden
      >
        <path
          d={LEBANON_PATH}
          fill="#123C7E"
          stroke="#F4530A"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeDasharray="8 10"
          style={{ animation: "pl-dash 3s linear infinite" }}
        />
      </svg>

      {/* Beirut star */}
      <span
        className="absolute left-1/2 top-[38vh] -translate-x-24 text-2xl text-flame"
        style={{ animation: "pl-blink 1s ease-in-out infinite" }}
        aria-hidden
      >
        ★
      </span>

      {/* The bird — sprinting */}
      {phase === "run" && (
        <div className="absolute inset-x-0 top-[46vh]">
          <div
            className="relative will-change-transform"
            onAnimationStart={(e) => {
              if (e.animationName === "pl-run") onRunStart();
            }}
            onAnimationEnd={(e) => {
              if (e.animationName === "pl-run") setPhase("end");
            }}
            style={{
              animation: `pl-run ${RUN_MS}ms cubic-bezier(0.35, 0, 0.3, 1) forwards`,
            }}
          >
            <div
              className="relative w-fit"
              style={{ animation: "pl-bob 0.3s ease-in-out infinite" }}
            >
              <img
                src="/assets/mascot.png"
                alt=""
                draggable={false}
                className="w-28 select-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] sm:w-36"
              />
              <span className="block w-fit -scale-x-100">
                <Dust />
              </span>
              {/* MEEP! bubble */}
              <span
                className="absolute -top-10 left-1/2 block w-fit -translate-x-1/2 whitespace-nowrap rounded-2xl border-2 border-navy bg-paper px-3 py-1 font-display text-sm font-black text-navy opacity-0"
                style={{ animation: `pl-meep ${RUN_MS}ms linear forwards` }}
              >
                {p(t.preloader.meep)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* End frame — comic burst with the bird back at center */}
      {phase === "end" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 200 200"
            className="absolute w-[36rem] max-w-[90vw]"
            onAnimationEnd={(e) => {
              if (e.animationName === "pl-burst") {
                window.setTimeout(finish, 650); // hold the pose, then reveal
              }
            }}
            style={{ animation: "pl-burst 0.45s cubic-bezier(0.22,1,0.36,1) both" }}
            aria-hidden
          >
            <path
              d="M100,4 L118,58 L168,34 L140,80 L196,84 L148,108 L186,148 L132,132 L138,190 L104,142 L72,192 L74,134 L18,152 L58,110 L6,88 L62,80 L34,36 L84,60 Z"
              fill="#F4530A"
            />
          </svg>
          <img
            src="/assets/mascot.png"
            alt=""
            draggable={false}
            className="relative w-44 select-none sm:w-52"
            style={{ animation: "pl-pop 0.5s 0.05s cubic-bezier(0.34,1.56,0.64,1) both" }}
          />
          <p
            className="relative mt-2 font-display text-3xl font-black tracking-tight text-paper sm:text-4xl"
            style={{ animation: "pl-pop 0.5s 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            {p(t.preloader.slogan)}
          </p>
        </div>
      )}

      <p className="absolute bottom-6 inset-x-0 text-center font-display text-[11px] font-bold uppercase tracking-[0.3em] text-paper/40">
        {p(t.preloader.skip)}
      </p>
    </div>
  );
}
