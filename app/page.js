import { cookies } from 'next/headers';
import Library from './library';
import { pageData, readCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const catalog = await readCatalog().then((c) => pageData(c)).catch(() => null);
  const lang = (await cookies()).get('lang')?.value === 'en' ? 'en' : 'gu';
  return <Library catalog={catalog} lang={lang} />;
}
