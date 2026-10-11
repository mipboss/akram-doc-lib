import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Library from '../library';
import { pageData, readCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function CollectionPage({ params }) {
  const { collection } = await params;
  const catalog = await readCatalog().catch(() => null);
  if (catalog && !catalog.collections.some((c) => c.path === collection)) notFound();
  const lang = (await cookies()).get('lang')?.value === 'en' ? 'en' : 'gu';
  return <Library catalog={catalog && pageData(catalog, collection)} path={collection} lang={lang} />;
}
