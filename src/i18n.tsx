import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "@contracts/services";
import { t, type Dict } from "@contracts/i18n";

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  /** pick a localized string */
  p: (text: { en: string; ar: string }) => string;
  dir: "ltr" | "rtl";
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("br-lang");
    return saved === "ar" ? "ar" : "en";
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("br-lang", lang);
  }, [lang]);

  const value: I18nCtx = {
    lang,
    setLang: setLangState,
    t,
    dir: lang === "ar" ? "rtl" : "ltr",
    p: (text) => (lang === "ar" ? text.ar : text.en),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
