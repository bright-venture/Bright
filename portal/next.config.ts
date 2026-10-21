import type { NextConfig } from "next";

// Local development only: `npm run dev` in the Bright folder sets SITE_DEV_ORIGIN to the static
// website's local server, so one address shows both, like the TomatoSky app did:
// http://127.0.0.1:3000/ is brightlb.com, /login and /portal are the portal.
// In production it is unset: brightlb.com and portal.brightlb.com are separate Netlify sites.
const siteOrigin = process.env.SITE_DEV_ORIGIN;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The Bright folder has its own package-lock.json (the website); this app's root is this folder.
  turbopack: { root: __dirname },
  // The website's pages are folders (/ar/, /contact/); keep their trailing slash when proxying.
  skipTrailingSlashRedirect: Boolean(siteOrigin),
  async rewrites() {
    if (!siteOrigin) return [];
    return {
      beforeFiles: [{ source: "/", destination: `${siteOrigin}/` }],
      afterFiles: [],
      // Anything the portal does not serve itself goes to the website.
      fallback: [
        { source: "/:path+/", destination: `${siteOrigin}/:path+/` },
        { source: "/:path*", destination: `${siteOrigin}/:path*` },
      ],
    };
  },
};

export default nextConfig;
