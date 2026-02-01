import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";

export const uploadRouter = router({
  uploadPhoto: publicProcedure
    .input(
      z.object({
        photo: z.string(), // base64 encoded
        filename: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Extract base64 data
        const matches = input.photo.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error("Invalid base64 string");
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        // Generate unique filename
        const ext = input.filename.split(".").pop() || "jpg";
        const uniqueFilename = `photos/${nanoid()}.${ext}`;

        // Upload to S3
        const { url } = await storagePut(uniqueFilename, buffer, mimeType);

        return { url, filename: input.filename };
      } catch (error) {
        console.error("Photo upload error:", error);
        throw new Error("Failed to upload photo");
      }
    }),
});
