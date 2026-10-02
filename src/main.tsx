import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { I18nProvider } from "./i18n"
import { Preloader } from "./components/Preloader"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { installErrorReporting, reloadForNewBuild } from "./lib/reportError"
import { startAnalytics } from "./lib/analytics"
import App from './App.tsx'

installErrorReporting()
startAnalytics()
// A tab opened before a deploy asks for page files that are gone: load the new version.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewBuild()) event.preventDefault()
})

/**
 * Invitation and password-reset emails sign the person in via a link whose URL
 * hash carries `type=invite` / `type=recovery`. Wherever that link lands (Supabase
 * falls back to the Site URL if the requested page isn't allowed), send them to
 * the set-password page first — keeping the hash so the sign-in still completes.
 */
function routeAuthEmailLinks() {
  const { hash, pathname } = window.location
  const type = /[#&]type=(invite|recovery)\b/.exec(hash)?.[1]
  if (!type || pathname === "/reset-password") return
  const query = type === "invite" ? `?welcome=1&next=${encodeURIComponent("/tech")}` : ""
  window.history.replaceState(null, "", `/reset-password${query}${hash}`)
  sessionStorage.setItem("br-intro", "1") // no intro animation in front of the form
}
routeAuthEmailLinks()

function Root() {
  // Show the intro once per tab session; skip it on later navigations.
  const [introDone, setIntroDone] = useState(
    () => sessionStorage.getItem("br-intro") === "1",
  )
  return (
    <>
      {!introDone && (
        <Preloader
          onDone={() => {
            sessionStorage.setItem("br-intro", "1")
            setIntroDone(true)
          }}
        />
      )}
      <App />
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <I18nProvider>
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
        </I18nProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
