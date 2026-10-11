import { cookies } from 'next/headers';
import crypto from 'crypto';

export const adminToken = () =>
  crypto.createHash('sha256').update('pdf-library:' + (process.env.ADMIN_PASSWORD || '')).digest('hex');

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = await cookies();
  return c.get('admin')?.value === adminToken();
}
