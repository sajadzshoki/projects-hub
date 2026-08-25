import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireApiAuth } from "@/lib/auth";
import { contentTypeForExtension, localUploadDir } from "@/lib/storage";

/**
 * GET /api/uploads/[name] — serves locally-stored cover images (session required).
 * Object-storage uploads never hit this route; they use their public URL directly.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  const { name } = await params;
  // Strict allowlist — prevents any path traversal or arbitrary file access.
  const match = /^([a-zA-Z0-9-]+)\.(jpg|jpeg|png|webp)$/i.exec(name);
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = contentTypeForExtension(match[2]);
  if (!contentType) return new Response("Not found", { status: 404 });

  try {
    const buffer = await readFile(path.join(localUploadDir(), name));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        // Filenames are random UUIDs, so content is immutable.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
