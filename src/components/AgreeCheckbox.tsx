import { Fragment } from "react";
import { useI18n } from "@/i18n";
import type { LocalText } from "@contracts/services";

/**
 * Required consent checkbox. In `text`, "{terms}" and "{privacy}" become links
 * that open in a new tab so the form being filled in isn't lost.
 */
export function AgreeCheckbox({
  id,
  text,
  checked,
  onChange,
}: {
  id: string;
  text: LocalText;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t, p } = useI18n();
  const links = {
    terms: { to: "/terms", label: p(t.legal.terms) },
    privacy: { to: "/privacy", label: p(t.legal.privacy) },
  };
  const parts = p(text).split(/(\{terms\}|\{privacy\})/);

  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#0C2B5C]"
      />
      <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-navy/80">
        {parts.map((part, i) => {
          const key = part === "{terms}" ? "terms" : part === "{privacy}" ? "privacy" : null;
          if (!key) return <Fragment key={i}>{part}</Fragment>;
          return (
            <a
              key={i}
              href={links[key].to}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-navy underline underline-offset-4"
            >
              {links[key].label}
            </a>
          );
        })}
      </label>
    </div>
  );
}
