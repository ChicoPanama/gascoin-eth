import { getSectionBySlug, getAdjacentSections, getAllSections } from '../../../lib/docs-content';
import { DocPageClient } from '../../../components/docs/DocPageClient';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  return getAllSections().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const section = getSectionBySlug(slug);
  if (!section) return {};
  return { title: `${section.title} — GASCOIN Docs`, description: section.description };
}

export default async function DocPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const section = getSectionBySlug(slug);
  if (!section) notFound();
  const { prev, next } = getAdjacentSections(slug);
  return <DocPageClient section={section} prev={prev} next={next} />;
}
