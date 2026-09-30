import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EmailSignIn } from "@/components/EmailSignIn";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";

/** Only allow same-site relative redirects. */
function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Login() {
  const { t, p } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"));
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(next, { replace: true });
  }, [isAuthenticated, isLoading, navigate, next]);

  const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="card-br w-full max-w-md p-8">
          <div className="text-center">
            <img src="/assets/mascot-320.webp" width={320} height={408} alt="" className="mx-auto h-auto w-28" />
            <h1 className="mt-4 font-display text-3xl font-black text-navy">
              {p(t.login.title)}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-navy/70">{p(t.login.sub)}</p>
          </div>

          <div className="mt-6">
            <EmailSignIn redirectTo={redirectTo} />
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm font-bold text-navy/70 underline underline-offset-4 hover:text-navy"
            >
              {p(t.join.backHome)}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
