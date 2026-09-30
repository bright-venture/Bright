/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_STORAGE_BUCKET?: string;
  readonly VITE_AUTH_GOOGLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
