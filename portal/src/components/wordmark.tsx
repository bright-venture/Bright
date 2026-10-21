import Link from "next/link";

// Bright logo plus "Bright Service" in the portal's display type.

// On the portal and auth pages, pass asLink={false} so the wordmark is plain
// text (no navigation). The public site uses the default linked wordmark.
export function Wordmark({ light = false, asLink = true }: { light?: boolean; asLink?: boolean }) {
  const className = `wordmark ${light ? "wordmark-light" : ""}`;
  const content = <><img src="/bright-logo.webp" alt="" width={37} height={40} />Bright<span>Service</span></>;
  if (!asLink) return <span aria-label="Bright Service" className={className}>{content}</span>;
  return <Link href="/" aria-label="Bright portal home" className={className}>{content}</Link>;
}
