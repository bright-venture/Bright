// Shared types/constants for portal folders. Kept out of the "use server"
// actions file, which may only export async functions.
export const FOLDER_MODULES = ["inventory", "documents", "reports"] as const;
export type FolderModule = (typeof FOLDER_MODULES)[number];
export type Folder = { id: string; module: FolderModule; parent_id: string | null; name: string; brand_id: string | null };
export type FolderResult = { ok: boolean; error?: string };
