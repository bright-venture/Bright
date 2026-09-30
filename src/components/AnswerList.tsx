import { useMemo } from "react";
import { useI18n } from "@/i18n";
import { CATEGORY_MAP } from "@contracts/services";

/** The customer's guided answers for a request, labelled in the current language. */
export function AnswerList({
  category,
  answersJson,
  className = "flex flex-col gap-1.5 text-sm",
}: {
  category: string;
  /** Answers as stored on the request (JSON object of questionId → value). */
  answersJson: string;
  className?: string;
}) {
  const { p } = useI18n();
  const answers = useMemo(() => {
    try {
      return JSON.parse(answersJson) as Record<string, string>;
    } catch {
      return {};
    }
  }, [answersJson]);

  return (
    <dl className={className}>
      {CATEGORY_MAP[category]?.questions.map((q) => {
        const val = answers[q.id];
        if (!val) return null;
        const opt = q.options?.find((o) => o.value === val);
        return (
          <div key={q.id} className="flex justify-between gap-4">
            <dt className="text-navy/70">{p(q.label)}</dt>
            <dd className="text-end font-semibold text-navy">{opt ? p(opt.label) : val}</dd>
          </div>
        );
      })}
    </dl>
  );
}
