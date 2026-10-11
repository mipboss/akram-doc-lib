import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { isAdmin } from '@/lib/auth';
import { MAX_UPLOAD, UPLOAD_TYPES } from '@/lib/shared';

const { S3_BUCKET: bucket, S3_REGION: region = 'us-east-1', S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
const enabled = !!(bucket && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
const denied = () => NextResponse.json({ error: 'Administrators only' }, { status: 401 });

// Tells the admin page whether S3 is set up, so it only offers S3 when uploads can work.
export async function GET() {
  if (!(await isAdmin())) return denied();
  return NextResponse.json({ enabled, bucket: enabled ? bucket : null });
}

// Issues a signed upload form, valid for 10 minutes, so the browser sends the file straight to S3.
export async function POST(req) {
  if (!(await isAdmin())) return denied();
  if (!enabled) return NextResponse.json({ error: 'AWS S3 is not set up. Add the S3 settings in Vercel.' }, { status: 400 });
  const { folder, name, type } = await req.json();
  if (!UPLOAD_TYPES.includes(type)) return NextResponse.json({ error: 'Only PDF and audio files can be uploaded.' }, { status: 400 });

  const safe = (s) => String(s || '').replace(/\s+/g, '-').replace(/[^\w.()-]+/g, '_');
  // The time prefix keeps a new upload from replacing an existing file with the same name.
  const key = `${String(folder || 'uploads').split('/').map(safe).join('/')}/${Date.now().toString(36)}-${safe(name) || 'file'}`;
  const client = new S3Client({ region, credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY } });
  try {
    const { url, fields } = await createPresignedPost(client, {
      Bucket: bucket, Key: key, Expires: 600,
      Fields: { 'Content-Type': type },
      Conditions: [['content-length-range', 1, MAX_UPLOAD], ['eq', '$Content-Type', type]],
    });
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`;
    return NextResponse.json({ url, fields, fileUrl });
  } catch (e) {
    return NextResponse.json({ error: 'Could not prepare the S3 upload: ' + e.message }, { status: 500 });
  }
}
