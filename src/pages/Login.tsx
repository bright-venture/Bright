import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AuthPanel, type AuthMode } from "@/components/AuthPanel";
import { useI18n } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { safeNext } from "@/lib/navigation";

/** Sign in (/login) and create account (/signup). */
export default function Login({ mode = "signin" }: { mode?: AuthMode }) {
  const { t, p } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get("next"));
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(next, { replace: true });
  }, [isAuthenticated, isLoading, navigate, next]);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-24">
        <div className="card-br w-full max-w-md p-6 sm:p-8">
          <img
            src="/assets/mascot-320.webp"
            width={320}
            height={408}
            alt=""
            className="mx-auto mb-5 h-auto w-20"
          />
          <AuthPanel key={mode} next={next} initialMode={mode} headingLevel="h1" />
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
