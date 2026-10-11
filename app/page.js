import { cookies } from 'next/headers';
import Library from './library';
import { readCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const catalog = await readCatalog().catch(() => null);
  const lang = (await cookies()).get('lang')?.value === 'en' ? 'en' : 'gu';
  return <Library catalog={catalog} lang={lang} />;
}
