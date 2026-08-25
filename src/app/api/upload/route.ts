import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import { UploadError, saveUpload } from "@/lib/storage";

/**
 * POST /api/upload — direct cover-image upload (multipart form, field "file").
 * Goes to MinIO/S3 when configured, otherwise to local storage.
 * Credentials never leave the server.
 */
export async function POST(request: Request) {
  const unauthorized = await requireApiAuth();
  if (unauthorized) return unauthorized;

  let file: File;
  try {
    const formData = await request.formData();
    const value = formData.get("file");
    if (!(value instanceof File)) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }
    file = value;
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  try {
    const url = await saveUpload(file);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/upload failed", error);
    return NextResponse.json({ error: "Could not save the image. Please try again." }, { status: 500 });
  }
}
