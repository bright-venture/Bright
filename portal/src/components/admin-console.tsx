"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { inviteEmployee, removeEmployee, setEmployeeActive, setEmployeeRole } from "@/lib/portal/admin";
import type { AdminResult, Employee, PortalRole } from "@/lib/portal/admin-types";
import { ConfirmDelete } from "./confirm-delete";
import { Select } from "./select";

export function AdminConsole({ employees, currentUserId }: { employees: Employee[]; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<PortalRole>("staff");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<Employee | null>(null);

  const activeAdmins = employees.filter(person => person.role === "admin" && person.active).length;

  function run(action: () => Promise<AdminResult>, onDone?: () => void) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await action();
      if (!result.ok) { setError(result.error ?? "Something went wrong. Please try again."); return; }
      onDone?.();
      router.refresh();
    });
  }

  function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !name.trim()) return;
    run(() => inviteEmployee({ email, displayName: name, role }), () => {
      setEmail(""); setName(""); setRole("staff");
      setNotice("Invitation sent. The employee will receive an email to set their password.");
    });
  }

  return <div className="admin-console">
    <section className="portal-panel admin-invite">
      <div className="panel-heading"><div><h2>Invite an employee</h2><p>They receive an email to set a password, then enroll an authenticator on first sign-in.</p></div></div>
      <form className="admin-invite-form" onSubmit={submitInvite}>
        <div className="admin-field"><label htmlFor="invite-name">Full name</label><input id="invite-name" value={name} onChange={event => setName(event.target.value)} maxLength={120} placeholder="Jane Doe" disabled={pending} required /></div>
        <div className="admin-field"><label htmlFor="invite-email">Work email</label><input id="invite-email" type="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} placeholder="jane@brightlb.com" disabled={pending} required /></div>
        <div className="admin-field"><label htmlFor="invite-role">Role</label><Select id="invite-role" ariaLabel="Role" value={role} onChange={v => setRole(v as PortalRole)} disabled={pending} options={[{ value: "staff", label: "Staff" }, { value: "admin", label: "Admin" }]} /></div>
        <button className="folder-add admin-invite-btn" disabled={pending || !email.trim() || !name.trim()}><UserPlus size={16} /> Send invite</button>
      </form>
      {error && <p className="folder-error" role="alert">{error}</p>}
      {notice && <p className="admin-notice" role="status"><Mail size={15} /> {notice}</p>}
    </section>

    <section className="portal-panel">
      <div className="panel-heading"><div><h2>Employees</h2><p>{employees.length} {employees.length === 1 ? "person" : "people"} · {activeAdmins} active admin{activeAdmins === 1 ? "" : "s"}</p></div></div>
      <ul className="employee-list">
        {employees.length === 0 && <li className="employee-empty">No employees loaded. If this is unexpected, confirm the service-role key is configured on the server.</li>}
        {employees.map(person => {
          const isSelf = person.userId === currentUserId;
          const lastAdmin = person.role === "admin" && person.active && activeAdmins <= 1;
          return <li key={person.userId} className={`employee-row${person.active ? "" : " inactive"}`}>
            <span className={`employee-avatar ${person.role === "admin" ? "admin" : "staff"}`}>{person.role === "admin" ? <ShieldCheck size={18} /> : person.displayName.charAt(0).toUpperCase()}</span>
            <div className="employee-identity">
              <strong>{person.displayName}{isSelf && <span className="employee-you">You</span>}</strong>
              <span>{person.email || "-"}</span>
            </div>
            <div className="employee-meta">
              <span className="employee-signin">{person.lastSignInAt ? `Last in ${person.lastSignInAt.slice(0, 10)}` : "Never signed in"}</span>
            </div>
            <div className="employee-controls">
              <Select value={person.role} disabled={pending || isSelf || lastAdmin} ariaLabel={`Role for ${person.displayName}`} className="ui-role"
                onChange={v => run(() => setEmployeeRole({ userId: person.userId, role: v }))}
                options={[{ value: "staff", label: "Staff" }, { value: "admin", label: "Admin" }]} />
              <button type="button" className={`employee-status ${person.active ? "on" : "off"}`} disabled={pending || (isSelf && person.active) || (person.active && lastAdmin)}
                onClick={() => run(() => setEmployeeActive({ userId: person.userId, active: !person.active }))}
                aria-label={`${person.active ? "Deactivate" : "Activate"} ${person.displayName}`}>
                {person.active ? <><Check size={14} /> Active</> : "Inactive"}
              </button>
              <button type="button" className="icon-btn danger" disabled={pending || isSelf || lastAdmin}
                onClick={() => { setError(""); setRemoving(person); }}
                aria-label={`Remove ${person.displayName}`}><Trash2 size={15} /></button>
            </div>
          </li>;
        })}
      </ul>
    </section>

    <ConfirmDelete
      open={!!removing}
      title="Remove this account?"
      description={removing ? `${removing.displayName}'s account and sign-in will be permanently deleted. This cannot be undone.` : ""}
      confirmWord={removing?.displayName ?? ""}
      confirmLabel="Remove account"
      pending={pending}
      onCancel={() => setRemoving(null)}
      onConfirm={() => { if (removing) run(() => removeEmployee({ userId: removing.userId }), () => setRemoving(null)); }}
    />
  </div>;
}
