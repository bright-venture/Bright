import { ShieldCheck } from "lucide-react";
import { Wordmark } from "./wordmark";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="auth-page">
    <header className="auth-header"><Wordmark asLink={false} /></header>
    <div className="auth-card"><span className="auth-symbol"><ShieldCheck size={28} strokeWidth={1.5} /></span>{children}</div>
    <p className="auth-footer">BRIGHT SERVICE COMPANY SARL · Employee access only</p>
  </main>;
}
