import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { trpc } from "@/providers/trpc";
import { supabase } from "@/lib/supabase";
import {
  DOCUMENT_TYPES,
  isAllowedDocumentType,
  MAX_DOCUMENT_BYTES,
  type ApplicationDocument,
} from "@contracts/applications";

/**
 * One required applicant document (ID, criminal record or photo). Uploads straight
 * to private storage when picked and reports the stored key to the form.
 */
export function DocumentUpload({
  kind,
  label,
  hint,
  onUploaded,
}: {
  kind: ApplicationDocument;
  label: string;
  hint: string;
  onUploaded: (key: string | null) => void;
}) {
  const { t, p } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createUpload = trpc.storage.createDocumentUpload.useMutation();
  const accept = DOCUMENT_TYPES[kind].map((t) => (t.endsWith("/") ? `${t}*` : t)).join(",");

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    const contentType = file.type || "application/octet-stream";
    if (file.size > MAX_DOCUMENT_BYTES || !isAllowedDocumentType(kind, contentType)) {
      setError(p(kind === "photo" ? t.docs.badPhoto : t.docs.badFile));
      return;
    }
    setBusy(true);
    onUploaded(null);
    try {
      const target = await createUpload.mutateAsync({ kind, fileName: file.name, size: file.size, contentType });
      const { error: uploadError } = await supabase.storage
        .from(target.bucket)
        .uploadToSignedUrl(target.key, target.token, file, { contentType });
      if (uploadError) throw uploadError;
      setFileName(file.name);
      onUploaded(target.key);
    } catch {
      setFileName(null);
      setError(p(t.docs.uploadFailed));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border-2 border-navy/20 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold text-navy">
            {label} <span className="text-flame-ink">*</span>
          </p>
          <p className="text-xs text-navy/70">{hint}</p>
        </div>
        <input
          ref={input}
          type="file"
          accept={accept}
          className="hidden"
          aria-label={label}
          onChange={(e) => onPick(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="btn-pill-outline !min-h-10 !px-4 !py-1.5 text-xs"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {fileName ? p(t.docs.replace) : p(t.docs.choose)}
        </button>
      </div>
      {fileName && !busy && (
        <p className="mt-2 flex items-center gap-1.5 truncate text-xs font-semibold text-navy">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" /> {fileName}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
