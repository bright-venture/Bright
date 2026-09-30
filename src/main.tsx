import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { I18nProvider } from "./i18n"
import { Preloader } from "./components/Preloader"
import App from './App.tsx'

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
          <Root />
        </I18nProvider>
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
