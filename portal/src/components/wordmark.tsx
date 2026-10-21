// Bright logo with "Bright Service / Company SARL", as in the brightlb.com header.
// Plain text, never a link: the portal has no public home page to go back to.
export function Wordmark() {
  return <span className="wordmark" aria-label="Bright Service Company SARL">
    <img src="/bright-logo.webp" alt="" width={37} height={40} />
    <span className="wordmark-name">Bright Service<span>Company SARL</span></span>
  </span>;
}
