// Shared types for brands. Kept out of the "use server" actions file so client
// components can import them without pulling in server-only code.
export type Brand = { id: string; slug: string; name: string };
export type BrandResult = { ok: boolean; error?: string };
