import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

export const storageRouter = router({
  // Upload file from frontend
  upload: publicProcedure
    .input(
      z.object({
        key: z.string(),
        data: z.string(), // base64 encoded
        contentType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Decode base64 to buffer
      const buffer = Buffer.from(input.data, "base64");

      // Upload to S3
      const result = await storagePut(
        input.key,
        buffer,
        input.contentType
      );

      return result;
    }),
});
