import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Cover-image storage.
 *
 *  - If MinIO / S3 env vars are configured → uploads go to object storage and we
 *    return the public URL (credentials stay 100% server-side).
 *  - Otherwise → a simple local-disk fallback (./.data/uploads) served through
 *    the authenticated /api/uploads/[name] route.
 *
 * Either way MongoDB only stores a URL string, so swapping in real object storage
 * later never touches the Project model.
 */

export class UploadError extends Error {}

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB ?? 5);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function minioConfigured(): boolean {
  return Boolean(
    process.env.MINIO_ENDPOINT &&
      process.env.MINIO_ACCESS_KEY &&
      process.env.MINIO_SECRET_KEY &&
      process.env.MINIO_BUCKET &&
      process.env.MINIO_PUBLIC_URL
  );
}

function extensionFor(file: File): string | null {
  const byMime = MIME_EXT[file.type.toLowerCase()];
  if (byMime) return byMime;
  const match = /\.([a-z0-9]+)$/i.exec(file.name);
  if (match) {
    const ext = match[1].toLowerCase();
    if (ext === "jpeg") return "jpg";
    if (ext in EXT_MIME) return ext;
  }
  return null;
}

export function localUploadDir(): string {
  return process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), ".data", "uploads");
}

export function contentTypeForExtension(ext: string): string | null {
  return EXT_MIME[ext.toLowerCase()] ?? null;
}

/** Validates and stores an uploaded image. Returns the URL to store in MongoDB. */
export async function saveUpload(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("The selected file is empty.");
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new UploadError(`Image must be smaller than ${MAX_UPLOAD_MB} MB.`);
  }
  const ext = extensionFor(file);
  if (!ext) throw new UploadError("Unsupported format. Use JPG, PNG or WebP.");

  const name = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (minioConfigured()) return saveToMinio(name, buffer, ext);
  return saveLocally(name, buffer);
}

async function saveLocally(name: string, buffer: Buffer): Promise<string> {
  const dir = localUploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return `/api/uploads/${name}`;
}

async function saveToMinio(name: string, buffer: Buffer, ext: string): Promise<string> {
  const endpoint = new URL(process.env.MINIO_ENDPOINT!);
  const { default: Minio } = await import("minio");

  const client = new Minio.Client({
    endPoint: endpoint.hostname,
    port: Number(endpoint.port) || (endpoint.protocol === "https:" ? 443 : 80),
    useSSL: endpoint.protocol === "https:",
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });

  const objectName = `covers/${name}`;
  await client.putObject(
    process.env.MINIO_BUCKET!,
    objectName,
    buffer,
    buffer.length,
    { "Content-Type": contentTypeForExtension(ext) ?? "application/octet-stream" }
  );

  const base = process.env.MINIO_PUBLIC_URL!.replace(/\/+$/, "");
  return `${base}/${objectName}`;
}
