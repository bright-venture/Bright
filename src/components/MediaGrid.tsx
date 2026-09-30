import { trpc } from "@/providers/trpc";

type MediaItem = { key: string; contentType: string | null };

/** Photos/videos attached to a request, loaded through short-lived signed URLs. */
export function MediaGrid({
  items,
  className = "grid grid-cols-3 gap-2 sm:grid-cols-4",
}: {
  items: MediaItem[];
  className?: string;
}) {
  const keys = items.map((m) => m.key);
  const { data } = trpc.storage.urls.useQuery({ keys }, { enabled: keys.length > 0 });
  if (!items.length) return null;
  const tile = "aspect-square w-full rounded-2xl border-2 border-navy object-cover";
  return (
    <div className={className}>
      {items.map((m) => {
        const url = data?.urls?.[m.key];
        if (!url) {
          return (
            <div
              key={m.key}
              className="aspect-square w-full animate-pulse rounded-2xl border-2 border-navy/20 bg-navy/5"
            />
          );
        }
        return m.contentType?.startsWith("video/") ? (
          <video key={m.key} src={url} controls playsInline preload="metadata" className={tile} />
        ) : (
          <a key={m.key} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="" className={tile} />
          </a>
        );
      })}
    </div>
  );
}
