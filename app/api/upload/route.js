import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { MAX_UPLOAD, UPLOAD_TYPES } from '@/lib/shared';

// Issues a one-time upload token so the browser sends the PDF or audio file straight to Blob storage (no 4.5 MB limit).
export async function POST(req) {
  const body = await req.json();
  try {
    const json = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async () => {
        if (!(await isAdmin())) throw new Error('Administrators only');
        return { allowedContentTypes: UPLOAD_TYPES, maximumSizeInBytes: MAX_UPLOAD, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
