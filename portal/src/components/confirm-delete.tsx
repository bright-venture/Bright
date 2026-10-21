"use client";

import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";

// A shared "type-to-confirm" dialog for destructive deletes. The Delete button
// stays disabled until the typed text matches `confirmWord` (case-insensitive),
// so a permanent deletion can never be a single stray click.
export function ConfirmDelete({ open, title, description, confirmWord, confirmLabel = "Delete", pending = false, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  description?: string;
  confirmWord: string;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue("");
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;
  const matched = value.trim().toLowerCase() === confirmWord.trim().toLowerCase();

  return <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => { if (e.target === e.currentTarget && !pending) onCancel(); }}>
    <form className="confirm-dialog" onSubmit={e => { e.preventDefault(); if (matched && !pending) onConfirm(); }} onKeyDown={e => { if (e.key === "Escape" && !pending) onCancel(); }}>
      <span className="confirm-icon"><TriangleAlert size={22} /></span>
      <h3>{title}</h3>
      {description && <p className="confirm-desc">{description}</p>}
      <label className="confirm-field">Type <strong>{confirmWord}</strong> to confirm
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} disabled={pending} autoComplete="off" spellCheck={false} aria-label={`Type ${confirmWord} to confirm`} />
      </label>
      <div className="confirm-actions">
        <button type="button" className="confirm-cancel" onClick={onCancel} disabled={pending}>Cancel</button>
        <button type="submit" className="confirm-delete" disabled={pending || !matched}>{confirmLabel}</button>
      </div>
    </form>
  </div>;
}
