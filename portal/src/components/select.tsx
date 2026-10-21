"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

// A custom dropdown that replaces the native <select> so the open list matches the
// site theme (green highlight) instead of the browser's blue. The menu renders in a
// portal with fixed positioning so it is never clipped by a panel's overflow.
export function Select({ value, onChange, options, id, disabled = false, ariaLabel, className = "", placeholder = "Select…" }: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  id?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, options.findIndex(o => o.value === value)));
    const place = () => {
      const el = triggerRef.current;
      if (el) { const r = el.getBoundingClientRect(); setRect({ top: r.bottom + 4, left: r.left, width: r.width }); }
    };
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open, options, value]);

  function pick(v: string) { onChange(v); setOpen(false); }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === "Escape" || e.key === "Tab") { setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const o = options[active]; if (o) pick(o.value); }
  }

  return <div className={`ui-select ${className}`}>
    <button ref={triggerRef} type="button" id={id} className="ui-select-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel} onClick={() => setOpen(o => !o)} onKeyDown={onKeyDown}>
      <span className={current ? "" : "ui-select-ph"}>{current?.label ?? placeholder}</span>
      <ChevronDown size={16} />
    </button>
    {open && rect && createPortal(
      <ul ref={menuRef} className="ui-select-menu" role="listbox" style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}>
        {options.map((o, i) => <li key={o.value} role="option" aria-selected={o.value === value}
          className={`${o.value === value ? "sel" : ""}${i === active ? " active" : ""}`}
          onMouseEnter={() => setActive(i)} onMouseDown={e => e.preventDefault()} onClick={() => pick(o.value)}>
          <span>{o.label}</span>{o.value === value && <Check size={15} />}
        </li>)}
      </ul>,
      document.body,
    )}
  </div>;
}
