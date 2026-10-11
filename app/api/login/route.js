import { NextResponse } from 'next/server';
import { adminToken, isAdmin } from '@/lib/auth';

export async function GET() { return NextResponse.json({ admin: await isAdmin() }); }

export async function POST(req) {
  const { password } = await req.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  const res = NextResponse.json({ admin: true });
  res.cookies.set('admin', adminToken(), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ admin: false });
  res.cookies.delete('admin');
  return res;
}
