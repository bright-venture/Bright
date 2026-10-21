"use client";

import { useState } from "react";

// A date field that shows a readable placeholder when empty. iOS Safari renders
// an empty <input type="date"> as a blank box, and native placeholders are not
// supported, so an overlay label stands in until a date is chosen. Clicking or
// tapping anywhere opens the calendar picker directly.
export function DateInput({ value, onChange, placeholder = "Choose a date", id, disabled, required, ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
}) {
  // Keyboard users typing a date should see what they type.
  const [typing, setTyping] = useState(false);
  const showPlaceholder = !value && !typing;

  function openPicker(event: React.MouseEvent<HTMLInputElement>) {
    try { event.currentTarget.showPicker?.(); } catch { /* already open or unsupported: native behaviour applies */ }
  }

  return <span className="date-wrap" dir="ltr">
    <input id={id} type="date" value={value} disabled={disabled} required={required} aria-label={ariaLabel}
      className={showPlaceholder ? "is-empty" : undefined}
      onChange={e => onChange(e.target.value)}
      onClick={openPicker}
      onKeyDown={e => { if (/^[0-9]$/.test(e.key) || e.key.startsWith("Arrow")) setTyping(true); }}
      onBlur={() => setTyping(false)} />
    {showPlaceholder && <span className="date-ph" aria-hidden="true">{placeholder}</span>}
  </span>;
}
