import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { createRouter, authedQuery, customerQuery } from "./middleware";
import { createSignedUrls, createUploadUrl, MAX_UPLOAD_BYTES } from "./lib/storage";
import { getDb } from "./queries/connection";
import { requestMedia, serviceRequests } from "../db/schema";

export const storageRouter = createRouter({
  // Returns a one-time signed URL token; the browser uploads the file directly to storage.
  createUpload: customerQuery
    .input(
      z.object({
        fileName: z.string().min(1).max(512),
        size: z.number().int().positive(),
        contentType: z.string().max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.size > MAX_UPLOAD_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File too large (max 20 MB)" });
      }
      if (!/^(image|video)\//.test(input.contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only photos and videos are allowed" });
      }
      return createUploadUrl(ctx.user.authId, input.fileName);
    }),

  // Batch signed URLs — only for media on requests the caller owns, is assigned to, or admin.
  urls: authedQuery
    .input(z.object({ keys: z.array(z.string()).max(16) }))
    .query(async ({ ctx, input }) => {
      if (!input.keys.length) return { urls: {} as Record<string, string> };
      const db = getDb();
      const rows = await db
        .select({
          key: requestMedia.key,
          ownerId: serviceRequests.userId,
          technicianId: serviceRequests.technicianId,
        })
        .from(requestMedia)
        .innerJoin(serviceRequests, eq(requestMedia.requestId, serviceRequests.id))
        .where(inArray(requestMedia.key, input.keys));
      const allowed = rows
        .filter(
          (r) =>
            r.ownerId === ctx.user.id ||
            r.technicianId === ctx.user.id ||
            ctx.user.role === "specialist",
        )
        .map((r) => r.key);
      return { urls: await createSignedUrls(allowed) };
    }),
});
