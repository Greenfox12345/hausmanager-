// Frontend wrapper for S3 storage operations
// Calls backend API via tRPC to perform actual uploads

import { trpc } from "./trpc";

export async function storagePut(
  key: string,
  data: Uint8Array | ArrayBuffer,
  contentType?: string
): Promise<{ key: string; url: string }> {
  // Convert data to base64 for transmission
  const buffer = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const base64 = btoa(String.fromCharCode(...Array.from(buffer)));

  // Use tRPC client
  const client = trpc.useUtils().client;
  const result = await client.storage.upload.mutate({
    key,
    data: base64,
    contentType,
  });

  return result;
}
